# Proesphere Landing Page Redesign — Claude Code Instructions

## 📍 PROJECT CONTEXT

**Repository:** `juanjtov-apps/project_management`
**Branch:** `stabilize/MVP`
**Tech Stack:**
- React 18 + TypeScript
- Vite (build tooling)
- Tailwind CSS (styling)
- Radix UI + shadcn/ui (component library)
- Wouter (routing)

**Landing Page Location:** Create a new page/component for the landing page, separate from the main app dashboard. This is a **public-facing marketing page**, not part of the authenticated app.

---

## ⚠️ CRITICAL CONSTRAINTS

**PRESERVE:**
- Existing Proesphere color palette (defined below) — DO NOT CHANGE COLORS
- All existing app functionality, routing, API connections, database logic
- The `client/src/components/ui/` shadcn components
- Authentication flows and RBAC system

**CREATE/MODIFY:**
- New landing page route (e.g., `/` or `/landing` before auth)
- Landing page components in a dedicated folder (e.g., `client/src/pages/landing/` or `client/src/components/landing/`)
- May add GSAP as a dependency for animations

**This page will be shown to investors. Every pixel matters.**

---

## 🎯 DESIGN PHILOSOPHY: Jony Ive Principles

Apply these principles to every decision:

1. **Radical Simplicity** — Remove everything that doesn't serve a purpose. When in doubt, leave it out.
2. **Purposeful Whitespace** — Space is a design element, not emptiness. Use generous padding and margins.
3. **Typography as Hierarchy** — Let font weight, size, and spacing do the work. Minimize decorative elements.
4. **Restrained Animation** — Subtle, physics-based transitions. Nothing that draws attention to itself.
5. **Invisible Grid** — Perfect alignment. Every element should feel mathematically placed.
6. **Material Honesty** — Design should feel tangible but not skeuomorphic. Clean surfaces, subtle depth.
7. **Focus Through Reduction** — One primary action per viewport. Guide the eye, don't scatter it.

**Reference Aesthetic:** Apple product pages, Linear.app, Vercel, Raycast — dark mode, premium SaaS.

---

## 🎨 BRAND COLOR PALETTE (DO NOT MODIFY)

These are the exact Proesphere brand colors. Use CSS variables or Tailwind config extension.

```css
:root {
  /* Background & Surfaces */
  --bg-deep: #0F1115;
  --bg-surface: #161B22;
  --bg-surface-hover: #1F242C;
  --border: #2D333B;

  /* Primary Accent (Mint Green) */
  --accent: #4ADE80;
  --accent-dim: #22C55E;
  --accent-bg: rgba(74, 222, 128, 0.15);

  /* Status Colors (use sparingly on landing page) */
  --warning: #F97316;
  --warning-bg: rgba(249, 115, 22, 0.15);
  --danger: #EF4444;
  --danger-bg: rgba(239, 68, 68, 0.15);
  --success: #10B981;
  --success-bg: rgba(16, 185, 129, 0.15);

  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #9CA3AF;
  --text-muted: #6B7280;

  /* Additional Accents (use sparingly) */
  --blue: #3B82F6;
  --blue-bg: rgba(59, 130, 246, 0.15);
  --cyan: #22D3EE;
  --cyan-bg: rgba(34, 211, 238, 0.15);
  --yellow: #EAB308;
  --yellow-bg: rgba(234, 179, 8, 0.15);
}
```

**Tailwind Extension (add to tailwind.config.ts if not present):**

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        'bg-deep': '#0F1115',
        'bg-surface': '#161B22',
        'bg-surface-hover': '#1F242C',
        'border-custom': '#2D333B',
        'accent': '#4ADE80',
        'accent-dim': '#22C55E',
        'text-primary': '#FFFFFF',
        'text-secondary': '#9CA3AF',
        'text-muted': '#6B7280',
      },
    },
  },
}
```

---

## 🎬 GSAP ANIMATION IMPLEMENTATION

**Install GSAP:**
```bash
npm install gsap @gsap/react
```

**Animation Philosophy:**
- Use GSAP for orchestrated sequences, scroll-triggered reveals, and timeline-based animations
- Keep animations subtle and physics-based
- Duration: 0.6-1.2s for major reveals, 0.2-0.3s for micro-interactions
- Easing: `power2.out` or `power3.out` for smooth deceleration

**Recommended GSAP Setup:**

```typescript
// client/src/hooks/useGSAP.ts
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };
```

**Animation Patterns to Use:**

```typescript
// Hero entrance sequence
useGSAP(() => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  
  tl.from('.hero-eyebrow', { y: 20, opacity: 0, duration: 0.6 })
    .from('.hero-headline', { y: 30, opacity: 0, duration: 0.8 }, '-=0.3')
    .from('.hero-subheadline', { y: 20, opacity: 0, duration: 0.6 }, '-=0.4')
    .from('.hero-cta', { y: 20, opacity: 0, duration: 0.6 }, '-=0.3');
});

