import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Bot,
  CheckCircle2,
  Laptop,
  Loader2,
  MonitorSmartphone,
  Play,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  Wifi,
  XCircle,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_CLASSES = {
  online: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  offline: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  degraded: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  disabled: 'border-red-400/30 bg-red-400/10 text-red-200',
  pending_approval: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  queued: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  running: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
  succeeded: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  failed: 'border-red-400/30 bg-red-400/10 text-red-200',
  expired: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  cancelled: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
};

const PLATFORM_ICONS = {
  windows: Laptop,
  macos: Laptop,
  linux: TerminalSquare,
  android: Smartphone,
  ios: Smartphone,
  ipados: MonitorSmartphone,
  network: Wifi,
};

const formatTimestamp = (value) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Never';

function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={STATUS_CLASSES[status] || STATUS_CLASSES.offline}>
      {status?.replaceAll('_', ' ') || 'unknown'}
    </Badge>
  );
}

function EmptyState({ previewMode }) {
  return (
    <Card className="border-dashed border-white/15 bg-white/[0.03]">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <MonitorSmartphone className="h-8 w-8 text-cyan-300" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-white">No trusted agents connected</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
          Install the TIM edge agent on a Windows PC or Mac, give it an explicit workspace allowlist, then pair it with this app. Phones and tablets appear through their host tooling or approved platform automation.
        </p>
        {previewMode ? <p className="mt-3 text-xs text-amber-200">Local preview is intentionally disconnected from Base44.</p> : null}
      </CardContent>
    </Card>
  );
}

