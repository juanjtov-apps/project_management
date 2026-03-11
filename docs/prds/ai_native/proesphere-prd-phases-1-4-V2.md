  
**PROESPHERE**

AI-NATIVE TRANSFORMATION

*PRD Lite — Phases 1 · 2 · 3 · 4*

*The Now · For Claude Code*

## **Document Purpose**

This PRD Lite is designed to be consumed directly by Claude Code. Each phase is a self-contained sprint with precise component specs, file locations, behavior contracts, and acceptance criteria.

| Platform | Proesphere — B2B Construction PM |
| :---- | :---- |
| **Stack** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Design Ref** | proesphere-v5.html (final approved mockup) |
| **AI Model** | Claude API — claude-sonnet-4-20250514 |
| **Repo** | juanjtov-apps/project\_management |
| **Horizon** | The Now (Phases 1–4 of AI-Native roadmap) |

| ⚠ Critical Design Constraint The approved mockup (proesphere-v5.html) defines the exact visual language for both the landing page AND the post-login application. All components must match the pro-\* design token palette, typography, surface layers, and animation language. The platform palette documented in Section 1.4 is the single source of truth. Do not deviate without explicit approval. |
| :---- |

# **Core Interaction Model — How Proesphere Works**

| ✨ The Product Promise After signing in, the user lands on a conversation-first dashboard. The hero animation in proesphere-v5.html IS the product — it demonstrates the exact interaction loop users experience. Understanding this loop is prerequisite context for every phase below. |
| :---- |

### **The Three-Frame Loop**

Every interaction in Proesphere follows a single pattern, whether triggered by voice, text, chip click, job card tap, or document drop:

**Frame 1 — Intent Capture:** User speaks or types a natural language command. Example: "Delay the foundation pour at Riverdale by two days due to rain. Notify the sub." The system shows a voice orb with animated waveform bars and an "Analyzing intent…" status while processing.

**Frame 2 — Proe Confirms:** Proe responds with a rich confirmation message. It includes: (a) a natural language summary of what was done, (b) structured workflow tags (PROJECT: Riverdale / SUB: Apex Builders / DELAY: \+2 days), and (c) a confirmation card with full detail and a "✓ Done" indicator.

**Frame 3 — Cascade Execution:** A 2×2 grid of completed actions appears: schedule updated, sub notified via magic link, client portal updated with delay notice, and AI suggests related actions (e.g., 2 more weather-risk tasks). Footer reads "3 actions · 4 seconds." This communicates that one voice command triggers multiple platform operations automatically.

| Why This Matters for Implementation The cascade is NOT optional decoration. It is the core differentiator — a single natural-language input triggers multiple coordinated platform operations (schedule changes, notifications, portal updates, AI suggestions) and shows the user a real-time feed of what happened. Every phase builds toward this loop being fully functional. |
| :---- |

# **Roadmap Overview — The Now**

Four phases executed in sequence. Each builds on the previous. Phase 1 restructures the dashboard shell. Phase 2 installs Proe as the conversational core with cascade actions. Phase 3 adds voice and NLP as the primary input method. Phase 4 builds the landing page matching the v5 mockup.

| \# | Name | Core Deliverable | Effort | Depends On |
| :---- | :---- | :---- | :---- | :---- |
| **1** | Dashboard Restructure | New layout: sidebar \+ center (briefing \+ chat) \+ right jobs panel. Replaces current dashboard shell. | 3–4 days | None |
| **2** | Proe Conversational Core \+ Cascade | Claude API integration in center panel. Streaming responses, action buttons, document drop parsing, AND cascade multi-action execution grid. | 5–7 days | Phase 1 |
| **3** | Voice \+ NLP Input | Mic button triggers cinematic voice overlay. Web Speech API \+ fallback. Sends to Proe on completion. | 2–3 days | Phase 2 |
| **4** | Landing Page (v5) | Full marketing landing page matching proesphere-v5.html. Tablet demo with 3-frame animation, sections, pricing, testimonials. | 3–4 days | None (parallel) |

# **PHASE 1 — Dashboard Restructure**

*Replace the current dashboard shell with the approved conversation-first layout.*

## **1.1 Objective**

The current dashboard is a traditional project management layout. Phase 1 replaces the entire shell with the approved conversation-first architecture — sidebar \+ center column (morning briefing above, Proe chat below) \+ right context panel (active jobs). The visual design is fully defined in the reference mockup.

## **1.2 Layout Architecture**

| Layout Rule The layout is a fixed viewport (no page scroll). Three vertical columns. Topbar is fixed 46px. Everything else fills 100vh minus topbar. Internal columns scroll independently. |
| :---- |

┌──────────────────────────────────────────────────┐

│ TOPBAR 46px · logo \+ wordmark \+ bell \+ avatar     │

├────┬──────────────────────┬─────────────────────┤

│ S  │ MORNING BRIEFING      │ ACTIVE JOBS          │

│ I  │ Tag · Timestamp       │ Context Panel 340px  │

│ D  │ Headline \+ Chips      │ Scrollable           │

│ E  ├──────────────────────┤ Job cards w/ AI      │

│ B  │ ZONE SEPARATOR 36px   │ insight \+ progress   │

│ A  ├──────────────────────┤                      │

│ R  │ PROE HEADER \+ MSGS    │                      │

│    │ INPUT ZONE (fixed)    │                      │

