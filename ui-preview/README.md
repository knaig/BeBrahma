# BeBrahma v0.3 - UI Preview

Interactive React preview of the BeBrahma mobile app UI.

## 🎯 What This Is

This is a standalone HTML/React preview showcasing the core screens of BeBrahma v0.3:

1. **Onboarding Screen** - Progressive profiling with ONE question
2. **NBA Recommendation Screen** - Main app experience with recommendations, rationale, and alternatives
3. **Context View Screen** - Business state graph overview

## 🚀 How to View

### Option 1: Open Locally

Simply open `index.html` in your web browser:

```bash
# From the ui-preview directory
open index.html
# or
python -m http.server 8000
# Then visit http://localhost:8000
```

### Option 2: Deploy to GitHub Pages

This preview can be deployed to GitHub Pages for easy sharing:

1. Push to GitHub (already done)
2. Go to repository Settings → Pages
3. Select branch and `/ui-preview` folder
4. Access at: `https://[username].github.io/[repo-name]/ui-preview/`

## 📱 Features Demonstrated

### Onboarding Flow
- Welcome screen with brand introduction
- "One Question" onboarding
- Voice input animation (simulated)
- Text input fallback

### NBA Recommendation Screen
- Recommendation card with score and confidence
- Collapsible rationale with full details
- Score breakdown (5 dimensions)
- Alternatives list
- Framework tags
- Action buttons (Start, Modify, Skip)

### Context View Screen
- Summary statistics
- Objectives with progress bars
- Task list
- Quick add buttons
- "Ask NBA" CTA

## 🎨 Design System

The preview implements:

- **Colors:** Full BeBrahma color palette (Primary Blue, Success Green, Neutrals)
- **Typography:** Inter font family with proper weights and sizes
- **Components:** Cards, buttons, badges, progress bars, input fields
- **Layout:** Mobile-first (max-width: 428px iPhone 13)
- **Interactions:** Hover states, click animations, smooth transitions
- **Phone Frame:** Realistic iPhone frame with notch

## 🔧 Technical Details

**Stack:**
- Pure HTML + CSS + JavaScript
- React 18 (loaded via CDN)
- Babel Standalone for JSX compilation
- No build process required

**Browser Support:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📐 Screen Dimensions

- **Frame Width:** 428px (iPhone 13/14/15 width)
- **Frame Height:** 812px (iPhone 13/14/15 height)
- **Screen Padding:** 20px
- **Notch Height:** 30px

## 🎯 Interactive Elements

Try these interactions:

1. **Screen Selector** (top right on desktop) - Switch between screens
2. **Read Full Rationale** - Expand/collapse full AI reasoning
3. **Score Breakdown** - View when rationale is expanded
4. **Show All Alternatives** - Expand alternatives list
5. **Voice Input Button** - Pulsing animation on click
6. **Task Checkboxes** - Hover states
7. **All Buttons** - Hover and active states

## 🔄 Future Enhancements

This preview could be extended with:

- [ ] Actual voice recording/transcription
- [ ] API integration with backend
- [ ] Dark mode toggle
- [ ] More screens (Task Detail, Settings, etc.)
- [ ] Animations and transitions
- [ ] Mobile gesture support (swipe, pull-to-refresh)
- [ ] State persistence (localStorage)

## 📚 Related Documentation

- **UX Design Doc:** `/docs/bebrahma-v2/UX_DESIGN.md` - Complete design specifications
- **PRD:** `/docs/bebrahma-v2/PRD.md` - Product requirements
- **API Spec:** `/docs/bebrahma-v2/design/API_SPEC.md` - Backend API endpoints

## 💡 Notes

- This is a **static preview** with hardcoded data
- Real app will be built with **React Native** for mobile
- Backend API already implemented in `/api`
- Voice input is simulated (no actual recording)

## 🐛 Known Issues

- Voice recording is simulated (visual only)
- No actual data persistence
- No dark mode implementation yet
- Desktop-only screen selector (mobile shows inline)

---

**Last Updated:** January 2, 2026
**Version:** 0.3.0
**Status:** Preview/Demo
