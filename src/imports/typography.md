# Typography Design Tokens

## Philosophy

Following **Linear/Vercel/Supabase** conventions: precise sans-serif for all UI, monospace for numeric values and code, generous line-height for Korean readability. Hierarchy comes from size and weight — never from color substitution.

## Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | `'Pretendard Variable', 'Pretendard', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif` | All UI text |
| `--font-mono` | `'JetBrains Mono', 'D2Coding', 'SF Mono', Menlo, monospace` | TC IDs, metric values, code, filenames, tabular numbers |

Do NOT use a display/serif font anywhere. Do NOT use Geist (Vercel's font) — Pretendard is better for Korean.

## Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-weight-regular` | `400` | Body text, helper text |
| `--font-weight-medium` | `500` | Labels, active tab label, table headers |
| `--font-weight-semibold` | `600` | Card titles, page subtitle, alert titles |
| `--font-weight-bold` | `700` | Page title (H1), metric values |

## Type Scale

Sizes use rem. Line-heights tuned for Korean readability.

### Headings

| Token | Size / Line-height | Weight | Usage |
|-------|-------------------|--------|-------|
| `--text-heading-large` | `1.5rem / 2rem` (24px/32px) | 700 | Page title (H1) — "기본 정보 입력", "시험항목 선택" |
| `--text-heading-medium` | `1.125rem / 1.625rem` (18px/26px) | 600 | Card title, section header inside a card |
| `--text-heading-small` | `1rem / 1.5rem` (16px/24px) | 600 | Subsection title, table group header, product name in app header |

### Body

| Token | Size / Line-height | Weight | Usage |
|-------|-------------------|--------|-------|
| `--text-body-large` | `1rem / 1.625rem` (16px/26px) | 400 | Rarely used — reserved for focused reading blocks |
| `--text-body-medium` | `0.875rem / 1.375rem` (14px/22px) | 400 | **Default body** — form fields, helper text, most UI content |
| `--text-body-small` | `0.8125rem / 1.25rem` (13px/20px) | 400 | Table cells, sublabels, metric descriptions |
| `--text-body-xs` | `0.75rem / 1.125rem` (12px/18px) | 400 | Version label, footnotes, breadcrumb context |

### Numeric / Mono

| Token | Size / Line-height | Weight | Usage |
|-------|-------------------|--------|-------|
| `--text-metric-large` | `2rem / 2.5rem` (32px/40px) | 700 | Hero metric values on result preview ("0.8000") |
| `--text-metric-medium` | `1.25rem / 1.75rem` (20px/28px) | 600 | Secondary metric values in compact dashboards |
| `--text-mono-small` | `0.75rem / 1.125rem` (12px/18px) | 500 | TC IDs ("TC1"), uppercase column labels, code snippets |

## Usage Rules

### Always use Medium Body for form UI

Inputs, labels, dropdown options, button labels — all use `--text-body-medium`. Korean characters need 14px minimum for comfortable reading.

### Page Title Pattern

```jsx
<h1 className="text-heading-large text-foreground">기본 정보 입력</h1>
<p className="text-body-medium text-foreground-muted mt-2">
  평가에 필요한 기본 정보를 입력해주세요.
</p>
```

The subtitle is always `text-body-medium` with muted color. Never use a heading size for the subtitle — that creates false hierarchy.

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

No icons in the CardTitle. If a section genuinely needs a category indicator, use a small uppercase label ABOVE the card (like `text-mono-small text-foreground-muted uppercase`).

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

Metric values ALWAYS use `font-mono` + `tabular-nums` to prevent visual jitter.

### TC ID Badge Pattern

TC IDs render in monospace and uppercase:

```jsx
<span className="text-mono-small font-medium uppercase">TC1</span>
```

Never write TC IDs in the sans-serif default font.

### Tab Label Pattern

```jsx
{/* Active tab */}
<span className="text-body-medium font-medium text-foreground">기본 정보</span>

{/* Completed tab */}
<span className="text-body-medium text-foreground">기본 정보</span>

{/* Upcoming tab */}
<span className="text-body-medium text-foreground-muted">기본 정보</span>
```

## What Not to Do

- ❌ Do NOT use `--text-body-xs` for interactive elements (buttons, links, inputs).
- ❌ Do NOT apply `italic` anywhere.
- ❌ Do NOT use `text-decoration: underline` except on actual hyperlinks.
- ❌ Do NOT apply letter-spacing adjustments to Korean text. Only to uppercase mono labels (use `tracking-wide`).
- ❌ Do NOT mix weight jumps larger than 200 on the same screen. (e.g., 400 next to 700 with nothing in between feels harsh — add a 500 or 600 intermediate layer.)
- ❌ Do NOT use numeric characters without `tabular-nums` in tables or metric displays. They will jitter when values change.
