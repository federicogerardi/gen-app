# Accessibility & Quality Assurance Guide

**Version**: 1.0  
**Status**: READY FOR IMPLEMENTATION & TESTING  
**Target Audience**: Frontend Engineers, QA Agents  
**Standard**: WCAG 2.1 Level AA  
**Last Updated**: 2026-04-07

---

## Accessibility Compliance Checklist

### WCAG 2.1 Level AA Requirements

#### Perceivable

##### 1.4.3 Contrast (Minimum)
- [ ] **Normal text**: 4.5:1 contrast ratio
- [ ] **Large text** (18pt+ or 14pt bold+): 3:1 contrast ratio
- [ ] Check all text, buttons, links, form elements

**Implementation**:
```css
/* Good - 4.5:1 contrast */
.text-primary {
  color: #141414; /* Near black */
  background: #ffffff; /* White */
}

/* Bad - 2:1 contrast (fails AA) */
.text-secondary {
  color: #999999;
  background: #ffffff;
}
```

**Testing Tools**:
- WebAIM Contrast Checker
- Chrome DevTools "Issues" tab
- axe DevTools extension

##### 1.4.11 Non-text Contrast
- [ ] Icons, UI components: 3:1 contrast
- [ ] Focus indicators: 3:1 contrast against adjacent colors

**Implementation**:
```tsx
// Focus indicator (shadcn/ui does this by default)
button:focus-visible {
  outline: 2px solid #0084ff; /* High contrast */
  outline-offset: 2px;
}
```

#### Operable

##### 2.1.1 Keyboard
- [ ] All functionality available via keyboard
- [ ] Tab order is logical
- [ ] No keyboard traps (can always escape)
- [ ] Avoid keyboard-only content (alternative provided)

**Testing Checklist**:
- [ ] Tab through entire page
- [ ] Shift+Tab reverses direction
- [ ] Can activate all buttons/links with Enter/Space
- [ ] Can open/close modals with Escape
- [ ] Auto-focus on modals goes to first form field

**Implementation**:
```tsx
// Modal with proper focus management
<Dialog onOpenChange={setIsOpen}>
  <DialogContent onKeyDown={(e) => {
    if (e.key === 'Escape') setIsOpen(false);
  }}>
    <input autoFocus /> {/* Focus first field */}
  </DialogContent>
</Dialog>
```

##### 2.1.2 No Keyboard Trap
- [ ] Can escape from any element
- [ ] Escape key closes modals
- [ ] Tab focus always visible and movable

##### 2.4.3 Focus Order
- [ ] Focus order is meaningful (left-to-right, top-to-bottom)
- [ ] Important elements come before less important
- [ ] Form fields grouped logically

**Implementation**:
```tsx
// Use semantic HTML for correct focus order
<header>{/* Focused first */}</header>
<nav>{/* Focused second */}</nav>
<main>{/* Focused third */}</main>
<button>Second to last</button>
<footer>{/* Focused last */}</footer>
```

##### 2.4.7 Focus Visible
- [ ] Visible focus indicator on all interactive elements
- [ ] Indicator is always visible and sufficient size
- [ ] Not removed by developer CSS

**Tailwind + shadcn/ui Default**:
```css
/* Built-in focus ring */
button {
  @apply focus-visible:outline-none focus-visible:ring-2;
  @apply focus-visible:ring-offset-2 focus-visible:ring-blue-500;
}
```

#### Understandable

##### 3.2.4 Consistent Identification
- [ ] Same function, same appearance/behavior
- [ ] Generated buttons look like generated buttons
- [ ] Edit links look like edit links
- [ ] No surprise behaviors

**Implementation**:
```tsx
// Consistent button patterns
<Button variant="primary">Generate</Button> {/* All generation */}
<Button variant="secondary">Cancel</Button> {/* All cancellations */}
<Button variant="destructive">Delete</Button> {/* All deletions */}
```

##### 3.3.1 Error Identification
- [ ] Errors clearly identified to user
- [ ] Error messages specific (not "Error")
- [ ] Listed near problem location
- [ ] Associated with form field (for accessibility)

**Implementation**:
```tsx
// Error message tied to input
<div className="space-y-2">
  <label htmlFor="email">Email *</label>
  <input 
    id="email"
    aria-describedby="email-error"
    aria-invalid={hasError}
  />
  <span id="email-error" className="text-red-600">
    Please enter a valid email address
  </span>
</div>
```

##### 3.3.4 Error Prevention
- [ ] Confirm before destructive actions
- [ ] Check for legal formats
- [ ] Warn about changes

