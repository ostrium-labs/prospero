# prospero

Planning repository for a vendor-neutral PlayStation 5 emulator: native x86-64
execution, RDNA2 → SPIR-V shader translation, a Vulkan backend, and an HLE
Orbis runtime. **Software only** — no ASIC, no FPGA, no console modification.

Named after the PS5's codename. (Orbis is the PS4.)

> Status: planning. Nothing here runs a game yet. This repo holds the plan, the
> architecture, the roadmap and the compatibility strategy.

## Documents

| Doc | What it covers |
|---|---|
| [docs/plan.md](docs/plan.md) | The master plan: goal, decisions, phases, risks |
| [docs/bakeoff.md](docs/bakeoff.md) | P0 base bake-off and the fork decision |
| [docs/build.md](docs/build.md) | Reproducible headless build notes |
| [docs/architecture.md](docs/architecture.md) | Components, memory model, GPU path |
| [docs/roadmap.md](docs/roadmap.md) | Phased deliverables and exit criteria |
| [docs/compatibility.md](docs/compatibility.md) | Per-title harness, golden frames, CI matrix |
| [docs/ferite.md](docs/ferite.md) | How Ferite (Strata, Lithic) does and does not fit |
| [docs/legal.md](docs/legal.md) | Dumps, keys, firmware, patents |
| [docs/research.md](docs/research.md) | 2026 emulator landscape and PS5 hardware notes |

## The one-line thesis

Translate the PS5 GPU to **Vulkan + SPIR-V** so NVIDIA, Intel, AMD and Apple
GPUs all work through one backend; run x86-64 guest code natively on x86 hosts
and add ARM via FEX/Box64 later.

## Non-goals

- Custom silicon of any kind.
- Distributing firmware, decryption keys, or games.
- A greenfield rewrite when an existing emulator can be forked or upstreamed.

## Licence

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
