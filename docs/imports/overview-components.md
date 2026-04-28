# Components Overview

This project uses **shadcn/ui** as the base component library, with Tailwind CSS v4 for styling. Always prefer shadcn components over hand-rolled HTML.

## Component Map

| Component | Purpose | When to use |
|-----------|---------|-------------|
| `Card` + `CardHeader` / `CardTitle` / `CardContent` | Grouped content block | Every section on every screen. |
| `Button` | Primary action trigger | Navigation, form submission, report generation. |
| `Input` | Single-line text entry | Text/numeric fields. |
| `Label` | Field label | Always paired with a form control. |
| `Select` | Dropdown (4–20 options) | Rare in this product — prefer RadioCard. |
| `RadioGroup` + custom cards | 2–4 mutually exclusive options | 시험결과서 용도, 평가 유형, 예측값 입력 방식. See **Radio Card**. |
| `Checkbox` + custom cards | Multi-select options | 시험항목 선택. See **Selectable Card**. |
| `Badge` | Short status label | 감지된 클래스, 상태 표시 (정상, 진행 중). |
| `Alert` | Warnings, success, errors | 검증 결과, 샘플 부족 경고. |
| `Table` | Tabular data | Class-wise metrics, class distribution, TC selection summary. |
| `Tabs` | Top step navigation | See **Step Tabs** pattern below. |
| `Tooltip` | Contextual help | Field-level help icons, metric definitions. |
| Drop zone (custom) | File upload | Step 3. See `components/drop-zone.md`. |

## Global Layout Components

### App Header (56px, fixed top)

```
┌─────────────────────────────────────────────────────┐
│  [Logo]  ML 성능평가       (context)        [?]    │
│           ISO/IEC 4213 기반                         │
└─────────────────────────────────────────────────────┘
```

Structure:
- **Left**: small square logo (24×24, primary color fill), followed by product name stacked — "ML 성능평가" in `text-heading-small`, "ISO/IEC 4213 기반" in `text-body-xs text-muted`.
- **Center** (optional, on steps 2+): context breadcrumb showing `회사명 · 실행명 · 버전` in `text-body-small text-muted` with `·` separators. Helps the user remember which evaluation they're working on.
- **Right**: help icon button (`?` in circle, ghost variant). No other items.
- **Bottom border**: 1px `border-border`. No shadow.

### Step Tabs (48px, fixed below header)

A horizontal row of 7 tabs, each equally distributed across the inner max-width (1280px, centered with the same 32px side padding as content).

Structure of each tab (clickable area):

```
  ┌─────────────────────┐
  │  ① 기본 정보        │  ← active: 2px primary underline at bottom
  └─────────────────────┘
```

Three visual states:

