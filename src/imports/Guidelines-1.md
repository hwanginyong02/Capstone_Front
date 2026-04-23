# Guidelines

This project is a web application that automates the generation of **ML model performance evaluation reports** ("시험성적서") based on the **KS X ISO/IEC TS 4213:2022** standard. End users are enterprises that need a formal, credible test report for their ML classification models.

The product name is **"ML 성능평가 / ISO/IEC 4213 기반"**.

## Source of Truth

- **SPEC.md** (in the project root, not in guidelines/): single source of truth for TC-to-column requirements, validation rules, and task-type-specific logic. All business-logic questions about "which column is required for TC X" must reference SPEC.md, NOT the design guidelines.
- **guidelines/**: design-only rules. Visual language, layout, tone, component usage.

## Design Inspiration

The visual language draws directly from **Linear**, **Vercel**, and **Supabase** dashboards:

- Crisp white surfaces on a very light neutral page background
- Sharp, precise typography with generous line-height
- Flat surfaces — borders do the work, not shadows
- Full-width layout that trusts the data to fill the space
- One accent color (a considered blue) that appears only on interactive elements

This is NOT a warm/friendly tool (Notion, Airbnb). It is NOT a playful tool (Figma, Miro). It is a precise instrument.

## Tone & Atmosphere

- **Precise and calm.** Every pixel should feel intentional.
- **Dense but never cluttered.** Users see many numbers; whitespace creates rhythm.
- **Confident and quiet.** Short labels, direct helper text, no unnecessary icons.

## Always Read First

Before generating any UI, read these files in order:

1. `overview-components.md` — component catalog and shared patterns
2. `design-tokens/colors.md` — color roles and semantic usage
3. `design-tokens/typography.md` — type scale
4. `design-tokens/spacing.md` — spacing, radius, elevation

## Core Layout — Full-width with Top Tab Navigation

```
┌─────────────────────────────────────────────────────────┐
│  App Header (56px fixed)                                │
│  [Logo] ML 성능평가        (context)         [?]        │
├─────────────────────────────────────────────────────────┤
│  Step Tabs (48px fixed)                                 │
│  ① 기본 정보  ② 시험항목  ③ 데이터 업로드  ...          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   content area (full-width, 32px side padding,          │
│   inner max-width: 1280px, centered)                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Action Bar (72px sticky bottom)                        │
│  [← 이전]                              [다음 단계 →]    │
└─────────────────────────────────────────────────────────┘
```

### Layout rules

- **No left sidebar.** All navigation is at the top.
- **Full width with inner cap.** 32px viewport padding, 1280px inner max-width.
- **Sticky action bar at the bottom.** Stays visible as content scrolls.
- **No floating help bubble.** Help icon lives in the top-right of the app header.

## The 6-Step Workflow

The workflow was simplified from 8 steps to 6. Class detection and prediction settings are no longer separate steps — their necessary inputs are absorbed into Step 2 and Step 4.

1. **기본 정보** — Company profile, model info, task type selection
2. **시험항목** — TC selection (filtered by task type), TC5 beta input inline
3. **데이터 업로드** — CSV/JSON file drop zone
4. **컬럼 매핑** — LLM auto-mapping review; positive_class and threshold inputs when applicable; compatibility check against Step 2's selected TCs
5. **데이터 검증** — Final validation of all inputs with a complete settings summary
6. **결과 미리보기** — Metrics dashboard before report generation

### Tab states

- **Active** (current step): step number in a solid primary circle, label in `text-foreground font-medium`, 2px primary-colored underline.
- **Completed**: step number replaced with a Check icon in `bg-primary-subtle` circle, label in `text-foreground`, clickable with hover state.
- **Upcoming**: step number in an outlined circle, label in `text-muted-foreground`, not clickable.

Do NOT use a separate progress bar — the tab states ARE the progress indicator.

## Where Each Former-Step's Functionality Now Lives

| Former standalone step | Where it lives now |
|------------------------|-------------------|
| Class detection display | Step 4 (sample value preview) + Step 6 (full distribution visualization) |
| Positive class selection (binary) | Step 4, conditional card appears when task_type is binary |
| Threshold setting (binary with score) | Step 4, conditional card appears when score is mapped without y_pred |
| Threshold setting (multilabel with prob) | Step 4, conditional card appears when prob_label_* is mapped without y_pred |
| Prediction preview | Removed — argmax/threshold logic is self-evident, preview only in Step 6 |
| TC5 beta input | Step 2, appears inline when TC5 is selected |

## Component Preference Rules

IMPORTANT: Always prefer shadcn/ui components over custom HTML.

- Use `Card`, `CardHeader`, `CardContent` for every grouped content block.
- Use `Button` with correct variant (`default`, `outline`, `ghost`, `secondary`).
- Use `Input`, `Label`, `Select`, `RadioGroup`, `Checkbox` for all form inputs.
- Use `Badge` for status labels and inline tags.
- Use `Alert` with `variant="default" | "destructive"` for messages.
- Use `Tabs` component from shadcn for the top navigation (with custom styling).
- Use `Table` for any tabular data.

## Dynamic UI Rules (critical for Step 2 and Step 4)

These rules ensure the UI adapts to the user's choices earlier in the flow. Claude must handle these conditional renderings correctly.

### Step 2 — TC requirement Badges

Each TC card displays a small Badge indicating extra requirements (from SPEC.md):

- `score 필요` (orange outline) — for binary TC9 AUROC, TC10 AUPRC, TC19 Log Loss
- `prob 필요` (orange outline) — for multiclass TC6 KL Divergence
- `β값 필요` (orange outline) — for TC5 Fβ Score (all task types)

When TC5 is selected → a "Fβ Score 설정" card appears below the grid with a numeric input for β.

### Step 4 — Conditional cards based on mapping + task_type

After LLM auto-mapping:

- **If task_type is binary AND y_true is mapped**: show "Positive Class 지정" card with radio cards of each y_true unique value.
- **If task_type is binary AND score is mapped AND y_pred is NOT mapped**: show "Threshold 설정" card (slider + input, default 0.5).
- **If task_type is multilabel AND prob_label_* is mapped AND y_pred is NOT mapped**: show "Threshold 설정" card (single threshold for all labels, default 0.5).
- Always show a "Compatible TCs" summary: checks the Step 2 TC selection against the current mapping using the rules in SPEC.md. If a selected TC is incompatible (e.g., TC9 selected but no `score` column), display a blocking Alert with actions `[시험항목으로 돌아가기]` and `[자동 해제]`.

### Step 5 — Settings summary must include all runtime parameters

The summary card shows:
- Basic info (from Step 1)
- Selected TCs with parameters (β=1.0 if TC5)
- File info (from Step 3)
- Column mapping result (from Step 4)
- Positive class (if binary)
- Threshold (if applicable)
- Prediction mode: "y_pred 직접 사용" / "score → threshold 적용" / "prob_class_* → argmax" / "prob_label_* → threshold"

## Writing Voice (Korean UI Strings)

- **Labels**: short noun phrases.
- **Helper text**: single sentence, direct.
- **Validation messages**: start with what is wrong. "샘플 수가 적습니다." not "샘플을 더 수집하세요."
- **Buttons**: verb + arrow for direction. "다음 단계 →", "← 이전".

Never use casual language, emoji in production copy, or exclamation marks outside success confirmations.

## Do Not

- ❌ Do NOT use gradients, glows, or animated background effects.
- ❌ Do NOT use rounded corners larger than 8px on cards.
- ❌ Do NOT use shadows on default card states. Borders only.
- ❌ Do NOT use more than ONE accent color per screen.
- ❌ Do NOT use icons decoratively next to text labels.
- ❌ Do NOT use a left sidebar anywhere.
- ❌ Do NOT stack more than 3 nested containers.
- ❌ Do NOT bring back the deleted "class detection" or "prediction settings" steps.
- ❌ Do NOT hardcode TC compatibility rules in the UI — always reference SPEC.md logic.