// Scroll-triggered section reveals
useGSAP(() => {
  gsap.utils.toArray('.reveal-section').forEach((section) => {
    gsap.from(section, {
      y: 60,
      opacity: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });
  });
});

// Staggered card reveals
useGSAP(() => {
  gsap.from('.feature-card', {
    y: 40,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.features-grid',
      start: 'top 75%',
    },
  });
});
```

**Animation Restraint Rules:**
- NO bounce effects
- NO spinning or rotating elements
- NO continuous animations (except subtle CTA pulse)
- NO parallax that feels gimmicky
- Animations should feel like natural physics, not "effects"

---

## 📝 STRATEGIC MESSAGING FRAMEWORK

### Product Positioning
Proesphere is NOT "better project management software." It is **freedom from project management software**. The AI adapts to human intent, not the other way around.

### Target Audience
- Primary: Construction project managers seeking efficiency
- Secondary: General managers evaluating tools for their teams

### Conversion Goal
**Single action:** Join the waitlist

### Core Value Propositions
1. **Simplicity** — One prompt, complete clarity
2. **Intelligence** — AI that learns, anticipates, and protects
3. **Focus** — Free PMs to do high-value work, not administrative tracking

---

## 📐 PAGE STRUCTURE & CONTENT

### SECTION 1: Hero (Above the Fold)

**Layout:**
- Full viewport height (100vh) on desktop, auto on mobile
- Centered content with generous vertical padding (py-24 to py-32)
- Single-column layout, max-width ~720px for text
- Background: `--bg-deep` with optional subtle gradient or grain texture

**Content:**

```
[Small eyebrow text - text-muted, uppercase, tracking-widest, text-xs]
AI-NATIVE PROJECT INTELLIGENCE

[Main Headline - text-4xl md:text-6xl lg:text-7xl, font-bold, text-white]
Ask a question.
Get the answer.
That's it.

[Subheadline - text-lg md:text-xl, text-secondary, max-w-xl, leading-relaxed]
The command center for construction teams who'd rather 
build than click. One prompt. Complete clarity.

[Email Input + CTA Button - inline on desktop, stacked on mobile]
[Input: bg-surface, border-custom, placeholder: "Enter your email"]
[Button: bg-accent, text-bg-deep, font-semibold, "Join Waitlist"]

[Social proof line - text-sm, text-muted]
Join 400+ construction professionals on the waitlist
```

**Animation:**
- Staggered entrance: eyebrow → headline → subheadline → CTA (using GSAP timeline)
- Total sequence: ~2 seconds
- CTA button: very subtle glow pulse on idle (CSS animation, not GSAP)

**Design Notes:**
- NO busy illustrations or dashboard screenshots in hero
- Consider subtle gradient: `bg-gradient-to-b from-bg-deep via-bg-deep to-bg-surface`
- Email input and button should feel like one unified component

---

### SECTION 2: Problem Reframe

**Layout:**
- Generous vertical padding (py-24 md:py-32)
- Centered text block, max-width ~640px
- Background: `--bg-surface` or same as hero

**Content:**

```
[Section text - text-xl md:text-2xl, text-secondary, leading-relaxed]
You didn't become a project manager to chase down 
spreadsheets, cross-reference schedules, and manually 
compile reports.

Yet that's where [60%] of your time goes.

(The "60%" should be highlighted with text-accent)
```

**Animation:**
- Fade-up on scroll (ScrollTrigger)
- The "60%" could have a subtle count-up animation

**Design Notes:**
- This section is a breath — lots of whitespace
- No headers, no decorations — just the statement
- Should feel like a moment of recognition

---

### SECTION 3: How It Works

**Layout:**
- Three-column grid on desktop (grid-cols-3), single column on mobile
- Cards with `bg-surface`, `border-custom`, rounded-xl, p-6 to p-8
- Equal height cards

**Content:**

```
[Section Header - text-sm, text-muted, uppercase, tracking-widest, mb-2]
HOW IT WORKS

[Cards - each with:]
- Icon (Lucide icons, text-accent, 24-32px)
- Title (text-xl, font-semibold, text-white, mt-4)
- Body (text-secondary, mt-2, leading-relaxed)

