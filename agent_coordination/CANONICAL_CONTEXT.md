# CANONICAL context (do not forget)

Tim's priorities, in order:

1. **Teaching goes smoothly** — SETH, instructor tools, student flows in **TIM**
2. **Pure Canonical Core** — curriculum / Program OS spine (separate authority)
3. **Ops stay invisible** — agents handle edge agent, Tailnet, git, Base44 bridge

## Pure Canonical Core ≠ TIM

| | **Pure Canonical Core** | **TIM** (this repo) |
|---|-------------------------|----------------------|
| **Project ID** | `canonical-program-os` | `tim` |
| **Local path** | `CANONICAL/30_CODE/BASE44_CANONICAL_GITHUB_SYNC` | `CANONICAL/30_CODE/tim` |
| **Remote** | `github.com/tbm898-source/canonical.git` | `github.com/tbm898-source/tim.git` |
| **Role** | Program OS, curriculum spine, public/licensing surface | Teaching delivery, SETH, assets, device control |
| **Merge?** | **No** — keep separate per project card |

From `00_CONTROL_PLANE/project-cards/pure-canonical-core.md`:

- Public-facing website and licensing surface for CANONICAL memory, curriculum, AI workflow infrastructure, operating-spine architecture
- Do not merge into another project yet
- Do not publish without privacy review

## When work belongs where

**Stay in TIM** when Tim mentions:

- Class, students, quizzes, grading, SETH, study mode, submissions, learning paths
- Assets, devices, DHD-Admin agent (this session's infra work)

**Route to Pure Canonical Core** when Tim mentions:

- Program OS, curriculum generation, PRISM_DTJL spine, canonical spine, licensing, portfolio/public CANONICAL site
- Cross-program architecture, agent council flow, generation pipeline docs

**Re-route explicitly** — do not edit `BASE44_CANONICAL_GITHUB_SYNC` from a TIM-only session unless Tim names that repo.

## Mesh read order (cross-agent)

When work spans more than TIM:

1. `CANONICAL/00_CONTROL_PLANE/CONTEXT_ROUTING.md`
2. `CANONICAL/00_CONTROL_PLANE/GIT_MESH_REGISTRY.json`
3. `CANONICAL/00_CONTROL_PLANE/AGENT_COORDINATION.md`
4. `CANONICAL/00_CONTROL_PLANE/AGENT_COORDINATION_BOARD.md` — claim before non-trivial edits

TIM-local coordination still uses this folder (`agent_coordination/`) for Cursor ↔ Codex on Mac + DHD-Admin.

## Agent promise to Tim

- We keep **TIM teaching tools** reliable and fast
- We do **not** dilute or merge **Pure Canonical Core** into TIM
- We escalate `[NEEDS TIM]` only for product/licensing calls, not routine ops
