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

### Neutrals (foundation — ~80% of the UI)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#FAFAFA` | Page background |
| `--color-card` | `#FFFFFF` | Card surfaces, inputs, dropdowns |
| `--color-muted` | `#F4F4F5` | Muted surface: table header row, code block, disabled input |
| `--color-muted-hover` | `#EBEBED` | Hover on table rows, tab hover state |
| `--color-border` | `#E4E4E7` | Default borders |
| `--color-border-strong` | `#D4D4D8` | Hover state on unselected cards, weighty dividers |
| `--color-foreground` | `#09090B` | Primary text |
| `--color-foreground-muted` | `#71717A` | Secondary text, helper text, muted labels |
| `--color-foreground-subtle` | `#A1A1AA` | Placeholder text |

### Primary (single accent — action color)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#2563EB` | Primary button bg, active tab underline, selected card border, focus ring |
| `--color-primary-hover` | `#1D4ED8` | Hover state |
| `--color-primary-pressed` | `#1E40AF` | Active/pressed state |
| `--color-primary-subtle` | `#EFF6FF` | Selected card tint, completed-step circle bg |
| `--color-primary-foreground` | `#FFFFFF` | Text/icon on primary backgrounds |
| `--color-ring` | `#2563EB` | Focus ring |

### Semantic Status Colors

**Success (green)** — validation passed, step completed

| Token | Value |
|-------|-------|
| `--color-success` | `#16A34A` |
| `--color-success-subtle` | `#F0FDF4` |
| `--color-success-border` | `#BBF7D0` |
| `--color-success-foreground` | `#FFFFFF` |

**Warning (amber)** — non-blocking advisory, requirement indicators on TC cards

| Token | Value |
|-------|-------|
| `--color-warning` | `#D97706` |
| `--color-warning-subtle` | `#FFFBEB` |
| `--color-warning-border` | `#FDE68A` |
| `--color-warning-foreground` | `#FFFFFF` |

**Danger (red)** — blocking error, structural data problem, incompatible TC

| Token | Value |
|-------|-------|
| `--color-danger` | `#DC2626` |
| `--color-danger-subtle` | `#FEF2F2` |
| `--color-danger-border` | `#FECACA` |
| `--color-danger-foreground` | `#FFFFFF` |

## Decision Tree

**Background?**
- Whole page → `--color-background`
- Card on page → `--color-card`
- Table header / code block → `--color-muted`
- Selected card tint → `--color-primary-subtle`
- Active tab's circle → `--color-primary` (filled)

**Text?**
- Primary → `--color-foreground`
- Secondary → `--color-foreground-muted`
- Placeholder → `--color-foreground-subtle`
- On filled semantic bg → corresponding `*-foreground`
- On subtle semantic bg → corresponding base color

**Border?**
- Card/input default → `--color-border`
- Selected card (2px) → `--color-primary`
- Alert box → `*-border`
- Divider with weight → `--color-border-strong`

## Critical Rules

- ✅ Warning alert: `bg-warning-subtle` + `text-warning` (amber on amber tint)
- ✅ Success alert: `bg-success-subtle` + `text-success` + `border-success-border`
- ✅ TC requirement Badge: `text-warning` + `border-warning-border` with outline variant
- ❌ Warning alert: `bg-warning-subtle` + `text-warning-foreground` (white on pale = invisible)
- ❌ Decorative use of any status color

### Multi-color restraint

- Only ONE accent (primary blue) per screen for non-status elements.
- At most ONE status color per validation message. Consolidate multiple issues into one alert.
- Badges use `variant="secondary"` unless carrying a specific status.

## Dark Mode

Out of scope for MVP. Do NOT generate dark mode styles.
