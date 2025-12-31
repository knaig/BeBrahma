# Founder OS - Desktop Application

Native macOS desktop application for Founder OS, built with Electron.

## Features

✅ **Native macOS Experience**
- Dock icon and application menu
- macOS-style title bar
- Window state persistence
- Full keyboard shortcuts

✅ **Keyboard Shortcuts**
- `Cmd+N` - New Artifact
- `Cmd+M` - Mission Control
- `Cmd+S` - Session Summary
- `Cmd+F` - Focus Search
- `Cmd+1/2/3/4` - Navigate to sections
- `Cmd+[/]` - Back/Forward
- `Cmd+,` - Preferences

✅ **Native Features**
- External links open in browser
- Single instance (prevents multiple windows)
- Window bounds persistence
- Full screen support

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- macOS (for building macOS app)

## Development

### 1. Install Dependencies

```bash
cd apps/desktop
pnpm install
```

### 2. Start Backend and Frontend

First, make sure the BeBrahma backend and frontend are running:

```bash
# Terminal 1: API server
cd apps/api
pnpm dev

# Terminal 2: Next.js frontend
cd apps/web
pnpm dev
```

### 3. Run Desktop App

```bash
cd apps/desktop
pnpm dev
```

This will launch the Electron app pointing to `http://localhost:3000/founder-os`.

## Building for Production

### Build for Current Architecture

```bash
pnpm build
```

### Build for Specific Architecture

```bash
# Apple Silicon (M1/M2)
pnpm build:arm64

# Intel
pnpm build:x64

# Universal (both architectures)
pnpm build:universal
```

The built app will be in `apps/desktop/dist/`.

### Build Outputs

- **DMG**: Disk image for distribution (`Founder OS.dmg`)
- **ZIP**: Compressed app for direct distribution
- **App Bundle**: `Founder OS.app` (in `mac/` folder)

## Installation

### From DMG

1. Open `Founder OS.dmg`
2. Drag `Founder OS` to Applications folder
3. Launch from Applications or Spotlight

### From ZIP

1. Extract `Founder OS.zip`
2. Move `Founder OS.app` to Applications folder
3. Launch (may need to allow in Security & Privacy on first run)

## Architecture

```
apps/desktop/
├── src/
│   ├── main.js          # Main process (window management, menus)
│   └── preload.js       # Preload script (context bridge)
├── build/
│   ├── icon.icns        # macOS app icon
│   └── entitlements.mac.plist  # macOS permissions
├── package.json         # Dependencies and build config
└── README.md
```

## How It Works

1. **Main Process** (`main.js`):
   - Creates native window
   - Sets up application menu
   - Handles keyboard shortcuts
   - Manages window state

2. **Preload Script** (`preload.js`):
   - Exposes safe IPC methods to renderer
   - Provides platform detection
   - Enables keyboard shortcut handling

3. **Renderer Process**:
   - Loads Next.js app from `http://localhost:3000/founder-os`
   - Communicates with main process via IPC
   - Responds to keyboard shortcuts

## Menu Structure

### Founder OS Menu
- About Founder OS
- Preferences (Cmd+,)
- Hide/Show/Quit

### File Menu
- New Artifact (Cmd+N)
- Mission Control (Cmd+M)
- Session Summary (Cmd+S)

### Edit Menu
- Standard edit operations
- Find (Cmd+F)

### View Menu
- Reload
- Toggle DevTools
- Zoom controls
- Full screen

### Navigate Menu
- Mission Control (Cmd+1)
- Artifacts (Cmd+2)
- Playbooks (Cmd+3)
- Scoreboards (Cmd+4)
- Back/Forward (Cmd+[/])

### Window Menu
- Minimize, Close, Bring All to Front

### Help Menu
- Documentation
- Report Issue
- Learn More

## Customization

### Change App Icon

Replace `build/icon.png` and `build/icon.icns` with your custom icon.

To create `.icns` from PNG:
```bash
# macOS only
iconutil -c icns icon.iconset
```

### Modify Keyboard Shortcuts

Edit the menu template in `src/main.js`:

```javascript
{
  label: 'New Artifact',
  accelerator: 'CmdOrCtrl+N',  // Change this
  click: () => { /* ... */ }
}
```

### Change Window Size

Edit defaults in `src/main.js`:

```javascript
const windowBounds = store.get('windowBounds', {
  width: 1400,  // Change width
  height: 900,  // Change height
});
```

## Production Deployment

### Code Signing (macOS)

For distribution outside the App Store, you need an Apple Developer account:

1. Get Developer ID certificate from Apple
2. Add to Keychain
3. Update `package.json`:

```json
"build": {
  "mac": {
    "identity": "Developer ID Application: Your Name (XXXXXXXXXX)"
  }
}
```

4. Build with signing:
```bash
CSC_NAME="Developer ID Application" pnpm build
```

### Notarization

For macOS 10.15+, apps must be notarized:

```bash
# After building
xcrun notarytool submit "Founder OS.dmg" \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "XXXXXXXXXX"
```

## Troubleshooting

### "App can't be opened" on macOS

First-time users may need to:
1. Right-click app → Open
2. Click "Open" in security dialog

Or disable Gatekeeper temporarily:
```bash
xattr -cr "/Applications/Founder OS.app"
```

### DevTools Not Opening

Press `Alt+Cmd+I` or enable in View menu.

### App Crashes on Launch

Check console logs:
```bash
# macOS
~/Library/Logs/Founder\ OS/
```

## Performance

- **Memory**: ~150-200 MB (includes Chromium)
- **Disk**: ~100 MB installed
- **Startup**: 1-2 seconds (cold start)

## Security

- **Context Isolation**: Enabled (prevents renderer access to Node.js)
- **Node Integration**: Disabled
- **Web Security**: Enabled
- **Preload Script**: Controlled IPC bridge

## License

Same as BeBrahma main project (check root LICENSE file).

## Support

- Report issues: https://github.com/yourorg/bebrahma/issues
- Documentation: `/docs/FOUNDER_OS_README.md`
