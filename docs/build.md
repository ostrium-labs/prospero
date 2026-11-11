# Build notes

Reproducible notes from the P0 bake-off host. These are for the **KytyPS5
fork**, not for this planning repo.

## Host

| | |
|---|---|
| OS | Linux |
| CPU | 14 threads |
| RAM | 15 GiB |
| CMake | 3.31.10 |
| Clang | system clang |
| glslangValidator | 16.6.0 |
| Ninja | 1.13.2 (installed with `pip --user`) |
| Vulkan | Intel Arc iGPU (ARL), device API 1.4.354 (Mesa), loader 1.4.363 |

## Prerequisites (Debian/Ubuntu)

```bash
sudo apt-get install --no-install-recommends \
  clang lld ninja-build cmake git glslang-tools python3 pkg-config \
  libgl1-mesa-dev libx11-dev libxcursor-dev libxext-dev libxfixes-dev \
  libxi-dev libxrandr-dev libxss-dev libxtst-dev libxkbcommon-dev \
  libasound2-dev libpulse-dev libudev-dev libdbus-1-dev \
  libwayland-dev wayland-protocols
```

Qt 6 is only needed for the launcher; the headless `kyty_emulator` target does
not need it.

If `ninja` cannot be installed system-wide, a user install works:

```bash
python3 -m pip install --user --break-system-packages ninja
export PATH="$HOME/.local/bin:$PATH"
```

## Clone and build (headless)

```bash
git clone --depth 1 https://github.com/KytyPS5/KytyPS5.git
cd KytyPS5
git submodule update --init --recursive --depth 1

cmake -S . -B _Build/linux-no-qt -G Ninja -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ \
  -DKYTY_BUILD_LAUNCHER=OFF

cmake --build _Build/linux-no-qt --target kyty_emulator --parallel 14
```

First configure downloads FFmpeg prebuilts and `xbyak`, `zydis`, `zstd`,
ZArchive. It took ~5m40s here; the build took ~10 minutes.

## Verify

```bash
./_Build/linux-no-qt/kyty_emulator --help
```

Observed output begins:

```
Release, clang-lld, ver = 0.3.0, git = KytyPS5-2026-11-11-bc934ef
kyty_emulator --game <dir|elf|zar> [options]
```

## Run a game

KytyPS5 loads a directory containing `eboot.bin`, a bare PS5 ELF, or a `.zar`:

```bash
./_Build/linux-no-qt/kyty_emulator --game /path/to/your-dump
```

The dump must be one you own. No game, firmware or key is bundled or
downloadable. Compatibility is early: expect boot and menus, not playable
titles. Default keyboard, mouse and gamepad controls are documented in
[key-mapping.md](https://github.com/ostrium-labs/prospero-emu/blob/main/docs/prospero/key-mapping.md).

## Notes

- The Vulkan ICD on the bake-off host was Intel; cross-vendor GPU testing needs
  NVIDIA and AMD machines (see [compatibility.md](compatibility.md)).
- Build output lives in `_Build/` and is not committed.
- The build is GPL-2.0; see [bakeoff.md](bakeoff.md) for the licence consequence.
