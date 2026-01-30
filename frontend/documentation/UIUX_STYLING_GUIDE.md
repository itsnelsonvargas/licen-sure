# Docs-to-Quiz App — UI/UX Styling Guide

## Purpose
A web app that converts uploaded documents into quizzes for licensure exam preparation.  
Design must support **focus, trust, and long study sessions**.

Platform: **Web (desktop-first, responsive)**

---

## 1. Brand Personality

**Tone**
- Serious
- Calm
- Academic
- Trustworthy

**Emotional Goal**
- Reduce exam anxiety
- Encourage sustained focus
- Feel reliable and professional

**Keywords**
- Minimal
- Structured
- Neutral
- Clean
- Focused
- Academic

---

## 2. Color Palette

### Design Principles
- Low saturation
- High contrast
- WCAG AA compliant
- No playful or neon colors

### Primary Colors
- Primary Blue: `#1E3A5F`
- Hover Blue: `#16314D`

Usage:
- Headers
- Primary buttons
- Active states

### Secondary Colors
- Slate Gray: `#4A5D73`
- Cool Gray: `#6B7C93`

Usage:
- Secondary text
- Icons
- Subtle UI elements

### Accent Color (Limited Use)
- Calm Teal: `#2C7A7B`

Usage:
- Progress indicators
- Focus states

### Background & Surfaces
- App Background: `#F8FAFC`
- Card Surface: `#FFFFFF`
- Elevated Surface: `#F1F5F9`
- Borders / Dividers: `#E2E8F0`

### System Feedback Colors
- Success: `#2F855A`
- Error: `#B83227`
- Warning: `#B7791F`
- Info: `#3182CE`

Rule:
- Never rely on color alone
- Always pair with text or icon

---

## 3. Typography

### Fonts
- Primary: **Inter**
- Optional Heading Accent: **Source Serif 4** (H1–H2 only)

### Font Sizes
- H1: 32px
- H2: 26px
- H3: 22px
- H4: 18px
- H5: 16px
- H6: 14px
- Body Text: 16px
- Quiz Question: 18–20px
- Answers: 16px
- Explanations: 15px

### Readability Rules
- Line height:
  - Headings: 1.3–1.4
  - Body: 1.6–1.75
- Max line length: 65–75 characters
- Avoid all caps
- Use medium weight for questions

---

## 4. Layout & Spacing

### Grid
- 12-column grid
- Max width: 1200px
- Centered reading content

### Spacing Scale
- 4px
- 8px
- 12px
- 16px
- 24px
- 32px
- 48px

Rule:
- Use only this scale
- No arbitrary spacing

### Section Separation
- Prefer whitespace
- Use borders sparingly
- Avoid heavy shadows

---

## 5. UI Components

### Buttons
**Primary**
- Background: `#1E3A5F`
- Text: White
- Radius: 6–8px
- Use for main actions only

**Secondary**
- White background
- Border: `#CBD5E1`
- Text: `#1E3A5F`

**Disabled**
- Background: `#E2E8F0`
- Text: `#94A3B8`
- No hover effects

### Input Fields
- Height: 44–48px
- Border: `#CBD5E1`
- Focus border: `#2C7A7B`
- Clear labels and helper text

File Upload:
- Drag-and-drop
- Dashed border
- Show supported formats

### Cards
- White background
- 1px border
- Soft hover shadow only

Used for:
- Quiz items
- Document previews
- Review summaries

### Modals
- Centered
- Max width: 480–600px
- Backdrop opacity: 40–50%
- Avoid stacking modals

### Progress Indicators
- Horizontal bar
- Label + percentage
- Skeleton loaders for processing states

---

## 6. Quiz-Specific UI Rules

### Question Display
- One question per screen
- Large readable text
- Clear numbering

### Answer Options
- Entire row clickable
- Spacing: 12–16px
- No distracting animations

### Feedback
**Correct**
- Green accent
- Check icon
- Subtle background tint

**Incorrect**
- Red accent
- Explanation always visible
- Neutral language

### Timer & Progress
- Always visible
- Non-blinking
- Positioned in header area

### Review Mode
- Neutral colors
- Clear correct/incorrect markers
- Explanations collapsible

---

## 7. States & Feedback

### Hover & Focus
- Subtle background change
- Always show focus ring (keyboard)

### Loading States
- Skeleton screens
- Calm messaging
- No blocking without feedback

### Empty States
- Clear instructions
- Minimal illustration (optional)
- Encouraging tone

### Error States
- Inline messages
- Icon + text
- Clear recovery steps

---

## 8. Icons & Visual Elements

### Icon Style
- Outline
- Thin stroke
- Consistent size
- Neutral color

### Rules
- Icons support text
- Never replace text
- No decorative icons

### Avoid
- Emojis
- Mixed icon styles
- Oversized visuals

---

## 9. Motion & Animation

### Allowed
- Duration: 150–250ms
- Ease-out transitions
- Used for hover, expand, progress

### Avoid
- Animations during quizzes
- Flashing or blinking
- Error animations

Goal:
- Calm, not playful

---

## 10. Do & Don’t

### Do
- Use whitespace generously
- Maintain clear hierarchy
- Design for long sessions
- Prioritize clarity

### Don’t
- Use bright colors
- Add gamification visuals
- Overuse animations
- Crowd screens
- Compete for attention

---

### Core Design Question
**Does this design help the user focus, trust the system, and study longer?**
