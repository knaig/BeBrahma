# Founder OS Desktop - Quick Start Guide

Get the desktop app running in 3 simple steps.

## Prerequisites

- macOS (Monterey 12.0 or later recommended)
- Node.js 18+ ([download](https://nodejs.org/))
- pnpm (`npm install -g pnpm`)

## Quick Start

### Option 1: Automated Launcher (Recommended)

Run everything with one command:

```bash
cd apps/desktop
./dev.sh
```

This will:
1. ✅ Install all dependencies
2. ✅ Start API server (port 3001)
3. ✅ Start Web server (port 3000)
4. ✅ Launch Desktop app

Press `Ctrl+C` to stop everything.

### Option 2: Manual Start

#### Step 1: Install Dependencies

```bash
# From repository root
pnpm install

# Install desktop dependencies
cd apps/desktop
pnpm install
```

#### Step 2: Start Backend Services

```bash
# Terminal 1: API server
cd apps/api
pnpm dev

# Terminal 2: Web server
cd apps/web
pnpm dev
```

#### Step 3: Launch Desktop App

```bash
# Terminal 3: Desktop app
cd apps/desktop
pnpm dev
```

## What You'll See

When the desktop app launches:

1. **Splash Screen**: Loading indicator
2. **Main Window**: Founder OS interface
3. **Menu Bar**: Native macOS menus
4. **Dock Icon**: "Founder OS" in your dock

## First Steps

1. **Create Workspace**
   - Click "Create Workspace" on landing page
   - Follow 3-step onboarding wizard

2. **Try Keyboard Shortcuts**
   - `Cmd+1` - Mission Control
   - `Cmd+2` - Artifacts
   - `Cmd+N` - New Artifact
   - `Cmd+F` - Search

3. **Explore Features**
   - Mission Control Dashboard
   - Create your first artifact
   - Check out Playbooks and Scoreboards

## Building for Distribution

### Development Build (Testing)

```bash
pnpm pack
```

Creates unsigned app in `dist/mac/`.

### Production Build (Release)

```bash
# Apple Silicon (M1/M2)
pnpm build:arm64

# Intel
pnpm build:x64

# Universal (both)
pnpm build:universal
```

Creates DMG and ZIP in `dist/`.

### Install Built App

1. Open `dist/Founder OS-1.0.0-arm64.dmg`
2. Drag "Founder OS" to Applications
3. Launch from Applications folder

## Troubleshooting

### "Command not found: pnpm"

Install pnpm:
```bash
npm install -g pnpm
```

### "Port 3000/3001 already in use"

Kill existing processes:
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### "App can't be opened" (macOS Security)

**First-time launch**:
1. Right-click app → "Open"
2. Click "Open" in security dialog

**Or disable Gatekeeper for this app**:
```bash
xattr -cr "/Applications/Founder OS.app"
```

### DevTools Not Opening

Press `Alt+Cmd+I` or:
- Menu: View → Toggle Developer Tools

### App Crashes on Launch

Check logs:
```bash
# API logs
tail -f /tmp/founder-os-api.log

# Web logs
tail -f /tmp/founder-os-web.log

# Desktop logs
~/Library/Logs/Founder\ OS/main.log
```

## Performance Tips

- **Slow startup?** Close unused browser tabs
- **High memory?** Restart app (Cmd+Q, reopen)
- **UI laggy?** Disable DevTools if open

## Keyboard Shortcuts Cheat Sheet

### Navigation
- `Cmd+1` - Mission Control
- `Cmd+2` - Artifacts
- `Cmd+3` - Playbooks
- `Cmd+4` - Scoreboards
- `Cmd+[` - Back
- `Cmd+]` - Forward

### Actions
- `Cmd+N` - New Artifact
- `Cmd+M` - Mission Control
- `Cmd+S` - Session Summary
- `Cmd+F` - Focus Search
- `Cmd+,` - Preferences

### View
- `Cmd+0` - Actual Size
- `Cmd++` - Zoom In
- `Cmd+-` - Zoom Out
- `Ctrl+Cmd+F` - Full Screen

### Window
- `Cmd+W` - Close Window
- `Cmd+M` - Minimize
- `Cmd+Q` - Quit

## Next Steps

- 📚 Read full [README](./README.md)
- 📖 Check [Founder OS Documentation](../../docs/FOUNDER_OS_README.md)
- 🚀 Review [Deployment Guide](../../docs/DEPLOYMENT_GUIDE.md)

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/yourorg/bebrahma/issues)
- **Docs**: `/docs` folder
- **Support**: Create an issue with logs

---

**Happy Building! 🚀**
