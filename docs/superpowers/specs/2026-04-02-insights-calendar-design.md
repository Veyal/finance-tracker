# Insights Calendar View — Design Spec

## Goal

Add a monthly calendar section below the existing breakdown section on the Insights page. Each day shows the net amount (income − expense). Clicking a day opens the existing DrillDownModal with that day's transactions.

## Architecture

New self-contained component `InsightsCalendar` under `client/src/components/Insights/`. It manages its own month state and data fetch independently of the top-level range selector. InsightsPage renders it below the breakdown section and passes a `onDayClick` callback that opens the existing `DrillDownModal`.

## Files

| Action | Path |
|--------|------|
| Create | `client/src/components/Insights/InsightsCalendar.jsx` |
| Create | `client/src/components/Insights/InsightsCalendar.css` |
| Modify | `client/src/components/Insights/index.js` — add export |
| Modify | `client/src/pages/InsightsPage.jsx` — import + render + handler |

## Component: InsightsCalendar

### Props
```
onDayClick(dateString: string)  // called with "YYYY-MM-DD" when a day is clicked
```

### State
- `currentMonth: Date` — defaults to `new Date()` (first render = current month)
- `dailyData: Array<{ day, expense, income }>` — from `transactions.summary()`
- `loading: boolean`

### Data fetch
On mount and whenever `currentMonth` changes, fetch:
```js
transactions.summary({
  from: YYYY-MM-01,
  to:   YYYY-MM-<last-day>
})
```
Result is an array of `{ day: "YYYY-MM-DD", expense, income }`. Build a lookup map keyed by `day` for O(1) cell access.

### Calendar grid logic
- Header row: Mon Tue Wed Thu Fri Sat Sun (7 columns)
- First row may have blank leading cells based on the weekday of the 1st (Monday = 0)
- Iterate days 1..N (N = days in month), render one cell per day

### Day cell display
- Date number (top-left, small)
- Net amount = `income - expense` (centered, formatted compact currency)
- If no data for that day: show date number only, neutral styling
- Net > 0: green tint background + green text
- Net < 0: red tint background + red text
- Net = 0 but data exists: neutral/muted
- Privacy mode: show `••••` instead of amount
- Today's date: subtle ring/highlight on the cell border

### Navigation
Section header: `"< Month Year >"` with ChevronLeft / ChevronRight buttons.
- Prev/next update `currentMonth` by ±1 month.
- No restriction on how far back/forward user can navigate.

### Loading state
Show a subtle skeleton or spinner inside the calendar container while fetching.

## InsightsPage changes

1. Import `InsightsCalendar` from `../components/Insights`
2. Add handler:
```jsx
const handleCalendarDayClick = (dateStr) => {
    setDrillDownTitle(`Transactions on ${new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`);
    setDrillDownFilters({ date: dateStr });
    setShowDrillDown(true);
};
```
3. Render below the breakdown section:
```jsx
<section className="insights-section calendar-section animate-slide-up" style={{ animationDelay: '0.6s' }}>
    <InsightsCalendar onDayClick={handleCalendarDayClick} />
</section>
```

The existing `DrillDownModal` is already rendered at the bottom of InsightsPage and reused as-is.

## CSS Design

Follow the existing `InsightsPage.css` visual language:
- Section container uses `card-glass` class
- Section header matches existing `.section-header` pattern (title + nav buttons inline)
- Grid: `display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px`
- Day cells: min-height ~56px on mobile, ~64px on desktop; rounded corners; cursor pointer
- Green tint: `rgba(var(--income-green-rgb, 74, 222, 128), 0.12)` background
- Red tint: `rgba(var(--expense-red-rgb, 248, 113, 113), 0.12)` background
- Amount font: `var(--font-display)`, small size (`var(--text-xs)`), tabular nums
- Hover: slight brightness increase on cells that have data
- Today ring: `border: 1px solid var(--accent-primary)`

## Error handling
If the fetch fails, show a simple retry button inside the calendar container (same pattern as DrillDownModal error state).