└────┴──────────────────────┴─────────────────────┘

## **1.3 Component Specifications**

### **1.3.1 Topbar**

| Height | 46px, fixed, z-index: 100 |
| :---- | :---- |
| **Background** | pro-surface (\#161B22) |
| **Border** | 1px solid pro-border (\#2D333B) |
| **Logo gem** | 24×24px, border-radius 7px, pro-mint-dim bg, gem-dot with glow animation |
| **Wordmark** | PROE in pro-text-primary, sphere in pro-mint. Fades in when sidebar hovered. |
| **Right slot** | Bell 30×30px \+ notification pip \+ Avatar 30×30px circular. |

### **1.3.2 Sidebar — Hover Expand**

| Collapsed width | 52px (icon-only) |
| :---- | :---- |
| **Expanded width** | 220px (hover-triggered) |
| **Transition** | width \+ min-width: 0.28s cubic-bezier(0.25,1,0.5,1) |
| **Expand trigger** | CSS :hover on .sidebar element |
| **Shadow on expand** | 4px 0 30px rgba(0,0,0,0.35) |
| **Active item** | pro-mint-dim bg \+ 2px left accent bar with mint glow |
| **Labels/badges** | opacity: 0 collapsed → opacity: 1 on hover with 0.08s delay |
| **Section labels** | Mono 8.5px uppercase 0.14em tracking, pro-text-secondary |
| **Job dot colors** | On track: pro-mint. At risk: pro-orange. Delayed: pro-red |

### **1.3.3 Morning Briefing**

| Background | pro-surface (\#161B22) — distinct from main bg |
| :---- | :---- |
| **Radial glow** | ::before — radial gradient mint 5.5% → transparent, 420×120px, top-center |
| **Bottom fade** | ::after — 32px gradient from transparent → pro-bg-deep, pointer-events none |
| **Tag pill** | Mono 8.5px mint text, pro-surface-highlight bg, pro-border border, 3px radius |
| **Live dot** | 4×4px circle, pro-mint fill, glow pulse 2s infinite |
| **Headline** | Serif italic, 300 weight, clamp(16px,1.6vw,20px), pro-text-primary |
| **Highlight spans** | .hl → pro-mint \+ font-style normal \+ weight 500 |
| **Action chips** | border-radius 20px, font-size 11.5px, 2 variants: muted \+ mint active |

### **1.3.4 Zone Separator**

| Height | 36px |
| :---- | :---- |
| **Background** | linear-gradient(180deg, pro-surface 0%, pro-bg-deep 100%) |
| **Hairline** | ::before — 1px height, mint-fading gradient |
| **Label** | "CONVERSATION" — Mono 8px 0.16em tracking uppercase pro-text-secondary |

### **1.3.5 Proe Header**

| Height | Auto, padding 9px 24px |
| :---- | :---- |
| **Background** | pro-bg-deep — explicitly darker than briefing zone |
| **Border** | 1px solid pro-border bottom only |
| **Spark icon** | "✦" character, pro-mint, font-size 15px, text-shadow 0 0 10px pro-mint |
| **Active indicator** | Mono 9px uppercase, pro-mint, flex row with 5px live-dot |

### **1.3.6 Message Area**

| Max height | 280px |
| :---- | :---- |
| **Overflow** | overflow-y: auto, overflow-x: hidden |
| **Background** | pro-bg-deep |
| **Proe bubble** | pro-surface bg, 1px pro-border, border-top-left-radius 3px, 12.5px |
| **User bubble** | pro-mint-dim bg at 7% opacity, border pro-mint at 12%, align-self: flex-end |
| **Action buttons** | Two-button row: primary (pro-mint bg) \+ secondary (pro-surface-highlight bg) |
| **Cascade grid** | 2×2 grid of completed actions (Phase 2 feature, rendered here) |
| **Typing indicator** | 3-dot bounce, pro-mint color, fades in before Proe reply |
| **Scrollbar** | width: 3px, thumb: pro-surface-highlight |

### **1.3.7 Input Zone**

| Background | pro-bg-deep with top gradient overlay |
| :---- | :---- |
| **Doc drop zone** | 1.5px dashed pro-border, radius 8px, hover: pro-mint border \+ mint-dim bg |
| **Text field** | pro-surface bg, radius 14px, 1px pro-border, focus: pro-mint border \+ glow ring |
| **Mic button** | 50×50px, radius 14px, pro-surface bg. Active: pro-mint bg \+ pulse animation |
| **Send button** | 50×50px, radius 14px, pro-mint bg. Hover: scale(1.04) \+ mint shadow |
| **Placeholder** | pro-text-secondary, text: "Tell Proe anything..." |

### **1.3.8 Right Panel — Active Jobs**

| Width | 340px, fixed, min-width 340px |
| :---- | :---- |
| **Background** | pro-surface (\#161B22) |
| **Border** | 1px solid pro-border left only |
| **Section header** | Mono 9px uppercase pro-text-secondary \+ "View all →" in pro-mint |
| **Job card** | pro-bg-deep bg, 1px pro-border, radius 9px, hover: mint border \+ translateX(2px) |
| **Status colors** | On track: pro-mint. At risk: pro-orange. Delayed: pro-red |
| **Percentage** | Serif 17px weight 300, color by status |
| **Progress bar** | 2px height, pro-surface-highlight bg, colored fill by status |
| **AI insight** | pro-surface bg box, 7.5px "AI" label in pro-mint, insight text 10.5px |

## **1.4 CSS Design Tokens — Platform Palette**

This is the single source of truth. Paste into globals.css. All components reference these tokens — no hardcoded hex values in components.

### **Core Dark Mode (pro-\*)**

| pro-bg-deep | \#0F1115 — Deepest background |
| :---- | :---- |
| **pro-surface** | \#161B22 — Card/panel surfaces |
| **pro-surface-highlight** | \#1F242C — Hover/highlighted surfaces |
| **pro-mint** | \#4ADE80 — Primary accent (green) |
| **pro-mint-dim** | \#22C55E — Dimmed mint variant |
| **pro-orange** | \#F97316 — Warning / secondary accent |
| **pro-red** | \#EF4444 — Danger / destructive |
| **pro-text-primary** | \#FFFFFF — Primary text |
| **pro-text-secondary** | \#9CA3AF — Muted text |
| **pro-border** | \#2D333B — Borders |

### **Mint Scale**

mint-50: \#F0FDF4  mint-100: \#DCFCE7  mint-200: \#BBF7D0

mint-300: \#86EFAC  mint-400: \#4ADE80  mint-500: \#22C55E

mint-600: \#16A34A  mint-700: \#15803D  mint-800: \#166534  mint-900: \#14532D

### **Brand Aliases**

| brand-blue | \#0F1115 (same as bg-deep) |
| :---- | :---- |
| **brand-teal** | \#4ADE80 (same as mint) |
| **brand-coral** | \#F97316 (same as orange) |
| **brand-grey** | \#9CA3AF |
| **brand-ink** | \#0F1115 |

### **Chart Colors**

1\. \#4ADE80 (mint)  2\. \#F97316 (orange)  3\. \#EF4444 (red)  4\. \#60A5FA (blue)  5\. \#A78BFA (purple)

### **Semantic Shortcuts**

bg: \#0F1115, surface: \#161B22, text: \#FFFFFF, success: \#4ADE80, warning: \#F97316, danger: \#EF4444

## **1.5 File Structure**

src/

  components/

    layout/

      Topbar.tsx         // logo \+ wordmark \+ bell \+ avatar

      Sidebar.tsx        // hover-expand nav \+ active jobs list

      RightPanel.tsx     // active jobs context panel

    dashboard/

      MorningBriefing.tsx  // briefing tag \+ headline \+ chips

      ZoneSeparator.tsx    // gradient divider

      ProeHeader.tsx       // ✦ Proe · Active row

      MessageArea.tsx      // message list \+ typing \+ cascade grid

      InputZone.tsx        // drop zone \+ field \+ mic \+ send

      CascadeGrid.tsx      // 2×2 completed actions (Phase 2\)

  pages/

    Dashboard.tsx          // assembles all layout components

  styles/

    globals.css            // design tokens (pro-\* palette)

## **1.6 Acceptance Criteria**

* Layout renders at 1280px+ with all three columns visible simultaneously

* Sidebar collapses to 52px with icons only; hover smoothly expands to 220px; labels/badges fade in

* Wordmark in topbar fades in/out in sync with sidebar hover state

* Morning briefing sits on pro-surface with visible separation from pro-bg-deep below

* Zone separator gradient transitions clearly with visible "CONVERSATION" label

* Message area does not exceed 280px height; overflows with internal scroll

* Mic button and Send button are both 50×50px and visually distinct

* Right panel is exactly 340px wide and does not compress the center column

* All color values match pro-\* design tokens — no hex values hardcoded in components

* Job card status uses pro-mint (on track), pro-orange (at risk), pro-red (delayed)

* Grain texture overlay (opacity 0.018) renders on full viewport via body::before

# **PHASE 2 — Proe Conversational Core \+ Cascade**

*Wire the chat interface to the Claude API with streaming, action buttons, document parsing, AND the multi-action cascade execution grid.*

## **2.1 Objective**

Connect the Proe chat interface built in Phase 1 to the Claude API. Every message — from chips, text input, sidebar nav, job card clicks — routes to a single conversation handler. Responses stream in real-time. Proe replies include structured action buttons AND cascade execution grids that show multiple coordinated platform operations completing in real-time.

## **2.2 Conversation Architecture**

| Design Principle There is one conversation. Not one per session — one persistent thread per user, with context window management handled server-side. Every action on the dashboard that triggers Proe appends to this single thread. The user never navigates to "a chat." The chat is always here. |
| :---- |

// Message flow (simplified)

User action → addMessage(role: "user", content: text)

  → POST /api/proe/message

  → Claude API streaming response

  → Append assistant message to thread

  → Parse structured actions \+ cascade from response

  → Render action buttons OR cascade grid

// Every entry point calls the same function:

sendToProe(text: string, context?: ProeContext)

## **2.3 API Integration**

### **2.3.1 Endpoint**

| Route | POST /api/proe/message |
| :---- | :---- |
| **Auth** | Session-based (existing Proesphere auth) |
| **Streaming** | Server-sent events (SSE) or fetch streaming |
| **Model** | claude-sonnet-4-20250514 |
| **Max tokens** | 1024 per response |
| **Temperature** | 0 — deterministic, action-oriented |

### **2.3.2 System Prompt**

| System Prompt You are Proe, the AI brain of Proesphere — a construction project management platform. You assist general contractors and project managers with their active jobs.  CONTEXT AVAILABLE TO YOU: \- Active projects: name, address, client, % complete, due date, status, AI insight \- Morning briefing: today’s priority issues ranked by urgency \- User profile: name, company, role  RESPONSE FORMAT: Keep responses short and actionable (2–4 sentences max).  When an action can be taken immediately, include a JSON block at the END of your response with an "actions" array (max 2 buttons) or a "cascade" array (for multi-step operations).  Action types: "confirm" (mint button), "secondary" (outlined), "destructive" (rare). Max 2 actions per response.  Cascade format: When a single command triggers multiple platform operations, return a "cascade" array instead of "actions": {"cascade": \[{"label": "Schedule updated", "detail": "Foundation pour → Mar 17", "icon": "📅", "status": "done"}, ...\], "cascade\_summary": "3 actions · 4 seconds"}  Never make up data. If you don’t have it, say so and ask. |
| :---- |

### **2.3.3 Context Injection**

const buildContext \= (projects, briefing, user) \=\> {

  const projectList \= projects.map(p \=\>

    \`- ${p.name} | ${p.status} | ${p.progress}% | Due ${p.dueDate}

      Client: ${p.client}

      AI Insight: ${p.aiInsight}\`

  ).join("\\n");

  return \`USER: ${user.name}, ${user.company}, ${user.role}

ACTIVE PROJECTS:\\n${projectList}

TODAY'S BRIEFING:\\n${briefing.headline}\`;

};

// Prepend as system message — NOT in message history

## **2.4 Component: MessageArea**

interface MessageAreaProps {

  messages: Message\[\];

  isStreaming: boolean;

  streamingContent: string;

  onActionClick: (payload: ActionPayload) \=\> void;

}

interface Message {

  id: string;

  role: "user" | "assistant";

  content: string;

  actions?: Action\[\];

  cascade?: CascadeItem\[\];

  cascadeSummary?: string;

  formFill?: FormFillData;

  timestamp: Date;

}

interface CascadeItem {

  label: string;

  detail: string;

  icon: string;

  status: "done" | "pending" | "suggested";

}

**Streaming behavior:**

* Typing indicator (3-dot bounce) appears immediately when Proe starts responding

* Replaced by streaming text as first tokens arrive

* Action buttons rendered only after full response is received and parsed

* Cascade grid rendered only after full response — items animate in staggered (0.15s each)

* Auto-scroll to bottom on each new token

* Max height 280px enforced with overflow-y: auto

## **2.5 Component: CascadeGrid**

New component introduced in Phase 2\. Renders the multi-action execution result as a 2×2 grid inside the message area.

### **CascadeGrid Specs**

| Layout | CSS Grid, grid-template-columns: 1fr 1fr, gap: 5px |
| :---- | :---- |
| **Item background** | pro-surface (\#161B22) |
| **Item border** | 1px solid pro-border |
| **Item radius** | 8px |
| **Item padding** | 8px 10px |
| **Icon container** | 22×22px, radius 5px, pro-mint-dim bg \+ border for "done", pro-surface-highlight for "suggested" |
| **Title** | 9.5px, weight 500, pro-text-primary at 75% |
| **Subtitle** | 8px, pro-text-secondary at 32%, line-height 1.35 |
| **Status indicator** | "✓" for done (pro-mint), "→" for suggested (pro-text-secondary) |
| **Animation** | Each item: opacity 0 → 1, staggered — 0.05s, 0.2s, 0.35s, 0.5s delay |
| **Footer** | Centered, Mono 8px, 0.15em tracking, uppercase, pro-mint — e.g., "3 actions · 4 seconds" |

| When Cascade vs Actions Simple confirmations ("Send reminder to Martinez?") use the 2-button action system. Multi-step operations ("Delay pour, notify sub, update portal") use the cascade grid. Proe determines which format to use based on the number of platform operations triggered. The frontend checks for "cascade" key first, then falls back to "actions". |
| :---- |

## **2.6 Component: InputZone**

interface InputZoneProps {

  onSend: (text: string) \=\> void;

  onDocumentDrop: (file: File) \=\> void;

  onVoiceTrigger: () \=\> void;

  disabled?: boolean;

}

**Document Drop behavior:**

* Accepts: PDF, PNG, JPG, JPEG only

* On drop: show loading state, convert to base64, send to Claude API with media type

* Claude parses the document and returns structured extraction \+ form fill suggestion

* Result rendered as FormFillCard inside the message thread

## **2.7 Action Button System**

| confirm | Primary action. pro-mint background, pro-bg-deep text. Bold label. Clicking executes payload. |
| :---- | :---- |
| **secondary** | Alternative action. pro-surface-highlight bg, pro-border, pro-text-primary. |
| **Confirmed state** | Both buttons replaced with single "✓ \[action\]" text in pro-mint. No revert. |
| **Max per message** | 2 buttons. More than 2 means break it up or use cascade. |

## **2.8 Workflow Tags**

When Proe confirms a multi-step operation, structured workflow tags appear between the message bubble and the cascade grid. These are metadata chips.

| Layout | Flex row, gap 4px, margin 0 14px 6px |
| :---- | :---- |
| **Tag height** | 17px |
| **Tag style** | pro-surface bg, 1px pro-border, Mono 7.5px, pro-text-secondary |
| **Tag value** | Bold, pro-text-primary at 70% |
| **Example** | PROJECT: Riverdale | SUB: Apex Builders | DELAY: \+2 days |

## **2.9 Entry Points — All Send to Proe**

| Text input (Enter/Send) | sendToProe(inputValue) |
| :---- | :---- |
| **Briefing action chip** | sendToProe(chip.query) — predefined query string per chip |
| **Sidebar nav item** | sendToProe(navItem.defaultQuery) — e.g., "Show me outstanding payments" |
| **Job card click** | sendToProe("Tell me about " \+ project.name, { projectId }) |
| **Voice overlay completion** | sendToProe(transcribedText) — fires after voice overlay auto-dismisses |
| **Document drop** | sendToProe("", { documentBase64, documentType }) — doc as context |

## **2.10 Acceptance Criteria**

* Text typed in InputZone and submitted appears as user bubble; Proe responds within 1.5s

* Streaming response renders token by token — no full-page re-render on each token

* Clicking a briefing chip sends the correct predefined query and renders Proe response

* Clicking a job card sends a context-aware query referencing that specific project

* Proe responses with actions render exactly 2 buttons (primary mint \+ secondary outlined)

* Clicking primary action replaces both buttons with confirmation text in pro-mint

* Proe responses with cascade render a 2×2 grid with staggered animation \+ summary footer

* Cascade items show "✓" for done and "→" for suggested actions

* Workflow tags render between message bubble and cascade grid when multi-step operations occur

* Dropping a PDF into the drop zone triggers document parsing and renders FormFillCard

* Message area auto-scrolls to latest message on each update

* Message area enforces 280px max height — scrolls internally when overflowing

* Error state: if API call fails, render "Something went wrong — tap to retry" in pro-text-secondary

# **PHASE 3 — Voice \+ NLP Input**

*Mic button triggers a cinematic voice overlay. Web Speech API captures input and sends to Proe.*

## **3.1 Objective**

Add voice as a first-class input method. The mic button (already rendered in Phase 1\) triggers a full-screen voice overlay: blurred backdrop, live waveform, serif italic transcription, and cinematic auto-send. Contractors can speak commands hands-free on job sites.

## **3.2 Voice Overlay Design**

| Design Rule — The Cinematic Moment The voice overlay is not a floating dialog. It takes over the full viewport with backdrop blur. The background dashboard is still visible but blurred and dark. The user’s full attention is on the waveform and transcription. This signals that the system is listening — not just a checkbox. |
| :---- |

### **3.2.1 Overlay Specs**

| Trigger | Mic button click in InputZone (from Phase 1\) |
| :---- | :---- |
| **Background** | rgba(15,17,21,0.90) with backdrop-filter: blur(20px) |
| **Entry animation** | opacity 0→1 (0.25s) \+ card translateY(14px)→0 \+ scale(0.98)→1 |
| **Exit animation** | Reverse — then send transcribed text to Proe 200ms after close |
| **Dismiss** | Escape key, Cancel button, or clicking overlay background |
| **Card width** | 520px max-width, 90vw on smaller screens |
| **Card radius** | border-radius 22px |
| **Card background** | pro-surface (\#161B22) |
| **Card border** | 1px solid pro-mint-dim at 12% opacity |
| **Card shadow** | 0 40px 80px rgba(0,0,0,0.6) |

### **3.2.2 Waveform**

| Bar count | 18 bars |
| :---- | :---- |
| **Bar width** | 3px each, border-radius 2px, pro-mint color |
| **Heights** | Symmetric bell curve: 10, 18, 30, 44, 38, 50, 42, 52, 48, 52, 42, 50, 38, 44, 30, 22, 14, 8px |
| **Idle state** | All bars 3px height, opacity 0.2, no animation |
| **Listening state** | waveAnim CSS animation: scaleY 0.35 → 1.0, 1s infinite, staggered 0.06s per bar |
| **CSS class toggle** | .listening class on overlay → enables waveform animation |

### **3.2.3 Transcription Display**

| Font | Serif, italic, 300 weight, 19px |
| :---- | :---- |
| **Color** | pro-text-primary |
| **Idle state** | "Tap the mic to start" — Mono 10px uppercase pro-text-secondary |
| **Listening state** | Live transcription updates. Interim text shows "..." suffix. |
| **Post-listen state** | Final text with blinking 2px cursor (pro-mint, 1s blink animation) |
| **Min height** | 48px (prevents layout shift) |

### **3.2.4 Suggested Phrases**

| Visibility | Shown before listening starts. Hidden when listening begins. |
| :---- | :---- |
| **Layout** | flex-wrap: wrap, justify-content: center, gap 6px |
| **Style** | Mono 10px, pro-surface bg, pro-border, radius 5px, pro-text-secondary |
| **Hover** | border-color pro-mint at 12%, color pro-mint, background pro-mint-dim at 7% |
| **Content** | What’s at risk today? / Harbor View plan / Outstanding payments / Client updates / Delay pour notify crew / Fill permit form |
| **Click behavior** | Calls simulateVoice(phraseText) — types out cinematically then auto-sends |

### **3.2.5 Controls Row**

| Cancel button | padding 9px 20px, pro-border, transparent bg, pro-text-secondary text |
| :---- | :---- |
| **Mic ring** | 58×58px circle, pro-surface bg, pro-mint border at 12%. Listening: pro-mint bg \+ micPulse animation |
| **Send button** | Hidden (opacity 0\) until transcription complete. Then fades in. |
| **Auto-send** | When phrase simulation finishes, auto-send fires after 700ms |

## **3.3 Web Speech API Implementation**

const SR \= window.SpeechRecognition || window.webkitSpeechRecognition;

if (SR) {

  const recognition \= new SR();

  recognition.continuous \= false;

  recognition.interimResults \= true;

  recognition.lang \= "en-US";

  recognition.onresult \= (event) \=\> {

    let interim \= "", final \= "";

    for (let i \= event.resultIndex; i \< event.results.length; i++) {

      const transcript \= event.results\[i\]\[0\].transcript;

      if (event.results\[i\].isFinal) final \+= transcript;

      else interim \+= transcript;

    }

    setTranscription(final || interim);

    setIsInterim(\!final);

  };

  recognition.onend \= () \=\> stopListening();

  recognition.onerror \= () \=\> runDemoFallback();

  recognition.start();

} else { runDemoFallback(); }

// simulateVoice — types out text char by char

const simulateVoice \= (text: string) \=\> {

  let i \= 0;

  const tick \= () \=\> {

    if (i \<= text.length) {

      setTranscription(text.slice(0, i)); i++;

      setTimeout(tick, 36 \+ Math.random() \* 20);

    } else {

      setIsListening(false);

      setTimeout(sendVoiceCommand, 700); // auto-send

    }

  };

  setTimeout(tick, 380);

};

## **3.4 State Machine**

type VoiceState \=

  | "closed"       // overlay hidden

  | "idle"         // overlay open, not listening

  | "listening"    // mic active, receiving input

  | "transcribed"  // text captured, awaiting send

  | "sending";     // dismissed, text in flight to Proe

// Transitions:

// closed → idle: mic button click

// idle → listening: mic ring tap OR phrase chip click

// listening → transcribed: stop tap OR SR onend

// transcribed → sending: Send button OR 700ms auto-send

// any → closed: Escape, Cancel, or scrim click

// sending → closed: auto (fires sendToProe then closes)

## **3.5 Acceptance Criteria**

* Mic button triggers voice overlay with backdrop blur in ≤100ms

* Overlay card animates in with translateY \+ scale entrance (visible motion)

* Waveform is flat/dim in idle state and animates symmetrically in listening state

* On browsers with Web Speech API: real transcription updates live in serif italic

* On browsers without Web Speech API: demo simulation runs automatically

* Suggested phrases type out cinematically char by char and auto-send after 700ms

* Send button appears only after transcription is complete

* Escape key closes overlay without sending regardless of state

* Final transcribed text appears as user message in Proe chat, indistinguishable from typed

* Clicking overlay background dismisses the overlay (same as Cancel)

* Mic ring shows pulse animation while listening; returns to idle on stop

# **PHASE 4 — Landing Page (v5)**

*Build the full marketing landing page matching proesphere-v5.html. This is the first thing prospects see before signing up.*

## **4.1 Objective**

Implement the complete landing page as defined in proesphere-v5.html. This page serves as the primary marketing and conversion surface. It is independent of the post-login dashboard (Phases 1–3) and can be built in parallel. The hero section contains a tablet mockup with the animated 3-frame demo that previews the exact Proe interaction loop users will experience after signing in.

## **4.2 Design System — Landing Page Tokens**

The landing page uses a slightly different token set than the platform app, optimized for marketing aesthetics. These are defined in proesphere-v5.html and should be extracted as landing page CSS variables.

| \--void | \#020604 — Deepest background (body) |
| :---- | :---- |
| **\--s1** | \#06100A — Section backgrounds |
| **\--s2** | \#0A1610 — Card backgrounds |
| **\--s3** | \#0F1D14 |
| **\--s4** | \#132118 |
| **\--mint** | \#00C278 — Primary accent |
| **\--mint-bright** | \#00D688 — Hover state |
| **\--ivory** | \#EDE8DF — Primary text |
| **\--iv80 through \--iv03** | Ivory at decreasing opacity tiers |
| **\--amber** | \#C49A5A — Warning accent |
| **\--rose** | \#E85A5A — Danger accent |
| **\--ff-serif** | Cormorant Garamond |
| **\--ff-sans** | Syne |
| **\--ff-mono** | JetBrains Mono |

## **4.3 Page Sections**

The landing page consists of the following sections, in order. Each section is fully defined in the HTML reference file.

### **4.3.1 Preloader**

| Type | Full-screen overlay with SVG logo draw animation |
| :---- | :---- |
| **Duration** | Logo draws in 1.1s, text fades in at 0.9s, dismisses at 700ms after load |
| **Text** | "Initializing Proesphere" — JetBrains Mono 10px |

### **4.3.2 Navigation**

| Position | Fixed, top: 0, z-index: 500 |
| :---- | :---- |
| **Padding** | 32px 56px default → 16px 56px on scroll |
| **Scroll state** | Background rgba(2,6,4,0.88) \+ backdrop-filter blur(28px) \+ bottom border |
| **Logo** | SVG shield \+ "Proesphere" wordmark |
| **Links** | Platform, AI, Pricing — centered absolute |
| **CTA** | "Get started →" button, mint bg, void text |

### **4.3.3 Hero**

| Height | 100vh, min-height 740px |
| :---- | :---- |
| **Eyebrow** | "Built for General Contractors" — JetBrains Mono 9px, mint |
| **Headline** | "Every project. Every crew. Fully under control." — Cormorant Garamond clamp(34px,3.8vw,54px) |
| **Subheadline** | 13.5px description, ivory at 48% opacity |
| **CTAs** | "Start for free" (mint solid) \+ "Watch demo" (ghost) |
| **Ambient** | Radial mint glow \+ grid pattern background |

### **4.3.4 Hero Tablet Demo**

This is the centerpiece. A 780px-wide tablet mockup showing the animated Proe interaction loop. It has:

* Top navbar: Logo dot \+ PROEsphere wordmark \+ bell notification \+ avatar

* Icon sidebar: 44px wide, 9 icon buttons with notification badges

* Main panel: Morning briefing (always visible) \+ conversation divider \+ animated frames

* Right panel: Active Jobs with 4 job cards, each with progress bar \+ AI insight

* Chat input: Drop zone hint \+ text field \+ mic button \+ send button

* Floating chips above tablet: 3 status indicators that fade in staggered

**The main panel cycles through 3 animated frames on a 9-second loop (starting at 1.2s delay):**

* Frame 1 (0–46%): Voice listening — orb with waveform bars \+ "Analyzing intent…" \+ italic quote of the command

* Frame 2 (46–90%): Proe confirms — confirmation message \+ workflow tags \+ confirmation card with "✓ Done"

* Frame 3 (90–100%): Cascade — 2×2 grid of completed actions \+ footer "3 actions · 4 seconds"

### **4.3.5 Marquee**

| Type | Infinite horizontal scroll of capability labels |
| :---- | :---- |
| **Items** | Project Management, Client Portal, AI Intelligence, Financial Control, Subcontractor Hub, Schedule Management, Live Reporting, Issue Tracking, Payment Milestones, Photo Hub |
| **Animation** | 30s linear infinite translateX(-50%) |
| **Separator** | 3px mint dots |

### **4.3.6 Statement / Problem Section**

| Layout | 2-column grid, 1200px max-width, 80px gap |
| :---- | :---- |
| **Left** | "The honest truth" tag \+ "Most contractors run exceptional sites. Chaotic offices." headline |
| **Right** | Problem description paragraph \+ 4 numbered pain points with hover reveal |
| **Background word** | "CONTROL" in 25vw serif, transparent with mint stroke at 3% |

### **4.3.7 Horizontal Scroll Features**

| Type | Sticky horizontal scroll (380vh outer, sticky inner) |
| :---- | :---- |
| **Cards** | 6 feature cards, 360px wide each |
| **Features** | Project Command Center, Branded Client Portal, Financial Intelligence, AI That Understands Your Business, Subcontractor Hub, Live Operations Dashboard |
| **Progress** | Bottom-left progress bar \+ "01 / 06" counter |

### **4.3.8 AI Section**

| Layout | 2-column grid: left text \+ right chat mockup |
| :---- | :---- |
| **Pills** | 4 AI capabilities: Natural language queries, Proactive risk detection, Automated client updates, Smart document parsing |
| **Chat mockup** | Interactive-looking chat showing a budget question \+ change order flow |

### **4.3.9 Gauges Section**

| Layout | 2-column: left text \+ right 2×2 gauge grid |
| :---- | :---- |
| **Gauges** | 76% Less admin time, 88% Fewer client calls, 60% Faster invoicing, 95% Would recommend |
| **Visual** | SVG donut charts with mint fill |

### **4.3.10 Testimonials**

| Layout | 3-column grid (1.35fr 1fr 1fr) |
| :---- | :---- |
| **Cards** | 3 testimonial cards with quote, name, role, company, 5-star rating |
| **Counter** | "340+ active contractors" |

### **4.3.11 Pricing**

| Layout | 3-column grid, 1100px max-width |
| :---- | :---- |
| **Tiers** | Starter ($49/mo, 3 projects), Professional ($149/mo, unlimited, featured), Enterprise (Custom) |
| **Professional badge** | "Most Popular" badge, mint border, gradient background |

### **4.3.12 Final CTA**

| Headline | "Run every project exactly as it deserves." |
| :---- | :---- |
| **CTAs** | "Start for free →" \+ "Book a 20-min demo" |
| **Note** | "14-day free trial · No credit card · Cancel anytime" |
| **Glow** | 900×440px radial mint glow centered |

### **4.3.13 Footer**

| Layout | 4-column grid: brand \+ Platform \+ Company \+ Resources |
| :---- | :---- |
| **Bottom** | Copyright \+ Privacy/Terms/Security links |

## **4.4 Interactive Elements**

* Custom cursor: 6px mint dot \+ 28px ring with lerp follow (desktop only)

* Scroll progress bar: 1px fixed top, mint gradient, tracks scroll position

* Scroll reveal: IntersectionObserver with 0.07 threshold, .rv class → .in class adds opacity/translateY

* Dashboard parallax: Mouse-tracking 3D tilt on the hero tablet (perspective 1800px)

* Smooth anchor scrolling: All \#href links scroll with behavior: smooth

## **4.5 File Structure**

src/

  pages/

    Landing.tsx              // main landing page

  components/

    landing/

      LandingNav.tsx          // fixed nav with scroll state

      Hero.tsx                // headline \+ CTAs \+ tablet demo

      TabletDemo.tsx          // animated 3-frame tablet mockup

      Marquee.tsx             // infinite scroll capabilities

      StatementSection.tsx     // problem/pain points

      FeatureScroll.tsx        // horizontal scroll feature cards

      AISection.tsx            // AI capabilities \+ chat mockup

      GaugesSection.tsx        // metrics with SVG donuts

      Testimonials.tsx         // customer quotes

      PricingSection.tsx       // 3-tier pricing

      FinalCTA.tsx             // conversion section

      LandingFooter.tsx        // footer grid

      CustomCursor.tsx         // dot \+ ring cursor

  styles/

    landing.css               // landing-specific tokens \+ styles

## **4.6 Acceptance Criteria**

* Preloader plays SVG draw animation and dismisses smoothly after page load

* Nav transitions to compact/blurred state on scroll past 60px

* Hero tablet renders at 780px wide with all 3 panels visible (icon sidebar \+ main \+ jobs)

* Tablet demo cycles through 3 frames on 9-second loop with smooth opacity transitions

* Frame 1 shows voice orb with animated waveform bars

* Frame 2 shows confirmation message with workflow tags

* Frame 3 shows cascade grid with staggered item animations

* Floating chips above tablet fade in staggered (1.3s, 1.6s, 1.9s)

* Horizontal scroll features track mouse/scroll correctly with progress indicator

* All scroll reveal animations trigger at 0.07 threshold with translateY(26px) entrance

* Pricing cards show hover lift with shadow; Professional card has mint border treatment

* Custom cursor follows mouse with lerp smoothing on desktop

* All responsive breakpoints work: 1100px (hide right panel), 720px (mobile layout)

* Page matches proesphere-v5.html pixel-for-pixel at 1440px viewport width

# **Appendix — Quick Reference for Claude Code**

## **A. What NOT to Change**

| Preserve These Exactly The following are finalized design decisions. Do not alter them when implementing these phases. |
| :---- |

* The pro-\* token palette is the single source of truth for the platform app

* Status colors: pro-mint (on track), pro-orange (at risk), pro-red (delayed)

* Landing page maintains its own token set (--void, \--mint \#00C278, \--ivory, etc.)

* Grain texture overlay on body::before at opacity 0.018

* Surface layer system: pro-bg-deep → pro-surface → pro-surface-highlight (never skip layers)

* Border system: pro-border for structural borders

## **B. Key Interaction Patterns**

* **Hover reveals:** Sidebar labels visible on hover. Job card accent bar on hover. Wordmark synced to sidebar hover.

* **Click to Proe:** Every clickable element sends to Proe. No navigation to new pages for data. Proe is always one tap away.

* **Animations:** gem (3s glow pulse), ambPulse (6s on ambient strip), rise (staggered 0.4s), micPulse (expanding ring), waveAnim (1s waveform bars).

* **Scrollbars:** Width 3px (2px mobile), thumb: pro-surface-highlight. Never visible on sidebar.

## **C. Phase Completion Checklist**

| \# | Task | Phase | Effort | Status |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Design tokens in globals.css (pro-\* palette) | 1 | 0.5d | ☐ |
| 2 | Topbar component with hover wordmark | 1 | 0.5d | ☐ |
| 3 | Sidebar with CSS hover expand | 1 | 0.5d | ☐ |
| 4 | MorningBriefing with headline \+ chips | 1 | 0.5d | ☐ |
| 5 | ZoneSeparator gradient divider | 1 | 0.25d | ☐ |
| 6 | ProeHeader \+ MessageArea (static) | 1 | 0.5d | ☐ |
| 7 | InputZone with mic \+ send buttons | 1 | 0.5d | ☐ |
| 8 | RightPanel with job cards | 1 | 0.5d | ☐ |
| 9 | Dashboard layout assembly | 1 | 0.5d | ☐ |
| 10 | Claude API route /api/proe/message | 2 | 1d | ☐ |
| 11 | System prompt \+ context injection | 2 | 0.5d | ☐ |
| 12 | Streaming response rendering | 2 | 1d | ☐ |
| 13 | Action button parsing \+ rendering | 2 | 0.5d | ☐ |
| 14 | CascadeGrid component | 2 | 1d | ☐ |
| 15 | Workflow tags rendering | 2 | 0.5d | ☐ |
| 16 | All entry points wired to sendToProe | 2 | 0.5d | ☐ |
| 17 | Document drop → base64 → Claude parse | 2 | 1d | ☐ |
| 18 | VoiceOverlay component \+ state machine | 3 | 1d | ☐ |
| 19 | Web Speech API integration | 3 | 0.5d | ☐ |
| 20 | Waveform animation (idle vs listening) | 3 | 0.5d | ☐ |
| 21 | Phrase simulation (simulateVoice) | 3 | 0.25d | ☐ |
| 22 | Auto-send after transcription complete | 3 | 0.25d | ☐ |
| 23 | Landing page nav \+ hero \+ tablet demo | 4 | 1.5d | ☐ |
| 24 | 3-frame animation loop in tablet | 4 | 1d | ☐ |
| 25 | All landing sections (statement→footer) | 4 | 1.5d | ☐ |
| 26 | Custom cursor \+ scroll reveal \+ parallax | 4 | 0.5d | ☐ |
| 27 | Responsive breakpoints (1100/720/640) | 4 | 0.5d | ☐ |

