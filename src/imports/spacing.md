# Spacing, Radius & Elevation Tokens

## Spacing Scale

Based on a 4px grid. All spacing on the screen snaps to these values. Do NOT use arbitrary pixel values like `7px` or `13px`.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Icon-to-adjacent-text gap, checkbox-to-label gap |
| `--space-2` | `8px` | Label-to-input gap, badge internal padding, button icon gap |
| `--space-3` | `12px` | Between stacked fields in a form group, grid gap for dense cards |
| `--space-4` | `16px` | Card internal padding (mobile), horizontal gap between siblings |
| `--space-5` | `20px` | Between form field groups inside a card |
| `--space-6` | `24px` | Card internal padding (desktop), gap between sibling cards |
| `--space-8` | `32px` | Content area side padding, gap from page title to first card |
| `--space-10` | `40px` | Gap between major sections (e.g., metric blocks → data table on step 7) |
| `--space-12` | `48px` | Top padding below the tab bar to the page title, bottom padding above action bar |

## Layout Rules

### Overall page rhythm (full-width, inner capped)

```
┌─────────────────────────────────────────────────────────┐  ← viewport edge
│                                                         │
│  ←─── 32px ───→                      ←─── 32px ───→     │
│                  ┌───────────────────┐                  │
│                  │  (max-width:      │                  │
│                  │   1280px, center) │                  │
│                  │                   │                  │
```

- Always use `32px` horizontal padding from viewport edge to content.
- Inner content capped at `1280px` and centered.
- On screens narrower than 1344px (1280 + 2×32), content simply takes full width minus the padding.

### Tab bar → page title

- `--space-12` (48px) from bottom of tab bar to the page title.

### Page title → first card

- `--space-8` (32px) between subtitle and first card.

### Between sibling cards

- `--space-6` (24px) default.
- `--space-10` (40px) on step 7 when separating logically distinct sections (metrics summary → table → chart).

### Card internal rhythm

```
CardHeader (padding 24px)
  CardTitle
    ↕ 8px
  Optional description (text-body-small text-muted)
CardContent (padding 24px, top: 0 if header present)
  Field group 1
    ↕ 20px
  Field group 2
    ↕ 20px
  Field group 3
```

Within a field group (Label + Input [+ helper]):

```
Label                  ← text-body-medium font-medium
  ↕ 8px
Input
  ↕ 4px (only if helper present)
Helper text            ← text-body-small text-muted
```

### Two-column form row

When two fields sit side-by-side:
- Gap between columns: `--space-5` (20px) on desktop.
- Collapse to single column below `768px`.
- Both columns equal width.

### Grid of selectable cards (TC selection)

- 4 columns at `≥1280px`, 3 at `≥1024px`, 2 at `≥768px`, 1 below.
- Gap: `--space-3` (12px).
- Each card min-height ~96px for consistent visual rhythm across varied content.

### Action bar internal

- Vertical padding: `--space-4` (16px) top and bottom.
- Horizontal padding: `--space-8` (32px), same as content side padding.
- Button-to-button gap (when multiple on same side): `--space-2` (8px).

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Badge, Checkbox, small inline elements |
| `--radius-md` | `6px` | Inputs, Buttons, Select triggers, tab containers |
| `--radius-lg` | `8px` | **Default for Cards**, Alert boxes, drop zones, metric blocks |
| `--radius-full` | `9999px` | Step number circles, tag pills (class name badges) |

Do NOT use `--radius-xl` or anything above 8px for cards. Linear/Vercel use 8px; anything larger drifts toward friendly/playful territory.

## Elevation (Shadows)

Elevation is deliberately minimal. Surfaces sit flat. Shadows appear only on floating layers (popovers, dropdowns, tooltips).

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-none` | `none` | **Default for Cards.** They rely on border, not shadow. |
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.04)` | Rarely used — very subtle lift on hover for clickable cards |
| `--shadow-md` | `0 4px 12px -2px rgb(0 0 0 / 0.08)` | Dropdowns, popovers, tooltips — floating UI only |
| `--shadow-lg` | `0 10px 30px -4px rgb(0 0 0 / 0.1)` | Modals (not used in MVP) |

### Shadow rules

- ✅ Cards: `border` + `--shadow-none`.
- ✅ Dropdowns/tooltips: `border` + `--shadow-md`.
- ❌ Do NOT stack shadows (e.g., card in card with both having shadow).
- ❌ Do NOT use colored shadows. Neutral black-with-low-alpha only.

## Focus States

Every focusable element gets:

```css
outline: 2px solid var(--color-ring);
outline-offset: 2px;
```

Do NOT remove focus styles. They must remain visible for keyboard users.

## Responsive Breakpoints

Following Tailwind defaults:

| Breakpoint | Min width | Behavior |
|-----------|-----------|----------|
| `sm` | `640px` | Single column forms, single column TC grid |
| `md` | `768px` | Two-column form rows, 2-column TC grid, tab labels show full text |
| `lg` | `1024px` | 3-column TC grid, metric blocks in 2 columns |
| `xl` | `1280px` | 4-column TC grid, metric blocks in 4 columns, inner max-width kicks in |

### Below `md` (mobile)

- Tabs become horizontally scrollable. Do NOT collapse them into a dropdown — scrolling preserves orientation.
- Action bar buttons remain side-by-side but narrower.
- Content padding reduces from 32px to 16px.
- Metric blocks stack single-column.

Mobile is not a primary target for this product (users are entering large files on desktops), but the layout must remain usable.