**Implementation**:
```tsx
// Confirmation before delete
const handleDelete = async (artifactId) => {
  const confirmed = await showConfirmDialog(
    "Delete artifact?",
    "This cannot be undone."
  );
  if (confirmed) {
    await deleteArtifact(artifactId);
  }
};
```

#### Robust

##### 4.1.2 Name, Role, Value
- [ ] All UI components have accessible name
- [ ] Role is properly identified
- [ ] States/properties are programmatically available

**Implementation (shadcn/ui defaults handle this)**:
```tsx
// Semantic HTML + ARIA labels
<button aria-label="Close dialog">✕</button>
<input role="textbox" aria-label="Project name" />
<div role="status" aria-live="polite">
  Processing... 45% complete
</div>
```

##### 4.1.3 Status Messages
- [ ] Status updates announced to screen readers
- [ ] No page reload required
- [ ] User notified of streaming progress

**Implementation**:
```tsx
// Live region for streaming updates
<div role="status" aria-live="polite" aria-atomic="true">
  {streamingTokens}
</div>

// Announce completion
<button onClick={() => {
  announce("Artifact generation complete");
}}>
  Generate
</button>
```

---

## Screen Reader Testing

### Required Tools
- **Windows**: NVDA (free) or JAWS
- **macOS**: VoiceOver (free, built-in)
- **Linux**: Orca (free)

### Test Scenarios

#### Scenario 1: Dashboard Navigation
```
Screen reader user:
1. Lands on dashboard
2. Hears "Website, dashboard, main landmark"
3. Hears all the headings (H1, H2, H3)
4. Can navigate projects via headings/landmarks
5. Can activate buttons and understand their purpose
```

**What to test**:
- [ ] Headings structure is logical (H1 → H2 → H3, no skipping)
- [ ] Landmarks identified (main, nav, complementary)
- [ ] Action buttons have clear labels
- [ ] Form labels associated with inputs

#### Scenario 2: Artifact Generation
```
1. User activates "Generate Artifact" button
2. Hears dialog opened: "Generate Artifact dialog"
3. Can tab through form fields
4. Hears each field label: "Type of artifact, required"
5. Selects "Content" from dropdown
6. Hears "Type of artifact, Content selected"
7. Fills form, presses Generate
8. Hears "Generating... please wait"
9. Artifacts stream in, live updates heard: "Tokens: 50/200", etc.
10. Completion: "Artifact generation complete"
```

**What to implement**:
- [ ] Dialog announced with description
- [ ] Form labels and required fields identified
- [ ] Dropdown selection announced
- [ ] Streaming progress via aria-live="polite"
- [ ] Completion announced

#### Scenario 3: Error Recovery
```
1. User tries to generate without selecting artifact type
2. Hears error alert: "Validation error"
3. Error message near field: "Please select artifact type"
4. Focus moves to error field
5. Can select type and retry
```

**Implementation**:
```tsx
<div role="alert" className="bg-red-100 p-4">
  <strong>Error:</strong> Please select artifact type
</div>
```

---

## Mobile Accessibility

### Touch Target Size
- [ ] All interactive elements: minimum 44×44 pixels
- [ ] Exceptions: inline elements in text, nested buttons

**Implementation**:
```tailwind
<!-- 44x44 minimum -->
<button className="w-11 h-11">Generate</button> ✓

<!-- Too small without spacing -->
<button className="w-6 h-6">✕</button> ✗
<!-- If multiple, add spacing -->
<div className="flex gap-2">
  <button className="w-10 h-10">Edit</button>
  <button className="w-10 h-10">Delete</button>
</div> ✓
```

### Mobile Form Input
- [ ] Label associated with input
- [ ] Large enough for touch (min 44px height)
- [ ] Keyboard type hints (email, number, etc.)
- [ ] Auto-fill compatible

**Implementation**:
```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  autoComplete="email"
  className="h-11 px-3 rounded"
/>
```

### Mobile Testing Devices
- [ ] iPhone 12/13 (smallest)
- [ ] Pixel 5 or comparable Android
- [ ] iPad (tablet size)
- [ ] Landscape orientation

---

## Responsive Design & Orientation

### Breakpoints (Tailwind)
```
sm: 640px    (tablets, large phones)
md: 768px    (landscape tablet)
lg: 1024px   (small laptop)
xl: 1280px   (desktop)
2xl: 1536px  (large desktop)
```

### Orientation Testing
- [ ] Portrait: Single column layout, stacked components
- [ ] Landscape: Multi-column if space allows
- [ ] Rotation: Content reflows smoothly

