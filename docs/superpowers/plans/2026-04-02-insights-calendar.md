# Insights Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a monthly calendar section below the breakdown section on the Insights page, showing net amount (income − expense) per day, with month navigation and a click-to-drill-down on each day.

**Architecture:** New self-contained `InsightsCalendar` component under `client/src/components/Insights/` manages its own month state and data fetch. InsightsPage renders it below the breakdown section and wires its `onDayClick` to the existing `DrillDownModal`. No new API endpoints needed — reuses `transactions.summary()`.

**Tech Stack:** React 18, Framer Motion (already installed), Lucide React icons, vanilla CSS following existing InsightsPage design tokens.

---

## Files

| Action | Path |
|--------|------|
| Create | `client/src/components/Insights/InsightsCalendar.jsx` |
| Create | `client/src/components/Insights/InsightsCalendar.css` |
| Modify | `client/src/components/Insights/index.js` |
| Modify | `client/src/pages/InsightsPage.jsx` |

---

## Task 1: Create InsightsCalendar component

**Files:**
- Create: `client/src/components/Insights/InsightsCalendar.jsx`

- [ ] **Step 1: Create the component file**

Create `client/src/components/Insights/InsightsCalendar.jsx` with this complete content:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, CalendarDays } from 'lucide-react';
import { transactions } from '../../api/api';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrency } from '../../utils/format';
import './InsightsCalendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function InsightsCalendar({ onDayClick }) {
    const { isPrivacyMode } = usePrivacy();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
            const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const data = await transactions.summary({ from: firstDay, to: lastDay });
            setDailyData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load calendar data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Build a lookup map: "YYYY-MM-DD" -> { expense, income }
    const dataMap = {};
    dailyData.forEach(d => { dataMap[d.day] = d; });

    // Build calendar grid cells
    function getDays() {
        const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < firstWeekday; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return cells;
    }

    function dateStr(day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const cells = getDays();

    return (
        <div className="insights-calendar card-glass">
            {/* Header */}
            <div className="ic-header">
                <div className="ic-title">
                    <CalendarDays size={18} />
                    <span>Monthly Calendar</span>
                </div>
                <div className="ic-nav">
                    <button
                        className="ic-nav-btn"
                        onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="ic-month-label">{monthLabel}</span>
                    <button
                        className="ic-nav-btn"
                        onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                        aria-label="Next month"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Weekday header row */}
            <div className="ic-weekdays">
                {WEEKDAYS.map(d => (
                    <div key={d} className="ic-weekday">{d}</div>
                ))}
            </div>

            {/* Body */}
            {loading ? (
                <div className="ic-loading">
                    <Loader2 className="ic-spinner" size={28} />
                </div>
            ) : error ? (
                <div className="ic-error">
                    <AlertCircle size={28} />
                    <span>{error}</span>
                    <button className="ic-retry-btn" onClick={loadData}>Retry</button>
                </div>
            ) : (
                <div className="ic-days-grid">
                    {cells.map((day, i) => {
                        if (!day) return <div key={`empty-${i}`} className="ic-cell ic-cell-empty" />;

                        const ds = dateStr(day);
                        const entry = dataMap[ds];
                        const net = entry ? (entry.income || 0) - (entry.expense || 0) : null;
                        const isToday = ds === todayStr;
                        const hasData = net !== null;

                        let colorClass = '';
                        if (hasData && net > 0) colorClass = 'ic-cell-positive';
                        else if (hasData && net < 0) colorClass = 'ic-cell-negative';
                        else if (hasData) colorClass = 'ic-cell-neutral';

                        return (
                            <div
                                key={ds}
                                className={`ic-cell ${colorClass} ${isToday ? 'ic-cell-today' : ''} ${hasData ? 'ic-cell-clickable' : ''}`}
                                onClick={() => hasData && onDayClick(ds)}
                            >
                                <span className="ic-day-number">{day}</span>
                                {hasData && (
                                    <span className="ic-day-amount">
                                        {isPrivacyMode ? '••••' : formatCurrency(Math.abs(net), { compact: true })}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verify the file was created correctly**

Run:
```bash
head -5 client/src/components/Insights/InsightsCalendar.jsx
```
Expected: shows the import line.

---

## Task 2: Create InsightsCalendar CSS

**Files:**
- Create: `client/src/components/Insights/InsightsCalendar.css`

- [ ] **Step 1: Create the CSS file**

Create `client/src/components/Insights/InsightsCalendar.css` with this complete content:

```css
/* InsightsCalendar — monthly net view */

.insights-calendar {
    border-radius: var(--radius-xl);
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

/* Header */
.ic-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-sm);
}

.ic-title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-family: var(--font-display);
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.ic-nav {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.ic-month-label {
    font-family: var(--font-display);
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text-primary);
    min-width: 130px;
    text-align: center;
}

.ic-nav-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid var(--border-subtle);
    background: var(--bg-glass);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
}

.ic-nav-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
}

/* Weekday row */
.ic-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
}

.ic-weekday {
    font-family: var(--font-display);
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
    padding: 4px 0;
}

/* Days grid */
.ic-days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
}

/* Day cells */
.ic-cell {
    min-height: 52px;
    border-radius: var(--radius-md, 8px);
    padding: 5px 5px 4px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    background: var(--bg-elevated);
    border: 1px solid transparent;
    transition: filter var(--duration-fast) var(--ease-smooth);
    position: relative;
    overflow: hidden;
}

.ic-cell-empty {
    background: transparent;
    border-color: transparent;
    pointer-events: none;
}

.ic-cell-clickable {
    cursor: pointer;
}

.ic-cell-clickable:hover {
    filter: brightness(1.25);
}

/* Color states */
.ic-cell-positive {
    background: rgba(74, 222, 128, 0.1);
    border-color: rgba(74, 222, 128, 0.2);
}

.ic-cell-negative {
    background: rgba(248, 113, 113, 0.1);
    border-color: rgba(248, 113, 113, 0.2);
}

.ic-cell-neutral {
    background: var(--bg-elevated);
    border-color: var(--border-subtle);
}

/* Today highlight */
.ic-cell-today {
    border-color: var(--accent-primary) !important;
    box-shadow: 0 0 0 1px var(--accent-primary);
}

/* Cell content */
.ic-day-number {
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    line-height: 1;
}

.ic-cell-today .ic-day-number {
    color: var(--accent-primary);
}

.ic-day-amount {
    font-family: var(--font-display);
    font-size: 10px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    line-height: 1;
    align-self: flex-end;
}

.ic-cell-positive .ic-day-amount {
    color: var(--income-green);
}

.ic-cell-negative .ic-day-amount {
    color: var(--expense-red);
}

.ic-cell-neutral .ic-day-amount {
    color: var(--text-muted);
}

/* Loading & error states */
.ic-loading,
.ic-error {
    min-height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    color: var(--text-muted);
}

@keyframes ic-spin {
    to { transform: rotate(360deg); }
}

.ic-spinner {
    animation: ic-spin 0.8s linear infinite;
    color: var(--accent-primary);
}

.ic-retry-btn {
    margin-top: var(--space-xs);
    padding: 6px 16px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-subtle);
    background: var(--bg-glass);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--duration-fast);
}

.ic-retry-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
}

/* Responsive: tighter on small screens */
@media (max-width: 400px) {
    .ic-cell {
        min-height: 44px;
        padding: 4px 3px;
    }

    .ic-day-number {
        font-size: 10px;
    }

    .ic-day-amount {
        font-size: 9px;
    }

    .ic-month-label {
        min-width: 110px;
        font-size: var(--text-xs);
    }
}
```

- [ ] **Step 2: Commit Tasks 1 & 2**

```bash
git add client/src/components/Insights/InsightsCalendar.jsx client/src/components/Insights/InsightsCalendar.css
git commit -m "feat: add InsightsCalendar component with net-per-day display"
```

---

## Task 3: Export InsightsCalendar from the Insights barrel

**Files:**
- Modify: `client/src/components/Insights/index.js`

Current content of `index.js`:
```js
export { default as SpendingTrendChart } from './SpendingTrendChart';
export { default as CategoryBreakdown } from './CategoryBreakdown';
export { default as DrillDownModal } from './DrillDownModal';
```

- [ ] **Step 1: Add the export**

Edit `client/src/components/Insights/index.js` to add the new export:

```js
export { default as SpendingTrendChart } from './SpendingTrendChart';
export { default as CategoryBreakdown } from './CategoryBreakdown';
export { default as DrillDownModal } from './DrillDownModal';
export { default as InsightsCalendar } from './InsightsCalendar';
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Insights/index.js
git commit -m "feat: export InsightsCalendar from Insights barrel"
```

---

## Task 4: Wire InsightsCalendar into InsightsPage

**Files:**
- Modify: `client/src/pages/InsightsPage.jsx`

Two changes:
1. Import `InsightsCalendar` from the barrel
2. Add `handleCalendarDayClick` callback
3. Render `<InsightsCalendar>` below the breakdown section

- [ ] **Step 1: Update the import line**

Current import (line 4):
```jsx
import { SpendingTrendChart, CategoryBreakdown, DrillDownModal } from '../components/Insights';
```

Change to:
```jsx
import { SpendingTrendChart, CategoryBreakdown, DrillDownModal, InsightsCalendar } from '../components/Insights';
```

- [ ] **Step 2: Add the day-click handler**

Add this function after `handleCategoryClick` (around line 133, just before the `return`):

```jsx
    const handleCalendarDayClick = (ds) => {
        const label = new Date(ds + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
        });
        setDrillDownTitle(`Transactions on ${label}`);
        setDrillDownFilters({ date: ds });
        setShowDrillDown(true);
    };
```

- [ ] **Step 3: Render the calendar section**

After the closing `</section>` of the breakdown section (line ~280), and before the closing `</div>` of `insights-content-grid`, add:

```jsx
                    {/* Calendar Section */}
                    <section className="insights-section calendar-section animate-slide-up" style={{ animationDelay: '0.6s' }}>
                        <InsightsCalendar onDayClick={handleCalendarDayClick} />
                    </section>
```

- [ ] **Step 4: Verify the page still renders**

Check the dev server (already running at http://localhost:5173) — navigate to Insights. The calendar should appear below the breakdown cards with the current month.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/InsightsPage.jsx
git commit -m "feat: render InsightsCalendar on InsightsPage below breakdown section"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Covered by |
|------------------|-----------|
| New `InsightsCalendar` component | Task 1 |
| Self-contained month state + data fetch | Task 1 (`currentDate` state, `loadData` useCallback) |
| `transactions.summary()` for the displayed month | Task 1 |
| Net = income − expense per day | Task 1 (`net = (entry.income || 0) - (entry.expense || 0)`) |
| Green tint for net > 0 | Task 2 (`.ic-cell-positive`) |
| Red tint for net < 0 | Task 2 (`.ic-cell-negative`) |
| Neutral for net = 0 or no data | Task 2 (`.ic-cell-neutral`, empty cell) |
| Today highlight (ring) | Task 2 (`.ic-cell-today` with accent border) |
| Prev/next month navigation | Task 1 (ChevronLeft/Right buttons) |
| Loading state (spinner) | Task 1 + Task 2 (`.ic-loading`, `.ic-spinner`) |
| Error state with retry | Task 1 + Task 2 (`.ic-error`, retry button) |
| Privacy mode masks amounts | Task 1 (`isPrivacyMode ? '••••'`) |
| Clicking a day fires `onDayClick(dateStr)` | Task 1 (only when `hasData`) |
| Export from barrel `index.js` | Task 3 |
| Import + render in InsightsPage | Task 4 |
| `handleCalendarDayClick` opens DrillDownModal | Task 4 |
| Below breakdown section | Task 4 |
| `animationDelay: '0.6s'` stagger | Task 4 |
| Responsive: tighter cells on mobile | Task 2 (`@media max-width: 400px`) |

### Placeholder scan
No TBDs, TODOs, or vague steps found.

### Type consistency
- `onDayClick(ds: string)` defined in Task 1, consumed in Task 4 as `handleCalendarDayClick(ds)` — consistent.
- `formatCurrency(Math.abs(net), { compact: true })` — `formatCurrency` is imported in Task 1 from `../../utils/format`, same import path used by DrillDownModal and CategoryBreakdown.
- `transactions.summary()` — same API call used in CalendarPage.jsx, confirmed working.
