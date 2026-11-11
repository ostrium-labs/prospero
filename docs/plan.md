# Prospero: the plan

## 1. Goal

Run PS5 games on any platform, in software:

- **Hosts:** Windows, Linux, macOS, Android (later), ARM64 hosts (later).
- **GPUs:** NVIDIA, Intel, AMD, Apple (through MoltenVK).
- **No custom silicon, no console modification.**

The requirement "any platform" is satisfied by **one GPU backend**, not by
per-vendor code: translate the guest GPU to **Vulkan + SPIR-V**, and let every
driver do the rest. Vulkan 1.3 covers NVIDIA, Intel and AMD on Windows/Linux,
Adreno/Mali on Android, and Apple through MoltenVK.

## 2. Why not an ASIC

This was considered and rejected. The numbers:

| | Tiny Tapeout / Lithic | PS5 (Oberon) |
|---|---|---|
| Process | IHP 130 nm | TSMC 7/6 nm |
| Budget | ~24 tiles ≈ 24k cells | ~10B transistors, ~308 mm² |
| Clock | tens of MHz | 3.5 GHz CPU / 2.23 GHz GPU |
| Power | milliwatts | ~180–200 W |
| Compute | none | 10.3 TFLOPS RDNA2, 448 GB/s |

A "PS5 emulator ASIC" would have to *be* a PS5-class SoC. That is ~6 orders of
magnitude in transistors and ~3 in clock beyond what Lithic targets, and it
cannot be cooled inside a handheld controller. A custom co-processor is possible
in principle but solves none of the hard problems below. **Decision: software.**

## 3. State of the art (November 2026)

| Project | Target | Status |
|---|---|---|
| **RPCS3** | PS3 (Cell) | Mature reference; LLVM recompilers, most of the library playable |
| **shadPS4** | PS4 | Best PS4 option; Bloodborne ~60 fps at 4K on strong GPUs; shadNet online |
| **KytyPS5** | PS5 | ~255/435 tested titles reach in-game; Astro Bot ~40 fps; none fully playable |
| **SharpEmu** | PS5 | C#; ~47/105 playable, mostly 2D/indie; Astro Bot ~30 fps |
| **RPCSX** | PS4 + PS5 | RPCS3 lineage, Linux-only; boots firmware to VSH, cannot launch retail |
| **AnyPS5** | PS5 | Not emulation: relinks PS5 executables to native ELF/PE; ~37% of functions, 7 playable |

Lesson: PS5 emulation is roughly where PS3 emulation was in 2007. The CPU is not
the hard part this generation; the GPU, the OS surface and per-title behaviour are.

## 4. Decisions

- **D1 — Vulkan + SPIR-V is the only GPU backend.** One code path for every
  vendor. D3D12 and Metal are optional wrappers later, not first-class forks.
- **D2 — Native x86-64 execution on x86 hosts.** The PS5 CPU is Zen 2; on an
  x86-64 host there is no CPU to emulate, only privilege/syscall translation.
- **D3 — ARM later, via FEX/Box64 first, custom JIT only if necessary.** Apple
  Silicon and Snapdragon are a second, large workstream.
- **D4 — HLE, not LLE, for the OS.** Reimplement Orbis libraries by NID; do not
  emulate the kernel instruction-for-instruction.
- **D5 — Fork or upstream into an existing emulator.** KytyPS5 (C++),
  SharpEmu (C#) or RPCSX (C++). A greenfield emulator is a multi-year detour.
- **D6 — New components in Rust.** Parsing untrusted binaries and tracking GPU
  state benefit from memory safety. Existing C++/C# code can be wrapped.
- **D7 — The shader translator is a standalone, testable crate.** Highest
  leverage; must be independently verifiable against hardware output.
- **D8 — Compatibility is measured, never claimed.** A per-title harness with
  golden frames gates every change.

## 5. Architecture at a glance

```
eboot.bin ──▶ Loader ──▶ Guest memory ──▶ CPU (native x86-64 / ARM JIT)
                               │                    │
                               │                    ▼
                               │            HLE Orbis runtime (NID dispatch)
                               │                    │
                               ▼                    ▼
                     GPU command processor ──▶ Shader translator
                     (PM4 / AGC packets)        (RDNA2 ISA → SPIR-V)
                               │                    │
                               └────────┬───────────┘
                                        ▼
                                   Vulkan device
                                        │
                                        ▼
                          Presentation + upscaling + input
```

Full breakdown in [architecture.md](architecture.md).

## 6. Phases

Detailed deliverables and exit criteria in [roadmap.md](roadmap.md).

| Phase | Theme | Exit criterion |
|---|---|---|
| P0 | Base and tooling | Chosen fork builds; a homebrew renders on Vulkan |
| P1 | Vertical slice | First triangle from a translated shader |
| P2 | First 2D title | One 2D game reaches in-game at stable frame rate |
| P3 | 3D pipeline | Astro's Playroom reaches in-game |
| P4 | Breadth | 20+ titles in the compatibility matrix; audio, input, saves |
| P5 | ARM | One 3D title in-game on Apple Silicon or Snapdragon |
| P6 | Polish | Upscaling, frame pacing, per-title profiles |

Timelines are estimates, not promises. P0–P3 is a small team measured in
quarters; P4 onward is measured in years.

## 7. Success metrics

- **Boots:** reaches the first frame.
- **Menus:** renders UI and accepts input.
- **In-game:** controllable gameplay, any frame rate.
- **Playable:** ≥30 fps at native resolution with correct audio and input.
- **Perfect:** no visual or audio regressions against hardware captures.

Every claim in a compatibility table must link to a trace and a build.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Shader ISA undocumented | Treat the translator as a research project; capture traces with RenderDoc; differential tests |
| HLE surface is effectively unbounded | Drive it by titles, not by library completeness |
| Per-title hacks rot | Keep quirks in data files, not in code branches |
| ARM performance | FEX/Box64 first; custom JIT only with measured evidence |
| Legal exposure | See [legal.md](legal.md): own dumps only, no keys, no firmware |
| Fork divergence | Upstream early and often; keep patches small |

## 9. Non-goals

- Custom silicon, FPGA, or console modification.
- Distributing firmware, decryption keys, or games.
- Emulating the PS5 kernel at the instruction level.
- Supporting every title before supporting one title well.

## 10. Open questions

1. Which base to fork: KytyPS5, SharpEmu, or RPCSX? Decide in P0 with a
   build-and-boot bake-off.
2. Is the shader translator better as a fork of an existing GCN/RDNA translator
   or a new crate? Prototype both on one shader.
3. Which ARM translation layer first: FEX-Emu or Box64?
4. How much of Strata is worth wiring in for a neural upscaler, versus shipping
   FSR first?
