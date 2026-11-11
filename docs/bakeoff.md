# P0 bake-off: choosing a base

Date: 2026-11-11. Snapshots are shallow clones of each default branch.

## Candidates

| | **KytyPS5** | **SharpEmu** | **RPCSX** |
|---|---|---|---|
| Repo | `KytyPS5/KytyPS5` | `sharpemu/sharpemu` | `RPCSX/rpcsx` |
| Commit | `bc934ef` (2026-11-11) | `1cebe9a` (2026-11-10) | `e8ae148` (2026-06-06) |
| Language | C++20 | C# / .NET 10 | C++ (RPCS3-derived) |
| Licence | GPL-2.0 | GPL-2.0-or-later | GPL-2.0 |
| Stars | ~11.0k | ~6.6k | — |
| Source size | 172k LOC | 319k LOC | — |
| Shader path | RDNA2/GCN → IR → SPIR-V | GCN frontend → SPIR-V words | RSX (PS3), not PS5 |
| HLE breadth | 89 library units | 49 library units | PS4/PS5 partial |
| Build on this host | **Yes, verified** | Not attempted (no .NET 10) | Not attempted |
| Last push | 2026-11-11 | 2026-11-10 | 2026-06-29 |

## Criteria and weights

| Criterion | Weight | Why |
|---|---|---|
| GPU / shader path | 30% | The hardest problem this generation |
| HLE breadth | 20% | Drives how many titles boot |
| Buildability and portability | 15% | Must build on Linux, Windows, macOS |
| Project activity | 10% | A stale base is a dead end |
| Architecture / modularity | 10% | Determines how cleanly we can fork |
| Licence compatibility | 10% | All GPL-2.0; affects repo layout |
| Test infrastructure | 5% | Needed for the compatibility harness |

## Findings

### KytyPS5

- Has a complete RDNA2/GCN → SPIR-V recompiler, **38.7k LOC**:
  - frontend decode (`OpcodeTable.h`, ALU/memory/image/export decoders),
  - typed IR with passes (SSA rewrite, constant propagation, DCE, read-lane
    elimination, resource materialization, resource tracking),
  - SPIR-V backend split by domain (ALU, flow, image, memory, mesh,
    tessellation, BVH, Trinity).
- Host GPU layer is **79.6k LOC**: tiled resources, colour/depth targets,
  buffer/texture/sampler caches, command scheduler, PSSR, DLSS, OpenXR.
- **89 HLE library units** including `libKernel`, `libAgcDriver`, `libVideoOut`,
  `libAudio`, `libPad`, `libSaveData`, `libNgs2`, `libUlt`, `libVdecsw`.
- Actively developed: the snapshot is the same day as this bake-off.
- **Verified build on this host** (Linux, headless, no Qt):

  ```
  git submodule update --init --recursive --depth 1
  cmake -S . -B _Build/linux-no-qt -G Ninja -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ \
    -DKYTY_BUILD_LAUNCHER=OFF
  cmake --build _Build/linux-no-qt --target kyty_emulator --parallel 14
  ```

  Result: `kyty_emulator`, 23 MB, clang/lld, `ver = 0.3.0`, 1114 build steps,
  `--help` lists the full CLI including `--gpu`, `--vulkan-validation`,
  `--trinity`, `--dlss`.
- Downside: one large C++ binary; the shader recompiler is not isolated as a
  library.

### SharpEmu

- **61.5k LOC** in `SharpEmu.ShaderCompiler` + `SharpEmu.ShaderCompiler.Vulkan`.
  The split is exactly right: the compiler emits raw SPIR-V words and has no
  Vulkan dependency; renderers own the API.
- Has a wave interpreter / evaluation model (`Gen5WaveInterpreter`,
  `Gen5EvaluableProgram`) useful for differential testing.
- 49 library units; strong diagnostics and tracing docs.
- Requires .NET SDK **10.0.103** (`global.json`), not installed on this host.
- macOS support is a separate repo (`sharpemu-mac`).
- Downside: C# runtime and GC behaviour in a latency-sensitive emulator; smaller
  GPU feature surface than KytyPS5 today.

### RPCSX

- RPCS3 lineage: the GPU layer is the PS3 RSX renderer (`rpcsx/gpu` has RSX
  registers, flip pipeline, RSX shaders). PS5 support reaches firmware/VSH, not
  retail GPU workloads.
- Last push 2026-06-29 — nearly five months stale at the time of this bake-off.
- **Eliminated** for P0.

## Decision

**Fork KytyPS5 as the emulator base.**

Reasons, in order:

1. It already contains the component the plan called highest-leverage: a working
   RDNA2 → SPIR-V recompiler with an IR and a testable backend.
2. It builds headless on this host with no proprietary dependencies.
3. It has the broadest HLE surface and the most active development.
4. Its Vulkan path already targets the portability requirement (Windows, Linux,
   macOS via MoltenVK).

**Adopt from SharpEmu, not fork:** the compiler/binding separation. When we
touch the shader path, extract it behind an interface that emits SPIR-V words
with no Vulkan dependency, and keep the wave-interpreter idea for differential
tests.

**Do not fork RPCSX.**

## Consequences

### Shader translator (revises D7)

Do **not** start a greenfield Rust translator. Fork KytyPS5's recompiler and
build the differential harness around it. A Rust port, if still wanted, happens
module by module behind the same fixtures — after P3, not before.

The test plan from the original D7 still applies unchanged:

- a corpus of real shaders captured from titles,
- hardware render targets as the golden model,
- per-opcode differential tests,
- a hard failure when a test skips.

### Licence (important)

All three candidates are **GPL-2.0(-or-later)**. A fork that links or derives
from their code must be distributed under GPL-2.0. Apache-2.0 is not compatible
with GPL-2.0 in that direction.

Therefore:

- This planning repo stays Apache-2.0 **while it contains only documents**.
- The emulator fork gets its own repo, `prospero-emu`, under **GPL-2.0**.
- Never copy KytyPS5 source into this Apache-2.0 repo.
- Keep the GPL-2.0 `LICENSE`, per-file SPDX headers, and upstream attribution.

### P0 exit status

- [x] Candidates cloned and inspected
- [x] Base selected
- [x] Base builds on Linux (headless, no Qt)
- [ ] Base renders a frame on Vulkan (needs a legal test binary)
- [x] Bake-off recorded

## Next actions

1. Create `ostrium-labs/prospero-emu` as a GPL-2.0 fork of KytyPS5.
2. Stand up the shader differential harness around the recompiler.
3. Find or build a legal PS5 test binary to complete the P0 render check.
4. Record the exact host/toolchain in [build.md](build.md).
