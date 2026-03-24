# Elevated Pill Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `SummaryCard` into a slim, horizontal "Elevated Pill" to fix mobile UI bulkiness and clipping.

**Architecture:** Pure CSS refactor. We will modify `SummaryCard.css` to enforce a horizontal layout across all screen sizes, apply a pill-shaped border radius, and add specific media queries to hide labels on ultra-small screens (<360px).

**Tech Stack:** React, Vanilla CSS.

---

### Task 1: CSS Refactor (Pill Layout & Small Screen Strategy)

**Files:**
- Modify: `client/src/components/SummaryCard.css`

- [ ] **Step 1: Update base `.summary-card` layout**
  - Add `border-radius: var(--radius-pill)` or a very large px value (e.g., `100px`) to create the pill shape.
  - Set `max-width: 800px` and `margin: 0 auto` so it doesn't stretch too far on desktop.
  - Keep `display: flex`, but ensure it's row-based.

- [ ] **Step 2: Update `.summary-item` and internals**
  - Keep `flex: 1` but ensure `min-width: 0` is set to allow text truncation if absolutely necessary.
  - Ensure icons are compact.

- [ ] **Step 3: Modify responsive rules (Mobile)**
  - Remove the old `@media (max-width: 480px)` block that sets `flex-direction: column`.
  - Add a new `@media (max-width: 480px)` block:
    - Keep `flex-direction: row`.
    - Adjust padding (e.g., `padding: var(--space-sm) var(--space-md);`).
    - Adjust gaps.
    - Reduce font sizes (`.summary-amount` to `var(--text-base)` or smaller, `.summary-icon` size).
  - Add a new `@media (max-width: 360px)` block (Small Screen Strategy):
    - Hide the `.summary-label` completely (`display: none;`).
    - This ensures the amounts have enough room on devices like iPhone SE.

- [ ] **Step 4: Update `.summary-divider`**
  - Ensure it stays vertical across all breakpoints (remove the horizontal gradient logic from the old mobile media query).

- [ ] **Step 5: Commit**
```bash
git add client/src/components/SummaryCard.css
git commit -m "style: redesign SummaryCard as a horizontal elevated pill"
```

---

### Task 2: Validation

- [ ] **Step 1: Build the client to check for syntax errors**
  - Run: `cd client && npm run build`
  - Expected: PASS

- [ ] **Step 2: Commit final fixes if any**
