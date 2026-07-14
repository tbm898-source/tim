#!/usr/bin/env bash
# Interactive wizard: install Classroom bridge as a macOS LaunchAgent (auto-start at login).
set -euo pipefail

LABEL="com.tim.classroom-bridge"
PLIST_NAME="${LABEL}.plist"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
INSTALLED_PLIST="$LAUNCH_AGENTS/$PLIST_NAME"
CONFIG_DIR="$HOME/.config/tim-classroom-bridge"
CONFIG_FILE="$CONFIG_DIR/agent.env"
LOG_DIR="$HOME/Library/Logs/TIM"

TIM_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRIDGE_ROOT="$(cd "$TIM_ROOT/../classroom-chatgpt-bridge" && pwd)"
RUN_SCRIPT="$TIM_ROOT/scripts/macos/run-classroom-bridge.sh"
TEMPLATE="$TIM_ROOT/scripts/macos/com.tim.classroom-bridge.plist.example"
GENERATED_PLIST="$CONFIG_DIR/$PLIST_NAME"

print_step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
print_ok()   { printf '\033[0;32m    ok: %s\033[0m\n' "$1"; }
print_warn() { printf '\033[0;33m    note: %s\033[0m\n' "$1"; }
print_err()  { printf '\033[0;31m    error: %s\033[0m\n' "$1" >&2; }

usage() {
  cat <<EOF
Classroom bridge LaunchAgent wizard

  npm run teach:wizard              Interactive install (default)
  npm run teach:wizard -- status    Show agent + bridge health
  npm run teach:wizard -- uninstall Remove LaunchAgent
  npm run teach:wizard -- restart   Reload LaunchAgent

Auto-starts the local bridge at login so TIM can one-click post to Google Classroom.
OAuth tokens stay on this Mac — never in TIM cloud.
EOF
}

agent_loaded() {
  launchctl list 2>/dev/null | grep -q "$LABEL"
}

bridge_healthy() {
  curl -sf "http://127.0.0.1:53683/health" >/dev/null 2>&1
}

cmd_status() {
  print_step "LaunchAgent"
  if [[ -f "$INSTALLED_PLIST" ]]; then
    print_ok "Plist installed: $INSTALLED_PLIST"
  else
    print_warn "Plist not installed — run: npm run teach:wizard"
  fi
  if agent_loaded; then
    print_ok "Agent loaded ($LABEL)"
  else
    print_warn "Agent not loaded"
  fi

  print_step "Bridge"
  if bridge_healthy; then
    local has_token
    has_token="$(curl -sf "http://127.0.0.1:53683/health" | grep -o '"hasToken":[^,}]*' || true)"
    print_ok "Bridge responding on :53683 $has_token"
  else
    print_warn "Bridge not responding — check logs: $LOG_DIR/classroom-bridge-error.log"
  fi

  if [[ -f "$CONFIG_FILE" ]]; then
    print_ok "Config: $CONFIG_FILE"
  fi
}

cmd_uninstall() {
  print_step "Uninstall LaunchAgent"
  if agent_loaded; then
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload "$INSTALLED_PLIST" 2>/dev/null || true
    print_ok "Agent stopped"
  fi
  if [[ -f "$INSTALLED_PLIST" ]]; then
    rm -f "$INSTALLED_PLIST"
    print_ok "Removed $INSTALLED_PLIST"
  else
    print_warn "Nothing to remove"
  fi
  print_ok "Done. Manual start still works: npm run teach:start"
}

cmd_restart() {
  cmd_uninstall
  sleep 1
  if [[ -f "$GENERATED_PLIST" ]]; then
    cp "$GENERATED_PLIST" "$INSTALLED_PLIST"
    launchctl bootstrap "gui/$(id -u)" "$INSTALLED_PLIST" 2>/dev/null || launchctl load "$INSTALLED_PLIST"
    print_ok "Agent restarted"
  else
    print_err "No generated plist — run install first: npm run teach:wizard"
    exit 1
  fi
}

