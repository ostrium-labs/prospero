# Research notes

## The 2026 landscape

| Project | Target | Approach | Status (Nov 2026) |
|---|---|---|---|
| **RPCS3** | PS3 | LLE + HLE, LLVM PPU/SPU recompilers | Mature; reference implementation for this kind of project |
| **shadPS4** | PS4 | HLE + Vulkan | v0.21; Bloodborne playable; shadNet online |
| **KytyPS5** | PS5 | HLE translation layer | Builds most days; ~255/435 tested titles in-game; none fully playable |
| **SharpEmu** | PS5 | HLE, C# | ~47/105 playable, mostly 2D/indie; Astro Bot ~30 fps |
| **RPCSX** | PS4 + PS5 | RPCS3-derived | Boots firmware to VSH; no retail titles launched |
| **AnyPS5** | PS5 | Relinker (no CPU emulation) | ~37% of system functions; 7 playable; native-port route |

### What the numbers mean

- "In-game" is not "playable". Reaching gameplay and sustaining a correct frame
  rate are different problems.
- Compatibility trackers list tested titles, not supported titles.
- Figures move weekly; treat any table as a dated snapshot.

## PS5 hardware (Oberon)

| Component | Specification |
|---|---|
| CPU | 8-core AMD Zen 2, 16 threads, up to 3.5 GHz (variable) |
| GPU | Custom RDNA 2, 36 CUs, up to 2.23 GHz, 10.28 TFLOPS |
| Memory | 16 GB GDDR6, 448 GB/s, unified |
| Storage | 825 GB SSD, ~5.5 GB/s raw |
| OS | Orbis OS (FreeBSD-derived) |
| Graphics | AGC/ GNM; precompiled GCN/RDNA shaders |
| Audio | Tempest 3D AudioTech |
| Input | DualSense (haptics, adaptive triggers) |

Codename: **Prospero**. (Orbis is the PS4.)

## Why PS5 emulation differs from PS3

- PS3 required *CPU* emulation: PowerPC Cell with six SPUs, 128-bit SIMD, DMA.
  RPCS3's decade of LLVM recompiler work is mostly that.
- PS5 is x86-64 with a custom RDNA2 GPU. On an x86-64 host the CPU runs
  natively. The hard parts move to:
  - the GPU command processor and proprietary shader ISA,
  - unified-memory coherence and tiling,
  - the Orbis HLE surface,
  - encryption and per-title behaviour.

## Two viable approaches

1. **HLE emulation** (KytyPS5, SharpEmu, RPCSX): translate CPU (or run native),
   reimplement the OS, translate the GPU. Broad but slow to mature.
2. **Relinking** (AnyPS5): convert the PS5 executable to a native ELF/PE and
   reimplement libraries, with no CPU emulation. Faster on x86, but x86-only and
   still needs a shader path.

This project follows approach 1, with the relinker's lesson: on x86 hosts, do not
emulate what can run natively.

## ARM

- Apple Silicon and Snapdragon cannot run x86-64 guest code natively.
- Options: FEX-Emu, Box64, or a custom JIT.
- RPCS3's arm64 port is the precedent: an IR transformer over the x86-64 JIT
  output, plus attention to 16K page sizes.

## References

- RPCS3 blog and documentation (LLVM recompilers, arm64 port).
- shadPS4 releases and compatibility list.
- KytyPS5 and SharpEmu repositories and compatibility trackers.
- RPCSX repository.
- AnyPS5 project notes.
- *Sony v. Connectix*, *Sony v. Bleem* (see [legal.md](legal.md)).
