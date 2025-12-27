\#\# Task: Refactor RBAC Module to Native Mobile UI Pattern

\#\#\# Context  
The RBAC Administration module needs a mobile-first redesign. The codebase already has the color palette and component structure. Transform the current web-style layout into a native mobile app experience.

\#\#\# Design Requirements

\*\*1. Layout Structure\*\*  
\- Sticky header with compact title row (icon \+ title inline, not stacked)  
\- iOS-style segmented control for tabs (Users / Roles / Permissions)  
\- Bottom navigation bar with 4 tabs (Home, Projects, Tasks, Admin)  
\- Respect safe areas: top notch zone, bottom home indicator

\*\*2. User List Pattern\*\*  
\- Collapsible company sections (tap header to expand/collapse)  
\- Chevron rotation animation on expand (180° transform)  
\- User rows with:  
  \- Circular avatar with initials (not generic icon)  
  \- Name \+ status dot (tiny 8px circle, green=active, gray=inactive)  
  \- Role badge (compact, muted background)  
  \- Right chevron indicating drill-down  
  \- Swipe-to-reveal actions (Edit blue, Delete red) OR kebab menu

\*\*3. Touch Targets\*\*  
\- Minimum 44px height for all tappable elements  
\- Adequate padding between interactive elements (no accidental taps)

\*\*4. Component Specifications\*\*  
\`\`\`  
Header height: 56px (excluding status bar)  
Segmented control: 40px height, 8px padding, 12px border-radius  
User row: 64-72px height  
Bottom nav: 56px \+ safe area padding  
Card border-radius: 16px (2xl)  
Avatar size: 40px  
\`\`\`

\#\#\# Implementation Steps

1\. \*\*Locate files\*\*: Find the RBAC component files in the codebase  
2\. \*\*Audit current layout\*\*: Identify elements that need mobile optimization  
3\. \*\*Refactor header\*\*: Condense to single-row layout with inline icon \+ title  
4\. \*\*Implement segmented control\*\*: Replace current tab buttons with iOS-style segmented control  
5\. \*\*Restructure user list\*\*:   
   \- Wrap companies in collapsible accordions  
   \- Refactor user rows to horizontal layout with avatar/info/status/chevron  
6\. \*\*Add bottom navigation\*\*: Create fixed bottom nav component  
7\. \*\*Add swipe actions OR dropdown menu\*\*: Choose pattern that fits existing codebase  
8\. \*\*Test touch targets\*\*: Verify all interactive elements meet 44px minimum

\#\#\# Files to Modify (likely paths)  
\- \`src/components/RBAC/\` or \`src/modules/admin/\`  
\- \`src/components/Navigation/BottomNav\` (create if needed)  
\- \`src/components/common/SegmentedControl\` (create if needed)

\#\#\# Deliverables  
1\. Refactored RBAC component with native mobile patterns  
2\. Reusable SegmentedControl component  
3\. Reusable BottomNavigation component (if not exists)  
4\. Summary of all changes made

\#\#\# Reference  
The target UI follows iOS Human Interface Guidelines patterns:  
\- Collapsible sections with chevron indicators  
\- Segmented controls for in-context filtering  
\- Swipe gestures for destructive/edit actions  
\- Tab bar navigation for primary app sections

Do NOT change the existing color palette. Use the current theme variables.

