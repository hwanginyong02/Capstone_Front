# Spacing, Radius & Elevation Tokens

## Spacing Scale

간격은 4px 격자 위에 둔다. 큰 간격(카드 사이, 영역 여백)은 8px 의 배수를 쓰고(`docs/MATERIAL_PICKER.md` §10 "8px 단위"), 4px·12px·20px 는 아이콘 옆·필드 사이 같은 촘촘한 자리에만 쓴다. Do NOT use arbitrary pixel values like `7px` or `13px`.

아래 `--space-*` 는 CSS 토큰이 아니라 이름표다. `src/styles/theme.css` 는 간격 토큰을 만들지 않고, Tailwind 기본 간격과 1:1 로 쓴다(`--space-3` = 12px = `gap-3`, `--space-12` = 48px = `mb-12`).

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Icon-to-adjacent-text gap, checkbox-to-label gap |
| `--space-2` | `8px` | Label-to-input gap, badge internal padding, button icon gap |
| `--space-3` | `12px` | Between stacked fields in a form group, grid gap for dense cards |
| `--space-4` | `16px` | Card internal padding (mobile), horizontal gap between siblings |
| `--space-5` | `20px` | Between form field groups inside a card |
| `--space-6` | `24px` | Card internal padding (desktop), gap between sibling cards |
| `--space-8` | `32px` | Content area side padding, gap from page title to first card |
| `--space-10` | `40px` | Gap between major sections |
| `--space-12` | `48px` | Top padding above the page title, bottom padding above action bar |

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
- On screens narrower than 1344px (1280 + 2×32), content simply takes full width minus the padding. 코드에서는 `max-w-[1344px] px-8` 로 쓴다.

### Page title → first card

- `--space-8` (32px) between subtitle and first card.

### Between sibling cards

- `--space-6` (24px) default.
- `--space-10` (40px) when separating logically distinct sections.

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

### Grid of selectable cards (지표 selection)

- 4 columns at `≥1280px`, 3 at `≥1024px`, 2 at `≥768px`, 1 below.
- Gap: `--space-3` (12px).
- Each card min-height ~96px for consistent visual rhythm across varied content.

### Action bar internal

- Vertical padding: `--space-4` (16px) top and bottom.
- Horizontal padding: `--space-8` (32px), same as content side padding.
- Button-to-button gap (when multiple on same side): `--space-2` (8px).

## Border Radius

버튼·카드·입력은 8px, 체크박스는 4px 이다(`docs/MATERIAL_PICKER.md` §10). 값은 `src/styles/theme.css`(`--radius: 0.5rem` 기준)다.

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Badge, Checkbox, small inline elements |
| `--radius-md` | `8px` | Inputs, Buttons, Select triggers |
| `--radius-lg` | `8px` | **Default for Cards**, Alert boxes, drop zones, metric blocks |
| (`rounded-full`) | `9999px` | Step number circles, tag pills — theme.css 토큰이 아니라 Tailwind 기본 유틸이다 |

Do NOT use `--radius-xl` or anything above 8px for cards. Linear/Vercel use 8px; anything larger drifts toward friendly/playful territory.

## Elevation (Shadows)

Elevation is deliberately minimal. Surfaces sit flat. Shadows appear only on floating layers (popovers, dropdowns, tooltips).

`src/styles/theme.css` 에는 그림자 토큰(`--shadow-*`)이 없다. Tailwind 기본 유틸을 쓴다.

| 유틸 | Usage |
|-------|-------|
| (없음) | **Default for Cards.** They rely on border, not shadow. |
| `shadow-sm` | Rarely used — very subtle lift on hover for clickable cards |
| `shadow-md` | Dropdowns, popovers, tooltips — floating UI only |
| `shadow-lg` | Modals |

### Shadow rules

- ✅ Cards: `border`, no shadow.
- ✅ Dropdowns/tooltips: `border` + `shadow-md`.
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
| `sm` | `640px` | Single column forms, single column 지표 grid |
| `md` | `768px` | Two-column form rows, 2-column 지표 grid |
| `lg` | `1024px` | 3-column 지표 grid, 단계 표시줄이 본문 오른쪽으로 간다 |
| `xl` | `1280px` | 4-column 지표 grid, inner max-width kicks in |

### Below `md` (mobile)

- 세로 단계 표시줄(`StepRail`)이 본문 위로 올라간다(`lg` 미만).
- Action bar buttons remain side-by-side but narrower.

Mobile is not a primary target for this product (users are entering large files on desktops), but the layout must remain usable.
