# Typography Design Tokens

## Philosophy

Following **Linear/Vercel/Supabase** conventions: precise sans-serif for all UI, monospace for numeric values and code, generous line-height for Korean readability. Hierarchy comes from size and weight — never from color substitution.

## Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | `'Pretendard Variable', 'Pretendard', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif` | All UI text |
| `--font-mono` | `'JetBrains Mono', 'D2Coding', 'SF Mono', Menlo, monospace` | TC IDs, metric values, code, column names, tabular numbers |

Do NOT use a display/serif font. Do NOT use Geist (Pretendard handles Korean better).

## Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-weight-regular` | `400` | Body text, helper text |
| `--font-weight-medium` | `500` | Labels, active tab label, table headers |
| `--font-weight-semibold` | `600` | Card titles, alert titles |
| `--font-weight-bold` | `700` | Page title (H1), metric values |

## Type Scale

### Headings

| Token | Size / Line-height | Weight | Usage |
|-------|-------------------|--------|-------|
| `--text-heading-large` | `1.5rem / 2rem` (24px/32px) | 700 | Page title (H1) |
| `--text-heading-medium` | `1.125rem / 1.625rem` (18px/26px) | 600 | Card title, section header |
| `--text-heading-small` | `1rem / 1.5rem` (16px/24px) | 600 | Subsection title, product name in app header |

### Body

| Token | Size / Line-height | Weight | Usage |
|-------|-------------------|--------|-------|
| `--text-body-large` | `1rem / 1.625rem` | 400 | Rarely used |
| `--text-body-medium` | `0.875rem / 1.375rem` (14px/22px) | 400 | **Default body** — form fields, helper text |
| `--text-body-small` | `0.8125rem / 1.25rem` (13px/20px) | 400 | Table cells, sublabels, metric descriptions |
| `--text-body-xs` | `0.75rem / 1.125rem` (12px/18px) | 400 | Version label, footnotes, breadcrumb |

### Numeric / Mono

| Token | Size / Line-height | Weight | Usage |
|-------|-------------------|--------|-------|
| `--text-metric-large` | `2rem / 2.5rem` | 700 | Hero metric values in Step 6 |
| `--text-metric-medium` | `1.25rem / 1.75rem` | 600 | Secondary metric values |
| `--text-mono-small` | `0.75rem / 1.125rem` | 500 | TC IDs, uppercase column labels, code snippets |

## Usage Rules

### Always use Medium Body for form UI

All inputs, labels, dropdowns, buttons use `--text-body-medium`. Korean needs 14px minimum.

### Page Title Pattern

```jsx
<h1 className="text-heading-large text-foreground">컬럼 매핑 확인</h1>
<p className="text-body-medium text-foreground-muted mt-2">
  업로드한 파일의 컬럼을 시스템이 자동으로 인식했습니다.
</p>
```

### App Header Pattern

```jsx
<div className="flex items-center gap-3">
  <Logo className="h-6 w-6" />
  <div className="flex flex-col">
    <span className="text-heading-small leading-none">ML 성능평가</span>
    <span className="text-body-xs text-foreground-muted">ISO/IEC 4213 기반</span>
  </div>
</div>
```

### Card Title Pattern

```jsx
<CardHeader>
  <CardTitle className="text-heading-medium">회사 개요</CardTitle>
</CardHeader>
```

No icons in CardTitle. Section category indicators go ABOVE the card as uppercase mono labels.

### Metric Display Pattern

```jsx
<div className="space-y-1">
  <span className="text-mono-small text-foreground-muted uppercase tracking-wide">
    ACCURACY (TC1)
  </span>
  <div className="text-metric-large font-mono tabular-nums text-foreground">
    0.8000
  </div>
  <span className="text-body-small text-foreground-muted">
    전체 정확도 · 36/45
  </span>
</div>
```

Metric values ALWAYS use `font-mono` + `tabular-nums`.

### TC ID and Column Role Pattern

```jsx
<span className="text-mono-small font-medium uppercase">TC1</span>
<span className="font-mono">y_true</span>
<span className="font-mono">prob_class_*</span>
```

Never in sans-serif default font.

### Tab Label Pattern

```jsx
{/* Active */}
<span className="text-body-medium font-medium text-foreground">컬럼 매핑</span>

{/* Completed */}
<span className="text-body-medium text-foreground">컬럼 매핑</span>

{/* Upcoming */}
<span className="text-body-medium text-foreground-muted">컬럼 매핑</span>
```

## What Not to Do

- ❌ Don't use `--text-body-xs` for interactive elements.
- ❌ Don't use italic.
- ❌ Don't underline except for actual hyperlinks.
- ❌ Don't adjust letter-spacing on Korean text. Only on uppercase mono labels (`tracking-wide`).
- ❌ Don't mix weight jumps larger than 200 on the same screen (add 500/600 intermediate).
- ❌ Don't use numeric values without `tabular-nums` in tables or metric displays.
