# BeBrahma v0.3 - UI Preview

Interactive React previews of the BeBrahma app for both mobile and web platforms.

## 🎯 What This Is

Two standalone HTML/React previews showcasing:

1. **Mobile App** (`index.html`) - Phone-optimized UI
2. **Web App** (`web.html`) - Desktop three-column layout

## 🚀 How to View

### Quick Start

```bash
# Open mobile preview
open index.html

# Open web preview
open web.html

# Or run local server
python -m http.server 8000
# Mobile: http://localhost:8000/index.html
# Web: http://localhost:8000/web.html
```

## 📱 Mobile Preview (index.html)

### Features:
- iPhone 13 frame (428x812px)
- 3 screens: Onboarding, NBA Recommendation, Context View
- Mobile-first interactions
- Voice input animations
- Bottom navigation pattern

### Screens:
1. **Onboarding** - Welcome + ONE question
2. **NBA Recommendation** - Main recommendation with rationale
3. **Context View** - Objectives, tasks, unknowns

## 💻 Web Preview (web.html)

### Features:
- Desktop three-column layout
- Left sidebar navigation (240px, collapsible)
- Main content area (flex, 600-900px)
- Right panel with rationale (380px)
- Keyboard shortcuts
- Hover states and interactions

### Views:
1. **Onboarding** - Centered single-page flow
2. **NBA Dashboard** - Full recommendation with score breakdown
3. **Context View** - Summary stats, objectives grid, task table

### Keyboard Shortcuts:
- `Cmd/Ctrl + B` - Toggle sidebar
- Click sidebar items to navigate

## 🎨 Design System

Both previews implement:

- **Colors:** Primary Blue (#2563EB), Success Green (#10B981), Gray scale
- **Typography:** Inter font family
- **Components:** Cards, buttons, badges, progress bars, score bars
- **Interactions:** Hover states, click animations, smooth transitions

## 🔧 Technical Details

**Stack:**
- Pure HTML + CSS + JavaScript
- React 18 (CDN)
- Babel Standalone
- No build process

**Browser Support:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive (mobile and desktop)

## 📐 Responsive Behavior

**Web Preview:**
- Desktop Large (>1440px): Three columns (sidebar + main + right panel)
- Desktop Medium (1024-1440px): Three columns (narrower right panel)
- Tablet (768-1024px): Two columns (right panel hidden)
- Mobile (<768px): Use mobile preview instead

## 🎯 Interactive Elements

### Mobile Preview:
- Screen selector (top right)
- Expandable rationale
- Voice input animation
- Alternative recommendations

### Web Preview:
- Collapsible sidebar
- Expandable rationale in right panel
- Confidence breakdown
- Quick stats
- Task checkboxes with hover
- Priority badges

## 🔄 Cross-Platform Comparison

| Feature | Mobile | Web |
|---------|--------|-----|
| Layout | Single column | Three columns |
| Navigation | Bottom tabs | Left sidebar |
| Input | Voice-first | Keyboard-first |
| Screen Size | 428px | 1024-1920px |
| Use Case | On-the-go | Deep work |

## 📚 Related Documentation

- **Mobile UX:** `/docs/bebrahma-v2/UX_DESIGN.md`
- **Web UX:** `/docs/bebrahma-v2/UX_DESIGN_WEB.md`
- **PRD:** `/docs/bebrahma-v2/PRD.md`
- **API:** `/docs/bebrahma-v2/design/API_SPEC.md`

## 💡 Notes

- Static previews with hardcoded data
- Real mobile app: React Native
- Real web app: React + TypeScript + Vite
- Backend API already implemented in `/api`

## 🐛 Known Limitations

- Voice recording is simulated (visual only)
- No data persistence
- No dark mode in previews yet
- Web preview keyboard shortcuts are visual hints only

---

**Last Updated:** January 2, 2026
**Version:** 0.3.0
**Status:** Preview/Demo
