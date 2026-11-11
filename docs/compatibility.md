# Compatibility

Compatibility is measured, never claimed. Every entry in the public matrix links
to a build, a trace and a capture.

## Levels

| Level | Definition |
|---|---|
| **Nothing** | Crashes or hangs before the first frame |
| **Boots** | Produces a frame |
| **Menus** | Renders UI and accepts input |
| **In-game** | Controllable gameplay, any frame rate |
| **Playable** | ≥30 fps at native resolution, correct audio and input |
| **Perfect** | No visual or audio regressions against hardware captures |

## Per-title manifest

```yaml
title: example
build: 2026-11-11-abc1234
level: in-game
platform: { os: linux, gpu: amd }
notes:
  - shadows flicker at the second checkpoint
traces:
  - traces/example/boot.rdc
  - traces/example/gameplay-01.rdc
captures:
  - captures/example/frame-0100.png
  - captures/example/frame-3000.png
```

Manifests live next to the title, are diffed in review, and are validated in CI.

## Golden frames

- Capture a fixed set of frames from hardware (or from a known-good emulator
  build) and store them with a hash plus a perceptual diff score.
- Compare the emulator's output with a tolerance that accounts for driver
  differences; fail only on structural regressions.
- Never compare against a different resolution without an explicit scaling rule.

## Trace replay

- GPU command streams and shader inputs are recorded and replayed deterministically.
- A replay must reproduce the same frame on every supported vendor.
- Replays are the primary debugging tool for "works on one game, breaks on the next".

## CI matrix

| Axis | Values |
|---|---|
| OS | Windows, Linux, macOS |
| GPU | NVIDIA, AMD, Intel, Apple (MoltenVK) |
| CPU | x86-64 native; ARM via FEX/Box64 |
| Build | debug, release |

Rules:

- Every PR runs the replay suite on at least one NVIDIA and one AMD machine.
- Nightly runs the full matrix.
- A compatibility level may only go **up** in a PR; downgrades require an
  explicit label and a linked issue.

## Reporting

- The matrix is generated from manifests, not hand-maintained.
- Each row shows the last passing build and the last known-good capture.
- Reports include driver version and OS build, because those change results.
