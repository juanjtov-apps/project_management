Build a production ready marketing landing page for Proesphere that tells a clear story and uses GSAP for scroll driven animations. Keep the existing color palette exactly as it is. Do not introduce new brand colors. Reuse existing CSS variables, Tailwind config, or theme tokens already present. 

Goal  
Create a single landing page that communicates the problem, the solution, and the AI killer feature in a narrative flow. The page should feel calm, modern, and premium. The story is about turning construction from reactive chaos into predictable execution, with an AI project brain that predicts risk before it becomes expensive.

Tech requirements  
 Use GSAP with ScrollTrigger for scroll based animations.  
 Use best practices for performance, including prefers reduced motion support and avoiding jank.  
 Animations must be subtle, smooth, and purposeful, never gimmicky.  
 No heavy video backgrounds.  
 No external design libraries unless already in the repo.  
 Use semantic HTML, accessible contrast, keyboard navigable CTAs, and meaningful headings.

Page structure and copy requirements  
Implement the following sections in this order. Write concise, high clarity copy that matches the voice of a serious B2B product. Avoid buzzwords. Focus on outcomes, clarity, and control.

1. Sticky Hero  
    Headline that reframes the problem as a system problem.  
    Example direction, rewrite as needed: “Construction fails in slow motion. Proesphere keeps it on track.”  
    Subheadline: “A single operating system for the job, connected to the timeline, photos, decisions, and client inputs.”  
    Primary CTA: “Request a demo”  
    Secondary CTA: “See how it works”  
    Hero visual: a clean timeline or dashboard mock style built with simple UI blocks, not an image. It can be a stylized component with cards and a timeline line.  
    GSAP animation: hero elements fade and slide in on load. Then, on scroll, the hero visual subtly transitions from fragmented to aligned to symbolize coordination debt being removed.

2. Act 1, The hidden enemy is coordination debt  
    Three pain cards with short copy:  
    Scattered communication  
    Late selections and approvals  
    No single source of truth  
    Include a simple visual motif: messages, photos, and tasks floating disconnected.  
    GSAP animation: cards appear sequentially with ScrollTrigger. Floating elements drift slightly. On section end, they converge into a single aligned stack.

3. Act 2, Proesphere is the operating system for the project  
    Show a split layout.  
    Left: “Living timeline” with stages connected to tasks, required inputs, and photos.  
    Right: “Documentation in context” showing a photo update tied to a stage and decision.  
    Include a short list of what becomes predictable:  
    What is next  
    What is blocked  
    What the client owes  
    What is ready to build  
    GSAP animation: a vertical timeline line draws as you scroll. Cards snap into place with gentle motion. Use pinning lightly for clarity.

4. Act 3, The AI killer feature, the AI project brain  
    This is the emotional peak.  
    Explain in plain language that the AI predicts risk before humans notice.  
    Show a scenario:  
    AI detects selection delay that will hit the critical path in two weeks  
    AI prompts the client now with exactly what to choose  
    AI updates the PM view with the impact and recommended next action  
    The copy should emphasize foresight and prevention.  
    GSAP animation: a risk indicator appears, then a “recommended action” card, then a “schedule impact prevented” state. Use a simple progression triggered by scroll.

5. Outcomes and trust  
    Show 3 to 5 outcome tiles:  
    Fewer surprises  
    Fewer delays  
    Cleaner change orders  
    Less rework  
    A calmer client experience  
    Add a small testimonial style quote section with 2 quotes, no company logos needed.  
    GSAP animation: subtle fade up only.

6. Final CTA  
    Reinforce the promise of control and predictability.  
    Primary CTA repeated.  
    Include lightweight footer with links placeholders.

Design requirements  
 Use the existing palette and typography system.  
 Spacing should be generous, modern, and minimal.  
 Use cards with soft borders and subtle shadows if consistent with existing style.  
 Avoid gradients unless the current brand uses them.  
 Do not use any bright neon or new accent colors.

Implementation requirements  
 Create or modify only what is necessary.  
 If the app uses React or Next.js, implement as a page component with modular sections.  
 If it uses plain HTML, implement as a single HTML page with separate CSS and JS files.  
 Place GSAP logic in a dedicated module or hook.  
 Add a reduced motion path: if prefers reduced motion is on, disable scroll animations and use simple fades only or none.  
 Make sure ScrollTrigger is registered correctly and cleaned up on unmount if using React.  
 Make sure the page is responsive for desktop and mobile.

Deliverables  
 Provide the exact files and code needed.  
 If React, create components for each section.  
 If plain HTML, output index.html, styles.css, and landing.js.  
 Include any required installation steps for GSAP, but do not change package versions unless needed.  
 Keep everything consistent with the current project structure and lint rules.

Acceptance checklist  
 The story reads clearly in one scroll.  
 The AI section feels like a reveal and makes immediate sense.  
 Animations are smooth, subtle, and do not distract.  
 Reduced motion works.  
 Palette is unchanged and consistent with the existing app.  
 CTAs are visible and repeated at least twice.

Now implement it.

