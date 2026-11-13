# Prospero UI

Part of the [Prospero monorepo](https://github.com/ostrium-labs/prospero). This
directory holds the PS5-style desktop launcher for the
[Prospero emulator](https://github.com/ostrium-labs/prospero-emu). It scans
folders for games, shows a console-style home screen, launches the emulator, and
edits the emulator's keyboard bindings.

The launcher does not contain or link any emulator code; it starts the
`kyty_emulator` binary as a child process.

## Requirements

- Node.js 20 or newer
- A built `kyty_emulator` binary (see `prospero-emu`)
- Linux, Windows or macOS with a desktop session

## Run

From the monorepo root:

```bash
npm install
npm start
```

The root `package.json` defines the `ui` npm workspace. After installing at
the root you can also run `npm start` from this directory.

`npm start` passes `--no-sandbox` so Electron starts on Linux systems without
the setuid sandbox helper. Use `npm run start:gpu` if your system has the
helper configured.

Electron chooses the Linux display backend itself. To force one:

```bash
PROSPERO_OZONE=wayland npm start
PROSPERO_OZONE=x11 npm start
```

Some Mesa/Wayland combinations print a `--ozone-platform=wayland is not
compatible with Vulkan` warning; the launcher still runs. Forcing `x11` can
crash the GPU process on some drivers, so only do it if the default fails.

## Add games

Use **Add folder** on the home screen or in **Library**. The launcher scans each
folder (five levels deep) for:

- a directory containing `eboot.bin` — read as a game folder; the title, title
  ID, icon and background come from `sce_sys/param.json`, `sce_sys/icon0.png`
  and `sce_sys/pic0.png`
- an `.elf` or `.zar` file — read as a single game file

Scanning skips `node_modules`, `.git`, `_Build`, `_Shaders`, `_SaveData` and
`_PipelineCache`.

## Emulator path

The launcher looks for the emulator at:

1. `$PROSPERO_EMULATOR`
2. `~/Documents/Ostriumlabs/prospero-emu/_Build/linux-no-qt/kyty_emulator`
3. `~/Documents/Ostriumlabs/prospero-emu/_Build/windows/kyty_emulator.exe`
4. `./_Build/linux-no-qt/kyty_emulator`
5. `kyty_emulator` on `PATH`

Override it with **Settings → Emulator → Browse**.

## Controls

Click a binding in **Settings → Keybindings**, then press a key or a mouse
button. `Esc` cancels. `F1`, `F2`, `F7`, `F8` and `F11` are reserved by the
emulator.

The launcher sends the complete binding set to the emulator as repeated
`--keymap Control=Key` arguments. This matters because the emulator treats any
custom keymap as a full replacement for its defaults; the launcher always sends
every control, so partial edits still work.

### Defaults

| PS5 control | Key |
|---|---|
| Cross | `J` |
| Circle | `L` |
| Square | `K` |
| Triangle | `I` |
| D-pad | Arrow keys |
| L1 / R1 | `Q` / `E` |
| L2 / R2 | `Z` / `C` |
| L3 / R3 | Left Shift / Left Ctrl |
| Options | Enter |
| Touch pad left / right | Backspace / Tab |
| Left stick | `W` `A` `S` `D` |
| Right stick | `T` `F` `G` `H` |
| Speaker volume | `1` |
| Vibration intensity | `2` |
| Trigger intensity | `3` |
| Touch-pad mode | `F6` |

### USB keyboard

Plug a USB or Bluetooth keyboard into the PC. SDL sees it as a normal keyboard;
nothing needs to be installed inside Prospero. Click the game window once so it
has focus, then use the bindings above.

- `F8` cycles which player the keyboard controls. The default, `0`, shares
  player 1 with a gamepad.
- `F6` toggles touch-pad mode.
- `F7` toggles mouse-to-right-stick.
- `F11` or `Alt+Enter` toggles fullscreen.

The **Keyboard player** setting in **Settings → Emulator** is passed as
`--keyboard-player` (`0` shares player 1; `1`–`4` select a dedicated player).

## Files

Everything is stored under Electron's user-data directory, normally
`~/.config/Prospero` on Linux:

- `settings.json` — emulator path, extra arguments, keymap
- `library.json` — scanned folders
- `logs/` — one log per launch
- `runs/<game-id>/` — working directory for each game

## Development

```bash
PROSPERO_AUTOLAUNCH=1 npm start
```

Autolaunches the first game after the initial scan. Useful for testing the
spawn and log path without clicking.

```bash
PROSPERO_VIEW=settings PROSPERO_SCREENSHOT=/tmp/prospero.png npm start
```

`PROSPERO_VIEW` opens `home`, `library` or `settings` before capture.
`PROSPERO_SCREENSHOT` writes a PNG and quits; `PROSPERO_SCREENSHOT_DELAY`
controls the wait in milliseconds (default `1800`). These are development
helpers for checking layout without a display.

## Known issues

- The emulator may print a warning about `fragmentShaderBarycentric` or native
  64-bit LDS atomics on Intel GPUs. That is an emulator capability warning, not
  a launcher error.
- A large `pic0.png` is used as a file URL for the home-screen background. If it
  fails to load, the launcher falls back to a generated gradient.

## Licence

Apache-2.0. See [../LICENSE](../LICENSE) and [../NOTICE](../NOTICE). The
emulator fork lives in a separate GPL-2.0 repository and is not linked into this
launcher.
