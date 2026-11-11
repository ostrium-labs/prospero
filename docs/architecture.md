# Architecture

## Layers

| Layer | Responsibility | Notes |
|---|---|---|
| **Loader** | Parse `eboot.bin` (ELF64), map segments, resolve imports, relocate | Untrusted input; fuzz it |
| **Guest memory** | Unified 16 GB address space, GPU-visible allocations, protection, dirty tracking | The PS5 has no separate VRAM |
| **CPU** | Native x86-64 execution on x86 hosts; JIT on ARM | Syscalls and privileged instructions trap to HLE |
| **HLE runtime** | Orbis libraries dispatched by NID | `libkernel`, `libSceGnmDriver`, `libSceVideoOut`, `libSceAudioOut`, `libScePad`, `libSceSaveData`, `libSceNgs2`, … |
| **GPU command processor** | Decode PM4/AGC packets, track state, submit draws | Ring buffers, fences, semaphores |
| **Shader translator** | RDNA2 ISA → SPIR-V | Highest-leverage component |
| **Presentation** | Swapchain, HDR, VRR, upscaling | FSR first; Strata neural later |
| **Peripherals** | Audio out, DualSense input, storage | HLE-backed |

## Guest memory model

- The PS5 exposes one 16 GB GDDR6 pool to CPU and GPU. The emulator maps it once
  and shares it between the CPU thread(s) and the GPU front end.
- GPU resources are **tiled/swizzled**. The translator and command processor must
  either emulate the tiling or convert at resource creation.
- Track dirty ranges so texture and buffer uploads to Vulkan are incremental.
- Enforce guest page protection; faults feed the HLE and the JIT.

## GPU command processor

1. Read the command ring the guest writes.
2. Decode packets (PM4/AGC): state setting, draw, dispatch, copy, sync.
3. Maintain a shadow of GPU state so redundant state changes are collapsed.
4. Emit Vulkan: render passes, pipelines, descriptor sets, barriers.
5. Translate synchronization (fences, waits) into Vulkan semaphores/events.

The command processor is where most "works on one game, breaks on the next"
bugs live; it needs a trace-replay harness.

## Shader translator

Input: precompiled RDNA2 shader ISA, as shipped inside the game. Output: SPIR-V.

Must handle:

- VGPR/SGPR register files, wave32 and wave64 modes.
- LDS (local data share) and barriers.
- Exports (position, colour, depth) and interpolation.
- Texture and buffer operations, formats, and samplers.
- Control flow, branches, and the ISA's predication.

Strategy:

1. Build a small ISA decoder with a table-driven opcode map.
2. Lower to a typed IR before emitting SPIR-V; do not emit text directly.
3. Validate differentially: run the same shader on hardware and on the
   translator, compare render targets. Keep captures as fixtures.
4. Treat unknown opcodes as hard failures, never as silent no-ops.

This is the component most worth extracting as its own crate and testing in
isolation.

## HLE runtime

- Imports resolve to host functions by **NID** (a hash of the symbol name).
- Each library is a table: NID → signature → implementation.
- Missing NIDs are logged with the calling title and the import site, so the
  compatibility list drives the work.
- No leaked SDK headers, no proprietary code; implementations are clean-room
  from observed behaviour.

## Presentation

- Swapchain per platform; HDR and VRR where available.
- Upscaling is optional and must never be required for correctness.
- Frame pacing is a first-class feature, not an afterthought.

## Threading

- One guest CPU thread per guest core, mapped to host threads.
- The GPU front end runs on its own thread and consumes submitted command buffers.
- Synchronization uses the guest's own primitives translated to host primitives;
  never rely on host scheduling order.

## Portability matrix

| Host | CPU path | GPU path |
|---|---|---|
| Windows x86-64 | native | Vulkan |
| Linux x86-64 | native | Vulkan |
| macOS x86-64 | native | Vulkan via MoltenVK |
| macOS ARM64 | FEX/Box64 → JIT | Vulkan via MoltenVK |
| Linux ARM64 | FEX/Box64 → JIT | Vulkan |
| Android | FEX/Box64 → JIT | Vulkan |
