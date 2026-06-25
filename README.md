# CardSmith

CardSmith is an offline desktop app that turns PDFs, Markdown notes, text files, and code files into organized flashcards for faster studying.

## Current Status

This repository contains the first Tauri + React skeleton:

- Modern three-pane CardSmith interface
- Demo source files and flashcards
- Review card reveal interaction
- Rust command returning demo app data to React
- Windows bundle configuration for setup `.exe` and `.msi`

## Development

Install dependencies:

```powershell
cmd /c npm install
```

Run the desktop app:

```powershell
cmd /c npm run tauri dev
```

Build the frontend:

```powershell
cmd /c npm run build
```

Build Windows installers:

```powershell
cmd /c npm run tauri build
```

The setup `.exe` is produced through NSIS. The `.msi` bundle requires WiX to be installed on Windows.
