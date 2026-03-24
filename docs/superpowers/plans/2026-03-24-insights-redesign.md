# Insights 2.0 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Insights page with professional-grade charts (Recharts), accurate accrual-basis accounting, and interactive drill-downs.

**Architecture:** Moving from custom SVG charts to Recharts for better UX. Updating backend analytic queries to use Accrual Basis (repayments subtract from the original expense date/category). Implementing a drill-down modal for exploring transaction details directly from insights.

**Tech Stack:** React, Recharts, Express, better-sqlite3.

---

### Task 1: Backend Infrastructure & Analytics Logic

**Files:**
- Modify: `server/routes/transactions.js`

- [ ] **Step 1: Ensure Accrual Basis in /insights byCategory/byGroup/byPaymentMethod**
  - Update queries to join `repayment` transactions with their parents to attribute them to the correct category/group.
  - Already done for `totals` in previous turns, but needs verification for sub-breakdowns.

- [ ] **Step 2: Ensure Accrual Basis in /summary**
  - Update daily total query to subtract linked repayments based on the parent transaction's date.

- [ ] **Step 3: Verify Backend accuracy**
  - Query the DB directly for a known high-volume category (e.g., Food) and verify the `/insights` response matches the calculated net.

- [ ] **Step 4: Commit**
```bash
git add server/routes/transactions.js
git commit -m "feat(api): unify analytic routes under accrual basis logic"
```

---

### Task 2: Frontend Infrastructure

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Install Recharts**
  - Run: `cd client && npm install recharts`

- [ ] **Step 2: Commit**
```bash
git add client/package.json client/package-lock.json
git commit -m "chore(deps): install recharts for data visualization"
```

---

### Task 3: Core Visualization Components

**Files:**
- Create: `client/src/components/Insights/SpendingTrendChart.jsx`
- Create: `client/src/components/Insights/CategoryBreakdown.jsx`

- [ ] **Step 1: Implement SpendingTrendChart**
  - Use Recharts `AreaChart` with a smooth curve.
  - Include custom tooltip using the project's Cyber aesthetic.
  - Implement a `onPointClick` callback for future drill-down.

- [ ] **Step 2: Implement CategoryBreakdown**
  - Display a vertical list of categories with horizontal bars.
  - Add percentage comparison badge (e.g., "+12% vs last month").
  - Use `var(--accent-primary)` for bar colors.

- [ ] **Step 3: Commit**
```bash
git add client/src/components/Insights/
git commit -m "feat(ui): add core visualization components for Insights 2.0"
```

---

### Task 4: Drill-down & Interactive Layer

**Files:**
- Create: `client/src/components/Insights/DrillDownModal.jsx`
- Create: `client/src/components/Insights/DrillDownModal.css`

- [ ] **Step 1: Implement DrillDownModal**
  - Create a modal that accepts a transaction list or search params.
  - Use the existing `TransactionCard` component to display items.
  - Style with `.modal-overlay` and `.modal` per project standards.

- [ ] **Step 2: Commit**
```bash
git add client/src/components/Insights/DrillDownModal.*
git commit -m "feat(ui): add transaction drill-down modal for insights"
```

---

### Task 5: Page Overhaul (The Big Bang)

**Files:**
- Modify: `client/src/pages/InsightsPage.jsx`
- Modify: `client/src/pages/InsightsPage.css`

- [ ] **Step 1: Rewrite InsightsPage Layout**
  - Replace the old SVG logic with the new `SpendingTrendChart`.
  - Integrate `CategoryBreakdown` components.
  - Add top-level comparison logic ("Net Spending vs Last Month").

- [ ] **Step 2: Wire up Drill-downs**
  - Connect chart point clicks and category bar clicks to the `DrillDownModal`.

- [ ] **Step 3: Visual Polish**
  - Ensure all cards use `card-glass` and `animate-slide-up`.
  - Test responsiveness on mobile (`dvh` units).

- [ ] **Step 4: Commit**
```bash
git add client/src/pages/InsightsPage.*
git commit -m "feat(ui): complete Insights 2.0 redesign"
```

---

### Task 6: Final Validation

- [ ] **Step 1: Verify all calculations against DB**
- [ ] **Step 2: Check Privacy Mode toggling**
- [ ] **Step 3: Commit final fixes**
