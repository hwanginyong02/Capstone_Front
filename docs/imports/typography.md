# Typography Design Tokens

## Philosophy

Following **Linear/Vercel/Supabase** conventions: precise sans-serif for all UI, monospace for numeric values and code, generous line-height for Korean readability. Hierarchy comes from size and weight — never from color substitution.

## Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | `'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif` | All UI text |
| `--font-mono` | `'JetBrains Mono', 'SF Mono', Menlo, monospace` | 지표 IDs, metric values, code, filenames, tabular numbers |

값은 `src/styles/fonts.css` 그대로다. Pretendard Variable 과 JetBrains Mono 만 불러온다.

Do NOT use a display/serif font anywhere. Do NOT use Geist (Vercel's font) — Pretendard is better for Korean.

## Font Weights

굵기는 두 가지다(`docs/MATERIAL_PICKER.md` §10).

| Token | Value | Usage |
|-------|-------|-------|
| `--font-weight-medium` | `500` | 화면 제목, 이름, 버튼, 라벨, 표 머리, 현재 단계 |
| `--font-weight-normal` | `400` | 본문, 설명, 도움말 |

`src/styles/theme.css` 에는 이 두 토큰만 있다(regular·semibold·bold 토큰은 없다). 옛 화면 일부에는 Tailwind 의 `font-semibold`(600)·`font-bold`(700)가 남아 있다.

## Type Scale

요약: 화면 제목 22px/500, 이름·버튼 16px/500, 설명 14px/400(`docs/MATERIAL_PICKER.md` §10). 아래 토큰 값은 `src/styles/theme.css` 의 `@theme` 블록 그대로다.

Sizes use rem. Line-heights tuned for Korean readability.

### Headings

| Token | Size / Line-height | Weight | Usage |
|-------|-------------------|--------|-------|
| `--text-heading-large` | `1.375rem / 1.875rem` (22px/30px) | 500 | Page title (H1) — "의뢰자 정보", "지표와 합격 기준" |
| `--text-heading-medium` | `1.125rem / 1.625rem` (18px/26px) | 500 | Card title, section header inside a card |
| `--text-heading-small` | `1rem / 1.5rem` (16px/24px) | 500 | Subsection title, table group header, product name in app header |

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
| `--text-mono-small` | `0.75rem / 1.125rem` (12px/18px) | 500 | 지표 IDs ("M1"), uppercase column labels, code snippets |

`theme.css` 에 `--text-metric-large`·`--text-metric-medium` 토큰도 남아 있지만 지금 화면은 쓰지 않는다.

## Usage Rules

### Always use Medium Body for form UI

Inputs, labels, dropdown options, button labels — all use `--text-body-medium`. Korean characters need 14px minimum for comfortable reading.

### Page Title Pattern

```jsx
<h1 className="text-heading-large text-foreground">의뢰자 정보</h1>
<p className="text-body-medium text-muted-foreground mt-2">
  성적서를 받는 회사와 용도를 입력해주세요.
</p>
```

The subtitle is always `text-body-medium` with muted color. Never use a heading size for the subtitle — that creates false hierarchy.

### App Header Pattern

```jsx
<div className="flex items-center gap-3">
  <Logo className="h-6 w-6" />
  <div className="flex flex-col">
    <span className="text-heading-small leading-none">ML 성능평가</span>
    <span className="text-body-xs text-muted-foreground">ISO/IEC 4213 기반</span>
  </div>
</div>
```

### Card Title Pattern

```jsx
<CardHeader>
  <CardTitle className="text-heading-medium">회사 개요</CardTitle>
</CardHeader>
```

No icons in the CardTitle. If a section genuinely needs a category indicator, use a small uppercase label ABOVE the card (like `text-mono-small text-muted-foreground uppercase`).

Metric values ALWAYS use `font-mono` + `tabular-nums` to prevent visual jitter.

### 지표 ID Badge Pattern

지표 IDs render in monospace and uppercase:

```jsx
<span className="text-mono-small font-medium uppercase">M1</span>
```

Never write 지표 IDs in the sans-serif default font.

## What Not to Do

- ❌ Do NOT use `--text-body-xs` for interactive elements (buttons, links, inputs).
- ❌ Do NOT apply `italic` anywhere.
- ❌ Do NOT use `text-decoration: underline` except on actual hyperlinks.
- ❌ Do NOT apply letter-spacing adjustments to Korean text. Only to uppercase mono labels (use `tracking-wide`).
- ❌ 새 화면에 500·400 밖의 굵기를 더하지 않는다. 옛 화면 일부(머리의 제품 이름, 일부 카드 제목 등)는 아직 `font-semibold`·`font-bold` 를 쓴다.
- ❌ Do NOT use numeric characters without `tabular-nums` in tables or metric displays. They will jitter when values change.
