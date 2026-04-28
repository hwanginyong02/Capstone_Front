# Spacing, Radius & Elevation Tokens

## Spacing Scale

Based on a 4px grid. All spacing snaps to these values. Never use arbitrary pixels.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Icon-to-text gap, checkbox-to-label gap |
| `--space-2` | `8px` | Label-to-input gap, badge padding, button icon gap |
| `--space-3` | `12px` | Stacked fields within a group, dense card grid gap |
| `--space-4` | `16px` | Card internal padding (mobile), horizontal sibling gap |
| `--space-5` | `20px` | Between form field groups inside a card |
| `--space-6` | `24px` | Card internal padding (desktop), gap between sibling cards |
| `--space-8` | `32px` | Content area side padding, title-to-first-card gap |
| `--space-10` | `40px` | Gap between major sections in Step 6 |
| `--space-12` | `48px` | Top padding below tab bar to page title |

## Layout Rules

### Full-width page with inner cap

- 32px horizontal padding from viewport edge.
- Inner content max-width: 1280px, centered.
- On narrower viewports, content fills available width minus padding.

### Step Tab → Page Title → First Card

- 48px from tab bar bottom to page title.
- 32px from subtitle to first card.

### Sibling Cards

- 24px default gap.
- 40px when separating major sections (Step 6 metric summary → data table → charts).

### Card Internals

```
CardHeader (padding 24px)
  CardTitle
    ↕ 8px
  Optional description
CardContent (padding 24px, top: 0 if header present)
  Field group 1
    ↕ 20px
  Field group 2
```

Within a field group:
```
Label          ← text-body-medium font-medium
  ↕ 8px
Input
  ↕ 4px (if helper present)
Helper text    ← text-body-small text-muted
```

### Two-column form row

- 20px gap between columns on desktop.
- Single column below 768px.

### TC Card Grid (Step 2)

- 4 columns at ≥1280px, 3 at ≥1024px, 2 at ≥768px, 1 below.
- Gap: 12px.
- Each card min-height ~96px.

### Action Bar

- 16px vertical padding, 32px horizontal.
- 8px gap between buttons on the same side.

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Badge, Checkbox, small inline elements |
| `--radius-md` | `6px` | Inputs, Buttons, Select triggers |
| `--radius-lg` | `8px` | **Default for Cards**, Alerts, drop zones, metric blocks |
| `--radius-full` | `9999px` | Step number circles, pill badges |

Never use radius larger than 8px for cards.

## Elevation (Shadows)

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-none` | `none` | **Default for Cards** |
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.04)` | Very subtle hover on clickable cards (rarely) |
| `--shadow-md` | `0 4px 12px -2px rgb(0 0 0 / 0.08)` | Dropdowns, popovers, tooltips |
| `--shadow-lg` | `0 10px 30px -4px rgb(0 0 0 / 0.1)` | Modals (not in MVP) |

### Shadow rules

- ✅ Cards: border + shadow-none.
- ✅ Dropdowns/tooltips: border + shadow-md.
- ❌ No stacked shadows.
- ❌ No colored shadows.

## Focus States

```css
outline: 2px solid var(--color-ring);
outline-offset: 2px;
```

Never remove focus styles.

## Responsive Breakpoints

| Breakpoint | Min width | Behavior |
|-----------|-----------|----------|
| sm | 640px | Single column forms, single TC grid column |
| md | 768px | Two-column forms, 2-column TC grid |
| lg | 1024px | 3-column TC grid, 2-column metric blocks |
| xl | 1280px | 4-column TC grid, 4-column metric blocks, inner max-width kicks in |

### Below md (mobile)

- Step tabs become horizontally scrollable (do NOT collapse into dropdown).
- Content padding reduces from 32px to 16px.
- Metric blocks stack single-column.
