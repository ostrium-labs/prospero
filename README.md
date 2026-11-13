# Prospero

Monorepo for the Prospero project: the plan, architecture and compatibility
strategy for a vendor-neutral PlayStation 5 emulator, plus the PS5-style desktop
launcher. Native x86-64 execution, RDNA2 → SPIR-V shader translation, a Vulkan
backend, and an HLE Orbis runtime. **Software only** — no ASIC, no FPGA, no
console modification.

Named after the PS5's codename. (Orbis is the PS4.)

> Status: early. The GPL-2.0 emulator fork boots and opens *Hollow Knight:
> Voidheart Edition* on an Intel iGPU; the launcher scans, launches, streams
> logs and edits keybindings. Compatibility work is still early.

**Emulator:** [ostrium-labs/prospero-emu](https://github.com/ostrium-labs/prospero-emu)
(GPL-2.0) holds the emulator code. This repository is the Apache-2.0 plan,
documentation and first-party launcher.

## Repository layout

| Path | Contents |
|---|---|
| [docs/](docs/) | Plan, bake-off, architecture, roadmap, compatibility, legal and research notes |
| [ui/](ui/) | Electron launcher: game scanning, home screen, library, launch/log overlay and keybinding editor |

## Launcher

```bash
npm install
npm start
```

The root `package.json` is an npm workspace for [`ui/`](ui/). Use
`npm run start:gpu` if Electron's Linux sandbox helper is configured. The
launcher starts a built `kyty_emulator` as a child process; it does not contain
or link emulator code. See [ui/README.md](ui/README.md) for controls,
keybindings, display-backend notes and development flags.

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
| [ui/README.md](ui/README.md) | Launcher usage, controls and development flags |

## The one-line thesis

Translate the PS5 GPU to **Vulkan + SPIR-V** so NVIDIA, Intel, AMD and Apple
GPUs all work through one backend; run x86-64 guest code natively on x86 hosts
and add ARM via FEX/Box64 later.

## Non-goals

- Custom silicon of any kind.
- Distributing firmware, decryption keys, or games.
- A greenfield rewrite when an existing emulator can be forked or upstreamed.

## Licence

Apache-2.0 for this repository. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

The emulator fork is a separate repository under **GPL-2.0**; it is not linked
into the launcher.
