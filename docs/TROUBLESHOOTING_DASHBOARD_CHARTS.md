# Dashboard Charts Not Showing - Troubleshooting Guide

## Issue Summary
Charts appear correctly on the **Ask** page but fail to render on the **Dashboard** page. The panel card shows the title and subtitle but the chart area is blank/empty. No errors appear in the browser console or backend logs.

**Last Updated**: 2026-02-04

---

## Root Cause Analysis

### Primary Cause: CSS Flexbox Height Collapse
Tremor/Recharts (SVG-based charting libraries) require a parent container with a **defined, explicit height**. When using `h-full` or `flex-1`, every ancestor in the DOM tree must also have a defined height for the chart to render.

**Why the Ask page works but Dashboard doesn't:**
- **Ask page**: Uses a fixed height container (`h-[450px]`) directly on the chart wrapper
- **Dashboard**: Uses a dynamic grid layout where heights are calculated via flexbox (`flex-1`, `h-full`)

When any ancestor in the flexbox chain has `height: auto` or no explicit height, the chart collapses to 0px.

### Secondary Causes (Check These First)
1. **Data not loading**: Check browser Network tab for failed API calls to `/api/saved-queries/{id}` or `/api/query`
2. **Redis connection errors**: Check backend logs for `Cache set error: Error -2 connecting to redis:6379`
3. **API trailing slashes**: Ensure frontend calls don't have trailing slashes (e.g., `/api/dashboards/${id}/filters` not `/api/dashboards/${id}/filters/`)
4. **Empty recommendation**: If `chart_recommendation` is null or has missing `x_column`/`y_column`, the chart falls back to TableView

---

## Diagnostic Steps

### Step 1: Check Browser Console
Open DevTools (F12) → Console tab. Look for:
- `Failed to load query details` 
- `Failed to execute query`
- React component errors

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Navigate to the dashboard
3. Look for these API calls:
   - `GET /api/dashboards/{id}` - Should return 200 with panels array
   - `GET /api/saved-queries/{id}` - Should return 200 for each panel
   - `POST /api/query` - Should return 200 with results and chart_recommendation

### Step 3: Inspect the DOM
1. Right-click on the empty chart area → Inspect
2. Look for the `<svg>` or Tremor chart container
3. Check if it has `height: 0px` - this confirms the flexbox collapse issue

### Step 4: Add Debug Logging (Temporary)
In `PanelCard.tsx`, add after the API call:
```typescript
console.log("Panel Data:", { data, recommendation, queryName });
```

---

## Known Fixes

### Fix 1: Use Explicit Height on Chart Container
**File**: `components/dashboard/PanelCard.tsx`

Instead of relying on flexbox:
```tsx
// PROBLEMATIC: Height depends on flexbox chain
<div className="flex-1 w-full relative">
  <AutoChart ... />
</div>

// FIXED: Use explicit calculated height
<div 
  className="w-full relative"
  style={{ height: `${contentHeight}px` }}  // contentHeight = gridH * 80
>
  <AutoChart ... />
</div>
```

### Fix 2: Use min-height on Card
Ensure the `Card` component has a minimum height:
```tsx
<Card style={{ minHeight: `${contentHeight + 80}px` }}>
```

### Fix 3: Disable Compact Mode for Debugging
Setting `compact={false}` forces axes to render, which helps verify if the chart is receiving data:
```tsx
<AutoChart
  data={data}
  recommendation={recommendation}
  compact={false}  // Always show axes during debugging
/>
```

### Fix 4: Apply Explicit Height to AutoChart Wrapper
**File**: `app/components/charts/auto-chart.tsx`

Change the commonProps:
```tsx
const commonProps = {
  className: "h-full w-full",
  style: { minHeight: "200px" },  // Add this
  showAnimation: true,
  ...
};
```

---

## Architecture Notes

### Ask Page Rendering Flow
```
AskPageContent
  └── Card (bg-slate-900/40)
        └── CardContent (p-8)
              └── div (h-[450px] w-full)  ← EXPLICIT HEIGHT
                    └── AutoChart
```

### Dashboard Panel Rendering Flow
```
DashboardGrid
  └── div (grid-cols-12, gap-6)
        └── div (col-span-N)  ← No height defined
              └── PanelCard
                    └── Card (minHeight via style)
                          └── CardContent (flex-1)
                                └── div (flex-1, min-h-[220px])
                                      └── AutoChart
```

The CSS Grid doesn't inherently set heights on children. Each `PanelCard` must manage its own height.

---

## Quick Verification Test

If charts are not showing, apply this temporary change to `PanelCard.tsx`:

```tsx
// Replace the chart container with this explicit height version:
<div 
  className="w-full bg-slate-950/20 rounded-xl border border-slate-800/30 p-2"
  style={{ height: "300px" }}  // Force explicit height
>
  <AutoChart
    data={data}
    recommendation={recommendation}
    compact={false}
    onDataPointClick={handleDataClick}
  />
</div>
```

If the chart appears after this change, the issue is confirmed to be flexbox height collapse.

---

## Prevention Checklist

When modifying dashboard layout components:
- [ ] Ensure chart containers have explicit `height` or `min-height` in pixels
- [ ] Avoid using only `h-full` or `flex-1` without a parent with defined height
- [ ] Test both Ask page and Dashboard after any changes to `AutoChart` or `PanelCard`
- [ ] Keep `compact={false}` during development for easier debugging
- [ ] Check Network tab for API errors after layout changes

---

## Related Files

| File | Purpose |
|------|---------|
| `components/dashboard/PanelCard.tsx` | Individual dashboard panel rendering |
| `components/dashboard/DashboardGrid.tsx` | Grid layout for panels |
| `app/components/charts/auto-chart.tsx` | Chart rendering logic |
| `app/(dashboard)/dashboards/[id]/page.tsx` | Dashboard detail page |
| `app/(dashboard)/ask/page.tsx` | Ask page (reference implementation) |

---

## Contact / Escalation

If this issue persists after applying fixes, check:
1. Tremor library version compatibility with React 19
2. Next.js server-side vs client-side rendering differences
3. TailwindCSS v4 `@layer` and utility class generation