**Active** (current step):
- Step number in a filled circle: `bg-primary text-primary-foreground`, 20×20px, `text-mono-small`.
- Label: `text-body-medium font-medium text-foreground`.
- Bottom edge: 2px solid `border-primary`.
- No hover state (can't click itself).

**Completed**:
- Step number replaced by a `Check` icon (lucide-react, 16px) inside the circle. Circle has `bg-primary-subtle`, icon in `text-primary`.
- Label: `text-body-medium text-foreground`.
- Hover: entire tab gets `bg-muted`.
- Clickable. Cursor pointer.

**Upcoming**:
- Step number in an outlined circle: 1px `border-border`, `text-muted-foreground`, 20×20px.
- Label: `text-body-medium text-muted-foreground`.
- Cursor not-allowed. No hover.

### Action Bar (72px, sticky bottom)

```
┌─────────────────────────────────────────────────────┐
│  [← 이전]                          [다음 단계 →]    │
└─────────────────────────────────────────────────────┘
```

- Full viewport width, 1px top border (`border-border`), `bg-background`.
- Flex row `justify-between`, same 32px side padding as content.
- Left slot: `← 이전` in `outline` variant, hidden on step 1.
- Right slot: `다음 단계 →` in `default` variant, disabled until the step's validation passes.
- On step 7, the right slot has TWO buttons (`결과 내보내기 (JSON)` as `outline`, `시험성적서 생성` as `default`) with 8px gap.
- Sticky bottom — stays visible as main content scrolls.

## Content Patterns

### Page Header (inside main area)

Every screen's main content starts with:

```
기본 정보 입력                                              ← text-heading-large
평가에 필요한 기본 정보를 입력해주세요.                     ← text-body-medium text-muted
```

Followed by `--space-8` gap, then content. No icons in the page title. No decorative elements.

### Radio Card (single-select visual cards)

Used for 시험결과서 용도, 평가 유형, 예측값 입력 방식.

- Full-width card on mobile, flex row of equal-width cards on desktop (each `flex-1`).
- Internal padding: `--space-5`.
- Unselected: 1px `border-border`, `bg-card`.
- Selected: 2px `border-primary`, `bg-primary-subtle` (very faint tint).
- Hover (unselected only): `border-border-strong`, cursor pointer.
- Small filled circle indicator (●) in top-left when selected. No indicator when unselected (just the border change).
- Contents: bold title line (`text-body-medium font-semibold`), optional description below in `text-body-small text-muted`.

### Selectable Card (multi-select grid cards)

Used for 시험항목 선택 (TC1~TC23).

- Grid: 4 columns at `xl`, 3 at `lg`, 2 at `md`, 1 at `sm`.
- Gap: `--space-3`.
- Checkbox (16×16) in the top-left of the card.
- TC ID in small uppercase mono label (`text-mono-small`, e.g., `TC1`).
- Metric English name as primary title (`text-body-medium font-semibold`, e.g., `Accuracy`).
- Korean description in `text-body-small text-muted` (e.g., `전체 예측 정확도`).
- Selected state: 2px `border-primary`, `bg-primary-subtle`, checkbox filled with check icon.
- Hover (unselected): `border-border-strong`.
- Conditional settings (e.g., TC5 β value input) appear in a separate card below the grid, NOT inline within the selected card.

### Metric Block (horizontal grid on result preview)

Large dashboard-style metric display, used on step 7.

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ ACCURACY (TC1)          │ MACRO PRECISION         │ MACRO RECALL            │
│ 0.8000                  │ 0.8024                  │ 0.8000                  │
│ 전체 정확도 · 36/45     │ 클래스 평균 Precision   │ 클래스 평균 Recall      │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

- Grid of 4 columns at `xl`, 2 at `md`, 1 at `sm`.
- Each cell: top label in `text-mono-small text-muted uppercase`, value in `text-metric-large font-mono` with `tabular-nums`, sublabel below in `text-body-small text-muted`.
- Separated by 1px vertical dividers (`border-border`) between columns — NOT separate cards. This is a single card with internal dividers.
- Card padding: `--space-6`.

### Data Table (metrics, distribution, etc.)

Used for class-wise Precision/Recall/F1 breakdown, class distribution comparison, TC summary.

- shadcn `Table`.
- Header row: `text-body-small font-medium text-muted uppercase` with `bg-muted/40`.
- Data rows: `text-body-medium`. Numeric columns right-aligned with `tabular-nums`. Text columns left-aligned.
- Row separator: 1px `border-border`. No vertical grid lines.
- Hover on row: `bg-muted/50`.
- First column (usually class name) in `font-medium`.
- No border around the entire table — just the row separators and the containing Card's border.

### Alert (validation messages)

Use shadcn `Alert` with appropriate variant.

- Success: `bg-success-subtle`, `border-success-border`, check icon + title ("검증 성공") + one-line body.
- Warning: `bg-warning-subtle`, `border-warning-border`, triangle icon + title ("경고") + one-line body.
- Destructive: `bg-danger-subtle`, `border-danger-border`, X icon + title ("오류") + one-line body.
- Title in `text-body-medium font-semibold`. Body in `text-body-small`.
- Never stack more than 2 alerts on a single screen. If you have 3+ issues, consolidate into a single alert with a bullet list.

## Component Do's and Don'ts

- ✅ DO use `Card` for every block-level grouping. Never use raw `<div>` with borders.
- ✅ DO use shadcn `Alert` variants for all messages.
- ✅ DO use `Badge` with `variant="secondary"` for neutral tags (e.g., class pills like `cat`, `dog`).
- ✅ DO use `tabular-nums` Tailwind utility on every numeric value to prevent width jitter.
- ❌ DO NOT add `className` overrides that change the core colors of shadcn components. Adjust via design tokens instead.
- ❌ DO NOT use `shadow-md` or heavier on cards. Only use `shadow-md` for floating elements (tooltips, popovers, dropdown menus).
- ❌ DO NOT wrap already-bordered shadcn components (like Card) in another bordered div.