**Implementation**:
```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {artifacts.map(artifact => <Card key={artifact.id} {...artifact} />)}
</div>
```

---

## Color & Vision

### 1. No Color-Only Information
**Bad** ✗:
```
"Generation succeeded (green) vs failed (red)"
```

**Good** ✓:
```
"✓ Generation succeeded" vs "✗ Generation failed"
```

### 2. Color Blindness Simulation
- [ ] Test with Protanopia (red-blind)
- [ ] Test with Deuteranopia (green-blind)
- [ ] Test with Tritanopia (blue-blind)

**Tools**: 
- Chrome DevTools "Rendering" → Color vision deficiency
- WebAIM color contrast checker

### 3. Light/Dark Mode
- [ ] Ensure contrast in both modes
- [ ] Respect system preference (`prefers-color-scheme`)
- [ ] Manual toggle if desired

**Implementation**:
```tsx
// shadcn/ui handles this automatically with Tailwind dark: prefix
<div className="text-black dark:text-white bg-white dark:bg-slate-950">
  Content
</div>
```

---

## Motion & Animation

### Respect prefers-reduced-motion
- [ ] Check user's system preference
- [ ] Disable animations if requested
- [ ] Fallback is instant state change

**Implementation**:
```css
/* Reduced motion: instant change */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
  }
}

/* Normal: smooth transition */
.fade-in {
  @apply transition-opacity duration-300 ease-in-out;
}
```

**Streaming Animation**:
- [ ] Can be disabled with preference
- [ ] Fallback shows all content instantly
- [ ] User can pause/play streaming

---

## Voice & Tone (Inclusive Language)

### Clarity
- [ ] Use plain language (avoid jargon)
- [ ] Short sentences (< 15 words)
- [ ] Active voice ("Generate artifact" not "Artifact generation will be done")

### Inclusive Terminology
- ✓ "Check the list" (neutral)
- ✗ "Have a look" (assumes vision)
- ✓ "Select a model" (neutral)
- ✗ "Pick a color" (assumes color terminology)

### Error Messages
**Bad** ✗:
```
"Invalid input"
```

**Good** ✓:
```
"Please enter a topic with at least 10 characters"
```

---

## Testing Plan

### Phase 1: Automated Testing (Daily)
```bash
npm run test:a11y
```

**Tools**:
- jest-axe (unit tests)
- Lighthouse CI (CI/CD)
- ESLint `jsx-a11y` plugin

### Phase 2: Manual Testing (Before Release)
- [ ] Keyboard navigation (all features)
- [ ] Screen reader (NVDA or VoiceOver)
- [ ] Color contrast (axe DevTools)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Motion preferences (disable animations)

### Phase 3: User Testing (Monthly)
- [ ] Recruit users with disabilities
- [ ] Test real workflows
- [ ] Measure task success rate
- [ ] Document issues & fixes

### Testing Matrix

| Feature | Keyboard | Screen Reader | Mobile | Contrast | Motion |
|---------|----------|---------------|--------|----------|---------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Generate Form | ✓ | ✓ | ✓ | ✓ | ✓ |
| Streaming Display | ✓ | ✓ | ✓ | ✓ | ✓ |
| Artifact Editor | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin Panel | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Performance & Optimization

### Core Web Vitals Targets
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Optimization Checklist
- [ ] Code splitting by route
- [ ] Image optimization (Next.js Image)
- [ ] Font optimization (system fonts preferred)
- [ ] CSS minification (Tailwind handles)
- [ ] JavaScript tree-shaking
- [ ] Database query optimization

---

## Quality Assurance Checklist

Before each release, verify:

### Functionality
- [ ] All features work as designed
- [ ] No console errors
- [ ] All API calls succeed
- [ ] Authentication/authorization working

### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard fully functional
- [ ] Screen readers work
- [ ] Color contrast verified
- [ ] Motion preferences respected

### Performance
- [ ] Page loads in < 3s
- [ ] Streaming updates smoothly
- [ ] No memory leaks
- [ ] Mobile optimized

### Security
- [ ] No sensitive data in logs
- [ ] API keys protected
- [ ] Input validated
- [ ] CSRF tokens present

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers

---

## Success Metrics

- [ ] **Accessibility Score**: 95+ (Lighthouse)
- [ ] **Button Pass Rate**: 100% keyboard accessible
- [ ] **Mobile Success Rate**: > 90% on touch devices
- [ ] **Screen Reader TIme**: User completes flow without frustration
- [ ] **Performance**: LCP < 2.5s, FID < 100ms
- [ ] **Error Rate**: < 0.1% user-reported accessibility issues
