# Proesphere Work Module Design Guidelines

## Design Approach: Enterprise Design System

**Rationale**: Construction management platform prioritizing data density, workflow efficiency, and professional aesthetics. Drawing inspiration from Linear (clean information architecture), Asana (task management patterns), and Monday.com (visual hierarchy in complex data).

## Typography System

**Font Stack**: Inter (Google Fonts) for clean, professional readability at all sizes
- **Module Headers**: 28px/bold - "Work", "Projects", "Tasks"
- **Section Headers**: 20px/semibold - Status groups, List headers
- **Card Titles**: 16px/semibold - Project names, Task titles
- **Body Content**: 15px/regular - Descriptions, metadata
- **Labels/Meta**: 13px/medium - Tags, timestamps, assignees
- **Captions**: 12px/regular - Helper text, counts

## Layout System

**Spacing Primitives**: Use Tailwind units of 3, 4, 6, 8, 12, 16, 24
- Standard card padding: p-6
- Section gaps: gap-6
- Component spacing: space-y-4
- Touch target padding: p-3 (minimum 48px total)
- Module margins: p-8
- Grid gaps: gap-4

**Container Structure**: 
- Full-width module: w-full with max-w-screen-2xl mx-auto
- Content sections: px-8 py-6
- Card grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

## Core Layout Architecture

**Module Header** (sticky top-0):
- Left: "Work" title with breadcrumb trail
- Center: Segmented control (Projects | Tasks) - 400px width, rounded-full, 48px height
- Right: View toggles (Grid/List/Kanban icons), Filter button, Create button (primary action)
- Background: Subtle elevation with bottom border

**Segmented Navigation Component**:
- Pill-style selector with smooth indicator transition
- Each segment: px-8, 48px height, rounded-full
- Active state: Filled background, semibold text
- Inactive: Transparent, medium weight
- Equal width segments for balance

**Primary Content Area**:

### Projects View (Default Grid):
**Project Cards** (rounded-xl, elevation shadow, p-6):
- Header: Project name (16px/semibold) + Status badge (right-aligned pill)
- Progress bar: 8px height, rounded-full, spans full width below header
- Stats row: 4-column grid showing Tasks (with count), Team (avatars stack), Due date (with icon), Budget percentage
- Footer: Tags (rounded-full pills, gap-2) + Quick actions menu (kebab icon, 48x48 tap target)
- Hover state: Subtle lift effect

**Stats Configuration**:
- Each stat: Icon (20px) + Label (13px) + Value (15px/semibold)
- Icon colors differentiate stat types (no color specification, but note distinct visual treatment)

### Tasks View (Kanban Board):
**Column Structure** (flex horizontal scroll on tablet):
- Minimum column width: 340px
- Column header: Status name + Count badge + Add task button (compact, 40x40)
- Column content: Stack of task cards with gap-3

**Task Cards** (rounded-lg, p-4):
- Checkbox (24x24) + Task title (multi-line support)
- Project tag (small pill) + Priority indicator (dot, 8px)
- Metadata row: Assignee avatar (32px) + Due date + Attachment count
- Drag handle: Left edge, 40px height, subtle indicator

**List View Alternative**:
- Compact rows (56px height minimum)
- Columns: Checkbox, Title, Project, Assignee, Status, Priority, Due Date, Actions
- Sticky header row
- Zebra striping for row differentiation
- Expandable rows for task details (accordion pattern)

## Component Library

**Navigation Pills/Badges**:
- Status badges: 6px height, uppercase 11px text, px-3, rounded-full
- Tags: Regular case, 13px, px-3 py-1, rounded-full
- Count badges: Circular, 24px diameter, 12px text, bold

**Action Components**:
- Primary buttons: 48px height, px-6, rounded-lg, semibold 15px
- Icon buttons: 48x48, rounded-lg, centered icon 20px
- Dropdown triggers: Combine text + chevron, 48px height

**Filter Panel** (slide-in from right):
- 400px width on tablet
- Sections: Date range, Status, Assignee, Priority, Tags
- Each filter: Checkbox list with counts
- Footer: Clear all + Apply (sticky bottom)

**Data Visualization**:
- Progress bars: 8px height, rounded-full, track + fill pattern
- Avatar stacks: 32px circles, -ml-2 overlap, max 3 visible + "+N" counter
- Timeline indicators: Vertical line with date nodes for milestones

**Empty States**:
- Centered illustration placeholder (200x160)
- Title (20px/semibold) + Description (15px/regular)
- Primary action button
- Subtle background pattern for depth

## Touch Optimization

**Interaction Zones**:
- All clickable elements: Minimum 48x48px actual tap area
- Card tap targets: Entire card clickable for navigation
- Icon-only buttons: 48x48 with centered 20-24px icon
- Toggle switches: 24px height, 44px width, 48px tap area with padding
- Dropdown items: 48px height minimum

**Visual Feedback**:
- Pressed state: Subtle scale (0.98) + opacity (0.7)
- Loading states: Skeleton screens maintaining layout structure
- Success feedback: Checkmark animation in toast (top-right, 4s duration)

## Responsive Behavior

**Tablet Landscape (1024px+)**:
- 3-column project grid
- Full Kanban board horizontal scroll
- Side-by-side filter panel

**Tablet Portrait (768px)**:
- 2-column project grid
- Kanban columns reduce to 2 visible, scroll for more
- Filter panel overlays full screen

## Accessibility & Interaction

- Keyboard navigation: Tab order follows visual hierarchy
- Focus indicators: 3px offset ring on all interactive elements
- ARIA labels on icon-only buttons
- Screen reader announcements for status changes
- Touch gestures: Swipe to reveal card actions, long-press for quick menu

## Images Section

**No hero image** - This is an application module, not a marketing page.

**Supporting Imagery**:
- **Empty state illustrations**: Custom construction-themed icons (blueprint, hard hat, crane) at 200x160px, centered in empty project/task lists
- **Project thumbnails**: 16:9 aspect ratio thumbnail in project card header, 120x68px, rounded corners, optional
- **Avatar images**: Team member photos, 32px circular, required for assignee displays

**Construction Theme Visual Elements**:
- Blueprint grid patterns as subtle backgrounds
- Construction-related iconography for status indicators (hammer for in progress, checkmark for complete, clock for pending)
- Safety-orange accent treatment for critical items (not specifying color, but note distinct visual priority)