export default function Devices() {
  const [nodes, setNodes] = useState([]);
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(!appParams.isPreviewMode);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (appParams.isPreviewMode) return;
    setLoading(true);
    setError('');
    try {
      const [nodeRows, commandRows] = await Promise.all([
        base44.entities.DeviceNode.list('-last_seen', 50),
        base44.entities.DeviceCommand.list('-created_date', 30),
      ]);
      setNodes(nodeRows);
      setCommands(commandRows);
    } catch (loadError) {
      setError(loadError.message || 'Device control data is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const queueAction = async (node, action, payload = {}) => {
    setWorkingId(`${node.node_id}:${action}`);
    setError('');
    try {
      await base44.functions.invoke('queueDeviceCommand', {
        node_id: node.node_id,
        action,
        payload,
        idempotency_key: `${node.node_id}:${action}:${Date.now()}`,
      });
      await loadData();
    } catch (actionError) {
      setError(actionError.message || `Could not queue ${action}.`);
    } finally {
      setWorkingId('');
    }
  };

  const approveCommand = async (command) => {
    setWorkingId(command.command_id);
    setError('');
    try {
      await base44.functions.invoke('approveDeviceCommand', { command_id: command.command_id });
      await loadData();
    } catch (approvalError) {
      setError(approvalError.message || 'Approval failed.');
    } finally {
      setWorkingId('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 pb-24 pt-6 text-white md:px-8 md:pb-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link to="/SETH" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
              <Bot className="h-4 w-4" /> TIM command center
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Trusted devices</h1>
            <p className="mt-2 max-w-2xl text-slate-400">See each machine’s actual capabilities, queue bounded actions, approve consequential work, and verify the result.</p>
          </div>
          <Button onClick={loadData} variant="outline" disabled={loading || appParams.isPreviewMode} className="border-white/10 bg-slate-900 text-slate-200 hover:bg-white/10 hover:text-white">
            <RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </header>

        <section className="grid grid-cols-2 gap-2 py-5 lg:grid-cols-4 lg:gap-3 lg:py-6" aria-label="Device control stages">
          {[
            ['1', 'Observe', 'Inventory and health'],
            ['2', 'Plan', 'Bounded command'],
            ['3', 'Approve', 'Human decision'],
            ['4', 'Verify', 'Result and audit log'],
          ].map(([step, title, detail]) => (
            <div key={step} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 lg:p-4">
              <span className="text-xs font-semibold text-cyan-300">STEP {step}</span>
              <p className="mt-1 font-medium text-white">{title}</p>
              <p className="mt-1 text-sm text-slate-500">{detail}</p>
            </div>
          ))}
        </section>

        {error ? (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Machines and gateways</h2>
              <span className="text-sm text-slate-500">{nodes.length} paired</span>
            </div>
            {loading ? (
              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="flex items-center justify-center gap-3 py-14 text-slate-400"><Loader2 className="animate-spin" /> Loading trusted devices…</CardContent>
              </Card>
            ) : nodes.length === 0 ? <EmptyState previewMode={appParams.isPreviewMode} /> : (
              <div className="grid gap-4 xl:grid-cols-2">
                {nodes.map((node) => {
                  const PlatformIcon = PLATFORM_ICONS[node.platform] || MonitorSmartphone;
                  const online = node.status === 'online';
                  const canListAndroid = node.capabilities?.includes('android.devices');
                  const canLaunch = node.capabilities?.includes('app.launch');
                  return (
                    <Card key={node.id || node.node_id} className="border-white/10 bg-white/[0.04]">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-white/10 bg-slate-950 p-3"><PlatformIcon className="h-5 w-5 text-cyan-300" /></div>
                            <div>
                              <CardTitle className="text-base text-white">{node.display_name}</CardTitle>
                              <CardDescription className="mt-1 text-slate-500">{node.platform} · {node.trust_level}</CardDescription>
                            </div>
                          </div>
                          <StatusBadge status={node.status} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                          {(node.capabilities || []).map((capability) => (
                            <Badge key={capability} variant="outline" className="border-white/10 bg-slate-950/70 text-slate-400">{capability}</Badge>
                          ))}
                        </div>
                        <p className="mt-4 text-xs text-slate-500">Last heartbeat: {formatTimestamp(node.last_seen)}</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" disabled={!online || workingId === `${node.node_id}:system.inventory`} onClick={() => queueAction(node, 'system.inventory')} className="border-white/10 bg-slate-950 text-slate-200 hover:bg-white/10 hover:text-white">
                            <Activity /> Inventory
                          </Button>
                          {canListAndroid ? (
                            <Button size="sm" variant="outline" disabled={!online || workingId === `${node.node_id}:android.devices`} onClick={() => queueAction(node, 'android.devices')} className="border-white/10 bg-slate-950 text-slate-200 hover:bg-white/10 hover:text-white">
                              <Smartphone /> Android devices
                            </Button>
                          ) : null}
                          {canLaunch ? (
                            <Button size="sm" variant="outline" disabled={!online || workingId === `${node.node_id}:app.launch`} onClick={() => queueAction(node, 'app.launch', { app: node.platform === 'macos' ? 'xcode' : 'android_studio' })} className="border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20 hover:text-white">
                              <Play /> Launch {node.platform === 'macos' ? 'Xcode' : 'Studio'}
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Command ledger</h2>
              <ShieldCheck className="h-5 w-5 text-violet-300" />
            </div>
            <Card className="border-white/10 bg-white/[0.04]">
              <CardContent className="p-0">
                {commands.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-500">No device commands have been recorded.</div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {commands.map((command) => (
                      <article key={command.id || command.command_id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm text-white">{command.action}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">{command.node_id} · {formatTimestamp(command.requested_at)}</p>
                          </div>
                          <StatusBadge status={command.status} />
                        </div>
                        {command.error ? <p className="mt-3 text-xs leading-5 text-red-200">{command.error}</p> : null}
                        {command.status === 'pending_approval' ? (
                          <Button size="sm" onClick={() => approveCommand(command)} disabled={workingId === command.command_id} className="mt-3 bg-amber-300 text-slate-950 hover:bg-amber-200">
                            {workingId === command.command_id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Review and approve
                          </Button>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-slate-900/60">
            <CardHeader><CardTitle className="text-base text-white">Windows + Android</CardTitle><CardDescription className="text-slate-400">Android Studio, Gradle, ADB inventory, and approved APK installs through the Windows agent.</CardDescription></CardHeader>
          </Card>
          <Card className="border-white/10 bg-slate-900/60">
            <CardHeader><CardTitle className="text-base text-white">Mac + Apple tooling</CardTitle><CardDescription className="text-slate-400">Xcode and xcodebuild run on a Mac agent; explicitly named Shortcuts provide supported automation.</CardDescription></CardHeader>
          </Card>
          <Card className="border-white/10 bg-slate-900/60">
            <CardHeader><CardTitle className="text-base text-white">iPhone and iPad</CardTitle><CardDescription className="text-slate-400">Apple does not expose unrestricted remote UI control. TIM uses Xcode, Shortcuts, HomeKit, or managed-device APIs where available.</CardDescription></CardHeader>
          </Card>
        </section>
      </div>
    </div>
  );
}