Card 1:
Icon: MessageSquare or Terminal
Title: Ask
Body: Type your question in plain language. No menus, no navigation, no learning curve.

Card 2:
Icon: Cpu or Sparkles
Title: Proesphere Works
Body: The AI queries all your connected project data—tasks, schedules, documents, communications.

Card 3:
Icon: FileText or ClipboardList
Title: You Receive
Body: A clear answer in your preferred format. Report, summary, action list—your call.
```

**Example Prompts (display below cards):**

```
[Container: bg-surface/50, rounded-lg, p-4, font-mono, text-sm, text-secondary]

"What materials need to be ordered for the electrical phase starting Monday?"

"Are there any unanswered client questions from the last 7 days?"

"Generate a progress report for the Martinez renovation."
```

**Animation:**
- Cards stagger in from bottom (0.15s delay between each)
- Prompts fade in after cards complete

---

### SECTION 4: Intelligence Evolution

**Layout:**
- Horizontal timeline on desktop, vertical on mobile
- Three stages with connecting lines/arrows
- Centered, generous spacing

**Content:**

```
[Section Header]
Gets Smarter With You

[Timeline with 3 stages:]

Stage 1:
Label: DAY ONE (text-xs, text-muted, uppercase)
Icon: Eye (text-accent)
Title: Reactive (text-lg, font-semibold)
Description: You ask. It answers. (text-secondary)

Stage 2:
Label: MONTH ONE
Icon: Lightbulb (text-accent)
Title: Proactive
Description: It learns your patterns. Surfaces what matters before you ask.

Stage 3:
Label: OVER TIME
Icon: Shield (text-accent)
Title: Predictive
Description: Flags risks. Predicts delays. Identifies improvements you hadn't seen.
```

**Key Message (below timeline):**

```
[Styled as a quote/callout, italic, text-secondary, border-l-2 border-accent, pl-4]

"It notices the concrete delivery is scheduled the same day as the inspection. 
It flags that the electrical subcontractor hasn't confirmed next week's timeline. 
It sees the pattern that always leads to delays—before the delay happens."
```

**Animation:**
- Timeline stages reveal sequentially on scroll
- Connecting lines animate/draw between stages
- Quote fades in last

---

### SECTION 5: Value Shift (Before/After)

**Layout:**
- Two-column grid on desktop, stacked on mobile
- Left column muted/subdued, right column elevated

**Content:**

```
[Section Header - centered above columns]
Your Time, Reclaimed

[Left Column - Before]
Header: Without Proesphere (text-muted)
Background: bg-surface with lower opacity
Border: border-custom

Items (each with X icon, text-secondary):
- Switching between 5+ apps
- Manual status tracking
- Compiling reports by hand
- Chasing down updates
- Reactive firefighting

[Right Column - After]
Header: With Proesphere (text-accent)
Background: bg-surface
Border: border-accent/30

Items (each with Check icon, text-white):
- One interface for everything
- Automatic progress awareness
- Reports generated on demand
- Updates surfaced proactively
- Preventive problem-solving
```

**Supporting Statement:**

```
[Below columns, centered, text-lg, text-secondary, max-w-2xl]

When you're not hunting for information, you're free to do what 
actually moves projects forward: client communication, quality 
oversight, team leadership.
```

**Animation:**
- Columns slide in from left and right respectively
- Checkmarks animate in with a subtle bounce (only exception to no-bounce rule)

---

### SECTION 6: Trust & Credibility

**Layout:**
- Centered content
- Minimal decoration
- Subtle separator lines above and below

**Content Options (implement one):**

```
[Option A: Founder Credibility]
"Built by construction PMs who were tired of fighting their tools 
instead of finishing their projects."
— Founding Team, Proesphere

[Option B: Waitlist Social Proof]
[Large numbers, staggered]
400+ professionals on the waitlist
12 beta teams actively testing
3 enterprise pilots in progress
```

**Design Notes:**
- Keep brief — this is a trust moment, not a sales pitch
- If using numbers, consider animated count-up on scroll

---

### SECTION 7: Final CTA

**Layout:**
- Full-width section
- Background shift: slightly deeper or accent-tinted (e.g., `bg-bg-deep` with subtle accent gradient overlay)
- Generous padding (py-24 md:py-32)

**Content:**

```
[Headline - text-3xl md:text-4xl, font-bold, text-white]
Ready to stop managing your software?

[Subheadline - text-lg, text-secondary, mt-4]
Join the waitlist. Be first to experience AI that actually 
understands construction.

