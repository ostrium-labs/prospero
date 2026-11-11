# Roadmap

Estimates assume a small team (2–5 people) working steadily. They are planning
tools, not commitments. Every phase ends with a demo that can be replayed from a
trace.

## P0 — Base and tooling (weeks)

**Deliverables**

- [x] Bake-off: inspect KytyPS5, SharpEmu and RPCSX.
- [x] Choose a base and write the decision down ([bakeoff.md](bakeoff.md)).
- [x] Build the chosen base headless on Linux ([build.md](build.md)).
- [ ] Create the GPL-2.0 `prospero-emu` fork repo.
- [ ] Stand up the compatibility harness skeleton (see [compatibility.md](compatibility.md)).
- [ ] Capture tooling: RenderDoc, GPU traces, and a deterministic input recorder.

**Exit:** the chosen base builds from source and renders a frame on Vulkan on at
least two vendors. (A legal test binary is still needed for the render check.)

## P1 — Vertical slice (months 1–3)

**Deliverables**

- ELF loader for `eboot.bin` with segment mapping and import resolution.
- Minimal HLE: file I/O, memory, time, thread creation, video out.
- Native x86-64 execution with syscall trapping.
- Command processor that handles a clear + one draw.
- Shader translator that handles one vertex and one fragment shader end to end.

**Exit:** a triangle renders from a shader translated from guest ISA, at a stable
frame rate, on NVIDIA and AMD.

## P2 — First 2D title (months 3–6)

**Deliverables**

- Sprite pipeline: textures, samplers, blending, scissor.
- Enough HLE for one small 2D title to reach its menus and then gameplay.
- Golden-frame harness with tolerance thresholds.
- Audio out for that title.

**Exit:** one 2D title is "in-game" (controllable gameplay) on Windows and Linux.

## P3 — 3D pipeline (months 6–12)

**Deliverables**

- Tiled/swizzled resources, render targets, depth/stencil.
- Compute shaders and the dispatch path.
- Fences, semaphores and correct frame pacing.
- Shader translator coverage driven by real titles.

**Exit:** Astro's Playroom reaches in-game at a playable frame rate on one vendor;
no visual regressions against hardware captures for the tested scenes.

## P4 — Breadth (year 1–2)

**Deliverables**

- Grow the HLE surface title-by-title; publish the compatibility matrix.
- Saves, trophies-adjacent APIs, network stubs where required.
- DualSense input, rumble, adaptive triggers.
- 20+ titles at "in-game" or better.

**Exit:** the matrix has 20+ in-game titles, CI runs on NVIDIA, Intel and AMD,
and regressions are caught automatically.

## P5 — ARM (year 2+)

**Deliverables**

- Integrate FEX-Emu or Box64 as the x86-64 translation layer.
- Measure; if insufficient, prototype a custom JIT behind the same CPU interface.
- MoltenVK path for macOS.

**Exit:** one 3D title reaches in-game on Apple Silicon or Snapdragon.

## P6 — Polish

**Deliverables**

- Upscaling: FSR first; evaluate Strata for a vendor-neutral neural upscaler.
- Per-title profiles as data, not code.
- Performance work driven by traces.

**Exit:** a set of titles meets the "Playable" definition consistently.

## What we deliberately defer

- Android before macOS/ARM desktop works.
- Any custom silicon.
- Emulating the kernel at instruction level.
- Supporting a large library before one title is solid.
