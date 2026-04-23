# Color Design Tokens

## Philosophy

This palette mirrors the **Linear/Vercel/Supabase** aesthetic: a near-white canvas, almost-black text, a single considered blue accent, and restrained status colors. Saturated or bright colors appear only when they carry meaning (error, success, warning).

Never use color as decoration. Every colored element must communicate state, hierarchy, or interactivity.

## Token Naming Pattern

`--color-{category}-{role}-{variant}`

- `category`: `bg`, `text`, `border`, `ring`
- `role`: `primary`, `success`, `warning`, `danger`, `muted` (optional)
- `variant`: `subtle`, `strong`, `hover`, `pressed` (optional)

## Core Palette

### Neutrals (the foundation — used for ~80% of the UI)

Linear/Vercel-style palette: cool neutrals with a faint hint of slate. Avoid pure grays (too dead) and warm grays (too soft for this domain).

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#FAFAFA` | Page background — not pure white, subtle contrast against cards |
| `--color-card` | `#FFFFFF` | Card surfaces, inputs, dropdowns |
| `--color-muted` | `#F4F4F5` | Muted surface: table header row, code block, disabled input background |
| `--color-muted-hover` | `#EBEBED` | Hover on table rows, tab hover state |
| `--color-border` | `#E4E4E7` | Default borders on cards, inputs, tables |
| `--color-border-strong` | `#D4D4D8` | Dividers that need weight, hover state on unselected cards |
| `--color-foreground` | `#09090B` | Primary text, nearly black but not pure |
| `--color-foreground-muted` | `#71717A` | Secondary text, helper text, muted labels |
| `--color-foreground-subtle` | `#A1A1AA` | Placeholder text, least-prominent metadata |

### Primary (single accent — action color)

A confident, professional blue. Not too bright (avoid Facebook blue), not too dark (avoid navy). This is the Linear/Vercel palette feel.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#2563EB` | Primary button bg, active tab underline, selected card border, focus ring |
| `--color-primary-hover` | `#1D4ED8` | Hover state for primary button |
| `--color-primary-pressed` | `#1E40AF` | Active/pressed state |
| `--color-primary-subtle` | `#EFF6FF` | Selected card background tint, completed-step circle background |
| `--color-primary-foreground` | `#FFFFFF` | Text/icon on primary-colored backgrounds |
| `--color-ring` | `#2563EB` | Focus ring (2px outline, 2px offset) |

### Semantic Status Colors

Used ONLY to communicate state. Never decoratively.

**Success (green)** — validation passed, step completed, positive confirmation

| Token | Value |
|-------|-------|
| `--color-success` | `#16A34A` |
| `--color-success-subtle` | `#F0FDF4` |
| `--color-success-border` | `#BBF7D0` |
| `--color-success-foreground` | `#FFFFFF` |

**Warning (amber)** — non-blocking advisory ("샘플 수가 적습니다")

| Token | Value |
|-------|-------|
| `--color-warning` | `#D97706` |
| `--color-warning-subtle` | `#FFFBEB` |
| `--color-warning-border` | `#FDE68A` |
| `--color-warning-foreground` | `#FFFFFF` |

**Danger (red)** — blocking error, structural data problem

| Token | Value |
|-------|-------|
| `--color-danger` | `#DC2626` |
| `--color-danger-subtle` | `#FEF2F2` |
| `--color-danger-border` | `#FECACA` |
| `--color-danger-foreground` | `#FFFFFF` |

## Decision Tree

**Need a background?**
- Whole page → `--color-background`
- Card on top of the page → `--color-card`
- Header row of a table / code block → `--color-muted`
- Hover state on a table row → `--color-muted-hover`
- Selected card tint → `--color-primary-subtle`
- Active tab's step-number circle → `--color-primary` (filled, with `--color-primary-foreground` text)

**Need text?**
- Primary text (body, headings) → `--color-foreground`
- Secondary text (helper, sublabel, inactive tab) → `--color-foreground-muted`
- Placeholder → `--color-foreground-subtle`
- On primary-filled bg → `--color-primary-foreground`
- On success/warning/danger **filled** bg → corresponding `*-foreground`
- On success/warning/danger **subtle** bg → corresponding base color (e.g., `--color-warning` for text on `--color-warning-subtle`)

**Need a border?**
- Card/input default → `--color-border`
- Selected card (2px) → `--color-primary`
- Alert box → corresponding `*-border` with `*-subtle` background
- Divider with more weight → `--color-border-strong`

**Need interactive state?**
- Focus on any interactive element → 2px `--color-ring` outline, 2px offset

## Critical Rules

### Correct pairings

- ✅ Warning alert: `bg-warning-subtle` + `text-warning` (amber text on soft amber tint)
- ✅ Success alert: `bg-success-subtle` + `text-success` + `border-success-border`
- ✅ Primary button: `bg-primary` + `text-primary-foreground` (white on blue)
- ✅ Completed tab circle: `bg-primary-subtle` + check icon in `text-primary`

### Wrong pairings (common mistakes)

- ❌ Warning alert: `bg-warning-subtle` + `text-warning-foreground` (white text on soft amber = invisible)
- ❌ Primary button: `bg-primary-subtle` + `text-primary-foreground` (white on very-pale blue = invisible)
- ❌ Decorative use: using `--color-success` on a static check-mark icon that has no success meaning

### Multi-color restraint

- Only ONE accent (primary blue) per screen for non-status elements.
- At most ONE status color visible at a time in validation messages. If you have 3 issues, consolidate into one alert with bullets.
- Badges use `variant="secondary"` (muted gray) unless they carry a specific status.

## Dark Mode

Out of scope for MVP. Do NOT generate dark mode styles. Leave the color variables defined in a way that a `[data-theme="dark"]` override can be added later without restructuring component code.
