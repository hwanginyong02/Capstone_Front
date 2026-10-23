# Color Design Tokens

> 정본: `docs/MATERIAL_PICKER.md` §10 "인증 네이비"(2026-10-15). 아래 값은 그 표를 옮긴 것이고,
> 구현은 `src/styles/theme.css` 다. §10 에 없는 값(hover, 성공·주의)은 따로 표시했다.

## Philosophy

The palette is **인증 네이비**: a white canvas, near-black navy text, a single deep navy accent, and one error color. Saturated colors appear only when they carry meaning (error, and the existing success/warning states).

Never use color as decoration. Every colored element must communicate state, hierarchy, or interactivity.

## Token Naming Pattern

`--color-{role}` 또는 `--color-{role}-{variant}` 다. 쓰임(배경·글자·테두리)은 이름에 넣지 않고 Tailwind 유틸 앞말(`bg-`·`text-`·`border-`)이 정한다.

- `role`: `background`, `card`, `muted`, `border`, `foreground`, `primary`, `destructive`, `success`, `warning`, `ring` 등
- `variant`: `subtle`(연한 바탕), `strong`(진한 글자·테두리), `hover`, `foreground`(그 색 위의 글자), `border`, `secondary` (optional)
- 예: `--color-primary-subtle`, `--color-warning-strong`, `--color-border-strong`, `--color-foreground-secondary`

In `theme.css` the variables drop the `--color-` prefix (`--primary`, `--muted-foreground`) and `@theme inline` maps them to `--color-*`, which is what makes Tailwind classes such as `bg-primary` work.

## Core Palette

### Neutrals (the foundation — used for ~80% of the UI)

Cool neutrals with a faint navy cast.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#FFFFFF` | Page background |
| `--color-card` | `#FFFFFF` | Card surfaces, inputs, dropdowns |
| `--color-muted` | `#F4F5F7` | Bands and side panels (e.g. the diagram lanes on 평가 흐름 만들기 — `DiagramLane.tsx` uses `bg-muted/50`, and the StepRail panel), table header row, disabled input background |
| `--color-border` | `#E6E8EC` | Dividers between rows, input borders, default borders |
| `--color-border-strong` | `#C9CED6` | Card borders, hover state on unselected cards |
| `--color-foreground` | `#0D1420` | Headings and names (page title, card name, field name) |
| `--color-foreground-secondary` | `#1F2A3A` | Body text |
| `--color-foreground-muted` | `#4A5568` | Secondary text, helper text, descriptions, formats. In `theme.css` this is `--muted-foreground` |
| `--color-foreground-subtle` | `#667080` | Inactive steps, placeholder text |

`--color-foreground-muted` stays above 4.5:1 on every background here (7.5:1 on white, 6.7:1 on `--color-primary-subtle`, 7.0:1 on `--color-muted`), so there is no separate muted color for tinted backgrounds.

### Primary (single accent — action color)

A deep, formal navy. It marks primary actions and the "saved" state.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#1D3B6E` | Primary button bg, saved mark, selected card border, focus ring |
| `--color-primary-hover` | `#16305A` | Hover state for primary button *(not in §10; a darker step of the accent)* |
| `--color-primary-subtle` | `#EDF2F9` | Saved / selected card background |
| `--color-primary-foreground` | `#FFFFFF` | Text/icon on primary-colored backgrounds |
| `--color-ring` | `#1D3B6E` | Focus ring (2px outline, 2px offset) |

### Semantic Status Colors

Used ONLY to communicate state. Never decoratively.

**Danger (error)** — blocking error, structural data problem. §10 calls this the warning color and reserves it for **real errors only**.

| Token | Value |
|-------|-------|
| `--color-danger` | `#AA0808` (`--destructive` in `theme.css`) |
| `--color-danger-foreground` | `#FFFFFF` |

There is no `-subtle` / `-border` token for danger. Tinted error surfaces use the base color with opacity (`bg-destructive/5`, `border-destructive/30`).

**Success (green)** and **Warning (amber)** are not defined by §10. They keep the colors the screens already used, now as tokens.

| Token | Success | Warning |
|-------|---------|---------|
| `--color-{role}` | `#16A34A` | `#D97706` |
| `--color-{role}-strong` | `#15803D` | `#B45309` |
| `--color-{role}-subtle` | `#F0FDF4` | `#FFFBEB` |
| `--color-{role}-border` | `#BBF7D0` | `#FDE68A` |
| `--color-{role}-foreground` | `#FFFFFF` | `#FFFFFF` |

`-strong` is the text color on the `-subtle` background. The base colors reach only 3.3:1 / 3.1:1 there, so use them for icons only.

## Decision Tree

**Need a background?**
- Whole page, card → `--color-background` / `--color-card` (both white)
- Band, side panel, diagram lane → `--color-muted`
- Header row of a table / code block → `--color-muted`
- Saved or selected card → `--color-primary-subtle`
- Active step marker → `--color-primary` (filled, with `--color-primary-foreground` text)

**Need text?**
- Headings, names → `--color-foreground`
- Body text → `--color-foreground-secondary`
- Helper text, descriptions, formats → `--color-foreground-muted`
- Inactive step, placeholder → `--color-foreground-subtle`
- On primary-filled bg → `--color-primary-foreground`
- Error message → `--color-danger`
- On success/warning **subtle** bg → `--color-{role}-strong`

**Need a border?**
- Card → `--color-border-strong`
- Divider, input → `--color-border`
- Selected card (2px) → `--color-primary`
- Alert box → `--color-{role}-border` with `--color-{role}-subtle` background

**Need interactive state?**
- Focus on any interactive element → 2px `--color-ring` outline, 2px offset

## Critical Rules

### Correct pairings

- ✅ Warning alert: `bg-warning-subtle` + `border-warning-border` + `text-warning-strong` (icon `text-warning`)
- ✅ Success alert: `bg-success-subtle` + `border-success-border` + `text-success-strong` (icon `text-success`)
- ✅ Primary button: `bg-primary` + `text-primary-foreground` (white on navy)
- ✅ Saved card: `bg-primary-subtle` + check mark in `text-primary`
- ✅ Error message: `text-destructive` on white

### Wrong pairings (common mistakes)

- ❌ Warning alert: `bg-warning-subtle` + `text-warning` for body text (3.1:1, below the 4.5:1 text minimum)
- ❌ Primary button: `bg-primary-subtle` + `text-primary-foreground` (white on very pale navy = invisible)
- ❌ Stock Tailwind colors (`bg-blue-50`, `text-slate-500`) or raw hex in components. Use the tokens; `src/test/noStockColors.test.ts` enforces this for app screens
- ❌ Decorative use: using `--color-success` on a static check-mark icon that has no success meaning

### Multi-color restraint

- Only ONE accent (navy) per screen for non-status elements.
- Use the danger color for real errors only.
- At most ONE status color visible at a time in validation messages. If you have 3 issues, consolidate into one alert with bullets.
- Badges use `variant="secondary"` (muted gray) unless they carry a specific status.

## Dark Mode

Out of scope for MVP. Do NOT generate dark mode styles. `theme.css` 에 shadcn 기본 `.dark` 블록이 남아 있지만 앱은 쓰지 않는다(값도 인증 네이비가 아니다). Leave the color variables defined in a way that a `[data-theme="dark"]` override can be added later without restructuring component code.
