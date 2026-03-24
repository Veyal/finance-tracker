# Design Spec: Premium Elevated Pill Summary

## 1. Overview
The current `SummaryCard` uses a bulky, vertical 3-row layout on mobile which is not UX-friendly and takes up too much screen space. This redesign replaces it with a slim, horizontal "Elevated Pill" design that fits all three metrics (Expense, Income, Net) on a single line, adhering to the project's Cyber/Premium aesthetic. The term "Elevated" refers to the visual depth (shadows/glow) while maintaining standard scrolling behavior.

## 2. Goals
- **Compact UX**: Fit all metrics on one row even on small mobile screens.
- **Visual Hierarchy**: Use color and glow to distinguish between metrics.
- **Aesthetic Alignment**: Use `card-glass`, glassmorphism, and subtle border glows.
- **Functional Stability**: Standard scrolling behavior (not sticky).
- **Desktop Polish**: Maintain a reasonable `max-width` to prevent over-stretching.

## 3. Architecture & UI Components

### 3.1 Component: `SummaryCard.jsx`
- Structure change: Move from a block-based flex container to a inline-flex style pill.
- Layout:
  - `Expense` | `Income` | `Net`
  - Vertical separators between items.
- Content:
  - Icons (`TrendingDown`, `TrendingUp`, `Activity/Arrow`) remain but possibly smaller.
  - Labels: "Expense", "Income", "Net".
  - Values: `formatCurrency` remains the standard.

### 3.2 Styling: `SummaryCard.css`
- **Shape**: Large border-radius (`var(--radius-pill)` or similar).
- **Sizing**: `max-width: 800px` on desktop; `width: 100%` on mobile.
- **Background**: `card-glass` with a subtle linear gradient.
- **Mobile optimization**:
  - `flex-direction: row` always.
  - Reduce padding and gap.
  - **Small Screen Strategy (< 360px)**: Hide labels ("Expense", "Income", "Net") entirely and rely on Icons + Colors to prevent text clipping for large amounts.
  - Scale font sizes to fit width.
  - Use `overflow: hidden` or `white-space: nowrap` to prevent wrapping.

## 4. User Experience (UX)
- **Readability**: Clear color-coding (Red for expense, Green for income, Blue/Accent for Net).
- **Consistency**: Unified design used across both `TodayPage` and `TransactionsPage`.

## 5. Technical Requirements
- Maintain `PrivacyMode` support (masking amounts).
- Ensure zero regression in data calculation (props `expense`, `income`, `net` remain the same).

## 6. Implementation Phases
1. **Visual Refactor**: Update CSS to implement the pill shape and horizontal layout.
2. **Responsive Polish**: Adjust breakpoints to ensure no text clipping on 320px screens using the label-hide strategy.
3. **Integration**: Verify appearance on both target pages.