[Email Input + CTA Button - larger than hero version]
[Button text: "Get Early Access"]

[Reassurance - text-sm, text-muted, mt-4]
No credit card required. No commitment. Just early access.
```

**Animation:**
- Section fades in on scroll
- CTA button has persistent subtle glow

---

### SECTION 8: Footer

**Layout:**
- Minimal
- Single row on desktop, stacked on mobile
- Background: `--bg-deep`

**Content:**

```
[Logo: Proesphere - text or small SVG]

© 2025 Proesphere. All rights reserved.

[Links row: Privacy · Terms · Contact]
(text-sm, text-muted, hover:text-accent)
```

---

## 📱 RESPONSIVE BEHAVIOR

**Breakpoints (Tailwind defaults):**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Mobile Adaptations:**
- Hero headline: `text-3xl` on mobile, scale up with breakpoints
- All multi-column layouts → single column stacked
- Horizontal timeline → vertical timeline
- Padding: `px-6` on mobile, increase at breakpoints
- Email + button: Stack vertically on mobile (`flex-col`)
- Touch targets: minimum 44px height

**Performance on Mobile:**
- Consider reduced-motion media query for animations
- Lazy load sections below the fold
- Optimize any images (next-gen formats, proper sizing)

---

## 🧩 COMPONENT STRUCTURE

Suggested file organization:

```
client/src/
├── pages/
│   └── landing/
│       ├── LandingPage.tsx        # Main page component
│       ├── components/
│       │   ├── Hero.tsx
│       │   ├── ProblemReframe.tsx
│       │   ├── HowItWorks.tsx
│       │   ├── IntelligenceEvolution.tsx
│       │   ├── ValueComparison.tsx
│       │   ├── TrustSection.tsx
│       │   ├── FinalCTA.tsx
│       │   └── Footer.tsx
│       ├── hooks/
│       │   └── useAnimations.ts   # GSAP animation hooks
│       └── styles/
│           └── landing.css        # Any custom CSS if needed
```

**Shared Components (reuse from shadcn/ui):**
- Button (customize variants for landing page CTAs)
- Input (customize for email input styling)

---

## ✅ QUALITY CHECKLIST

Before considering complete, verify:

- [ ] Colors match exact brand palette (no approximations)
- [ ] No orphaned headings (single word on last line)
- [ ] Consistent spacing rhythm throughout (8px grid)
- [ ] All text is readable (contrast ratio 4.5:1 minimum)
- [ ] Animations are smooth at 60fps
- [ ] Page loads fast (<3s on 3G)
- [ ] Works perfectly on iPhone SE (375px) through 4K displays
- [ ] Focus states visible for keyboard navigation
- [ ] No horizontal scroll at any breakpoint
- [ ] CTA buttons stand out clearly in every section
- [ ] GSAP animations respect `prefers-reduced-motion`
- [ ] Email form has proper validation states
- [ ] All interactive elements have hover states
- [ ] Overall impression: calm, confident, premium

---

## 🚀 IMPLEMENTATION PRIORITY

1. **First:** Hero section (this is what investors see first)
2. **Second:** How It Works + Intelligence Evolution (core value prop)
3. **Third:** Final CTA (conversion point)
4. **Fourth:** Problem Reframe + Value Shift (supporting narrative)
5. **Fifth:** Trust section + Footer (polish)
6. **Last:** Animation refinement pass

---

## 💡 ADDITIONAL NOTES

**Typography:**
- Use Inter (likely already in the project via shadcn) or system fonts
- Headlines: font-bold (700)
- Body: font-normal (400)
- Consider slight letter-spacing on uppercase labels

**If showing UI previews:**
- Use subtle, cropped glimpses — never a busy full screenshot
- Consider abstract representations or illustrations instead

**Favicon & Meta:**
- Ensure proper `<title>` and meta description
- Add Open Graph tags for social sharing
- Favicon should be set

**Form Handling:**
- Email validation (client-side)
- Loading state on submit
- Success state with confirmation message
- Error handling for failed submissions
- Consider connecting to an actual waitlist service (e.g., API endpoint, Mailchimp, etc.)

---

## 🎯 FINAL REMINDER

This landing page represents Proesphere to potential investors and early adopters. The goal is to communicate:

1. **Clarity** — Instantly understandable value proposition
2. **Confidence** — Premium design that signals a serious product
3. **Simplicity** — The page itself should embody the product's philosophy

When in doubt, remove rather than add. Restraint is the ultimate sophistication.
