# Design Spec: Insights 2.0 Redesign

## 1. Overview
The current Insights page suffers from "bad graphs" (custom SVGs with poor UX/responsiveness) and confusing data logic. Large repayments for past expenses (e.g., business expenses from a previous month) cause the current month's spending to appear negative, which is counter-intuitive for a spending dashboard.

This redesign moves to an **Accrual Basis** calculation logic, adopts the **Recharts** library for professional visualizations, and adds **Comparative Context** and **Interactive Drill-downs**.

## 2. Goals
- **Intuitive Spending**: Repayments should reduce the spending of the category and month where the *original expense* occurred.
- **UX-First Visuals**: Use a robust charting library (Recharts) for smooth animations, accurate tooltips, and responsiveness.
- **Actionable Insights**: Provide "vs Last Month" context for all major metrics.
- **Deep Exploration**: Allow users to click on categories or chart points to see the underlying transactions.

## 3. Architecture & Data Flow

### 3.1 Backend Changes (`server/routes/transactions.js`)
The backend is already partially updated to Accrual Basis for totals. We need to ensure consistency across all analytic endpoints:
- `GET /transactions/insights`: Ensure `byCategory`, `byGroup`, and `byPaymentMethod` all use the accrual logic (joining repayments to their parent transactions to determine category/date).
- `GET /transactions/summary`: Group daily totals by the *original expense date* for linked repayments.

### 3.2 Frontend Components
- **`InsightsPage.jsx`**: Complete overhaul of the layout.
- **`SpendingTrendChart.jsx`**: New component using Recharts `AreaChart`.
- **`CategoryBreakdown.jsx`**: New component using horizontal bars with "vs Last Month" percentage indicators.
- **`DrillDownModal.jsx`**: New component to show transactions for a selected category/date.

## 4. User Experience (UX)

### 4.1 Comparison Logic
Every top-level metric will show a comparison:
- `Net Spending`: `[Amount] (+X% vs last month)`
- `Daily Average`: `[Amount] (-X% vs usual)`

### 4.2 Visualization
- **Main Chart**: A smooth Area Chart showing daily net spending.
- **Breakdown**: Vertical list of horizontal progress bars for categories. High-contrast colors for Expense (Red) vs Income (Green).

### 4.3 Drill-down
- Tapping a category bar opens a modal listing all transactions in that category for the current period.
- Tapping a dot on the trend chart shows transactions for that specific day.

## 5. Technical Requirements
- Install `recharts` dependency.
- Maintain Cyber/Premium aesthetic (Glassmorphism, gradients).
- Respect `PrivacyMode` (masking amounts).

## 6. Implementation Phases
1. **Infrastructure**: Install Recharts and verify backend logic for all drill-down cases.
2. **Visual Overhaul**: Implement the new `InsightsPage` layout and Recharts integration.
3. **Interactive Layer**: Add the Drill-down modals and comparison logic.
4. **Validation**: Verify accuracy of "Accrual" numbers against raw DB records.
