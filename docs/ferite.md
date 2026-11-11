# Ferite and Prospero

Ferite (`ostrium-labs/ferite`) is a Rust monorepo with two toolchains:

- **Lithic** — build circuits in Rust, simulate clock-by-clock, emit Verilog,
  check equivalence and synthesis.
- **Strata** — partition inference graphs across backends, compile subgraphs,
  execute with CPU fallback.

This document records what fits and what does not, so the question is answered
once instead of every planning meeting.

## Lithic: not used

Prospero is a software emulator. There is no RTL, no netlist and no silicon.
Lithic targets ~24k-cell Tiny Tapeout designs on a 130 nm process; the work here
is a multi-million-line runtime on commodity GPUs. Using Lithic would be a
category error.

The only hypothetical use would be a fixed-function hardware co-processor in a
future product, which is explicitly out of scope (see [plan.md](plan.md) §2).

## Strata: optional, narrow

One legitimate use: a **vendor-neutral neural upscaler / denoiser** in the
presentation layer, partitioned across whatever GPU or NPU is present with CPU
fallback. That is exactly Strata's model.

Caveats from Ferite's own documentation:

- No tensor-to-circuit lowering, no FPGA transport, no hardware backend.
- No production vendor integration; the plugin ABI is present but not a claim of
  integration.

So Strata can only be used as an inference runtime on the host, not as an
emulation component. Ship FSR first; evaluate Strata after P6.

## Rust: yes, for new components

- The loader, the HLE tables, the shader translator and the harness are good
  candidates for new Rust crates.
- Memory safety matters when parsing untrusted game binaries and shader blobs.
- Existing C++/C# emulator code can be wrapped behind a stable interface; do not
  rewrite working code for language purity.

## Verification discipline: yes

Ferite's strongest transferable idea is its testing discipline: a corpus, a
golden model, differential tests, and a cosimulator that fails if it skipped.
Apply the same shape to the shader translator:

- A corpus of real shaders captured from titles.
- A golden model: hardware render-target output.
- Differential tests per opcode.
- A hard failure when a test skips, so a green run cannot be green and meaningless.

That is the real contribution Ferite makes to this project: the method, not the
silicon.
