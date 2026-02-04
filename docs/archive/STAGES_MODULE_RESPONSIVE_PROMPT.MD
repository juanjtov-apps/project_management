# Mobile UI/UX Audit & Optimization

Read /mnt/skills/public/frontend-design/SKILL.md first, then conduct a comprehensive mobile UI/UX audit of this application.

## Known Issues
- Cards are overflowing beyond the screen edges
- The X (close) button overlaps with the "Add Stage" button in the Project Stages modal
- General mobile responsiveness issues

## Audit Scope
Review ALL mobile views and components, checking for:

### Layout & Overflow
- Elements extending beyond viewport width
- Horizontal scrolling issues
- Cards/containers not respecting screen boundaries
- Padding/margin inconsistencies on small screens

### Touch & Interaction
- Touch targets too small (minimum 44x44px)
- Buttons too close together
- Adequate spacing between interactive elements
- Proper hit areas for mobile users

### Typography & Readability
- Font sizes appropriate for mobile (minimum 16px for body)
- Line heights and letter spacing
- Text truncation where needed

### Navigation & Modals
- Modal sizing and positioning on mobile
- Bottom sheet patterns where appropriate
- Safe area insets (notch/home indicator)
- Proper close button placement

### Responsive Patterns
- Breakpoint consistency
- Flex/grid layouts adapting properly
- Image and icon scaling

## Requirements
1. Document each issue found with file location
2. Apply mobile-first best practices
3. Use native mobile patterns (bottom sheets, full-width buttons, proper spacing)
4. Ensure consistent spacing system (8px grid)
5. Test at common breakpoints: 320px, 375px, 390px, 428px
6. Preserve all existing functionality - visual improvements only

## Output
After fixes, provide a summary of:
- Issues identified
- Changes made per component/file
- Any recommendations for future improvements