cmd_install() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    print_err "LaunchAgent wizard is macOS only."
    exit 1
  fi

  print_step "Classroom bridge LaunchAgent wizard"
  echo "    This installs a background service that starts the bridge at login."
  echo "    TIM can then post to Google Classroom with one click (after AYA check)."

  if [[ ! -d "$BRIDGE_ROOT" ]]; then
    print_err "Bridge repo not found at $BRIDGE_ROOT"
    echo "    Run: npm run teach:setup"
    exit 1
  fi

  print_step "Bridge dependencies"
  if [[ ! -d "$BRIDGE_ROOT/node_modules" ]]; then
    print_warn "Running npm install in bridge…"
    (cd "$BRIDGE_ROOT" && npm install)
  fi
  print_ok "Bridge repo ready"

  print_step "Google OAuth"
  if [[ ! -f "$BRIDGE_ROOT/token.json" ]]; then
    print_warn "token.json not found — Google login required."
    printf '    Run Google auth now? [Y/n]: '
    read -r DO_AUTH
    DO_AUTH="${DO_AUTH:-Y}"
    if [[ "$DO_AUTH" =~ ^[Yy]$ ]]; then
      (cd "$TIM_ROOT" && npm run teach:auth-google)
    else
      print_err "OAuth required before auto-post works. Run: npm run teach:auth-google"
      exit 1
    fi
  fi
  if [[ ! -f "$BRIDGE_ROOT/token.json" ]]; then
    print_err "Still no token.json — auth may have failed."
    exit 1
  fi
  print_ok "Google OAuth token present"

  print_step "Paths"
  print_ok "TIM repo: $TIM_ROOT"
  print_ok "Bridge:   $BRIDGE_ROOT"

  mkdir -p "$CONFIG_DIR" "$LOG_DIR"
  chmod 700 "$CONFIG_DIR"
  cat > "$CONFIG_FILE" <<EOF
TIM_ROOT='$TIM_ROOT'
BRIDGE_ROOT='$BRIDGE_ROOT'
EOF
  chmod 600 "$CONFIG_FILE"
  print_ok "Wrote $CONFIG_FILE"

  chmod +x "$RUN_SCRIPT"

  if [[ ! -f "$TEMPLATE" ]]; then
    print_err "Missing template: $TEMPLATE"
    exit 1
  fi

  sed \
    -e "s|PLACEHOLDER_RUN_SCRIPT|$RUN_SCRIPT|g" \
    -e "s|PLACEHOLDER_TIM_ROOT|$TIM_ROOT|g" \
    -e "s|PLACEHOLDER_LOG_DIR|$LOG_DIR|g" \
    "$TEMPLATE" > "$GENERATED_PLIST"
  print_ok "Generated plist: $GENERATED_PLIST"

  print_step "Install LaunchAgent"
  mkdir -p "$LAUNCH_AGENTS"
  cp "$GENERATED_PLIST" "$INSTALLED_PLIST"
  print_ok "Installed $INSTALLED_PLIST"

  if agent_loaded; then
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload "$INSTALLED_PLIST" 2>/dev/null || true
  fi
  launchctl bootstrap "gui/$(id -u)" "$INSTALLED_PLIST" 2>/dev/null || launchctl load "$INSTALLED_PLIST"
  print_ok "Agent loaded"

  print_step "Verify bridge"
  sleep 2
  if bridge_healthy; then
    print_ok "Bridge is up — TIM one-click post ready"
  else
    print_warn "Bridge not responding yet — may take a few seconds after login"
    print_warn "Logs: $LOG_DIR/classroom-bridge-error.log"
  fi

  echo ""
  echo "Done. The bridge will start automatically when you log in."
  echo "  Status:    npm run teach:wizard -- status"
  echo "  Uninstall: npm run teach:wizard -- uninstall"
  echo "  Manual:    npm run teach:start"
}

SUB="${1:-install}"
case "$SUB" in
  -h|--help|help) usage ;;
  status) cmd_status ;;
  uninstall|remove) cmd_uninstall ;;
  restart|reload) cmd_restart ;;
  install|"") cmd_install ;;
  *)
    print_err "Unknown command: $SUB"
    usage
    exit 1
    ;;
esac
