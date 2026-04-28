# Components Overview

This project uses **shadcn/ui** as the base component library, with Tailwind CSS v4 for styling. Always prefer shadcn components over hand-rolled HTML.

## Component Map

| Component | Purpose | When to use |
|-----------|---------|-------------|
| `Card` + `CardHeader` / `CardTitle` / `CardContent` | Grouped content block | Every section on every screen. |
| `Button` | Primary action trigger | Navigation, form submission, report generation. |
| `Input` | Single-line text entry | Text/numeric fields. |
| `Label` | Field label | Always paired with a form control. |
| `Select` | Dropdown (4–20 options) | Column role dropdowns in Step 4. |
| `RadioGroup` + custom cards | 2–4 mutually exclusive options | 시험결과서 용도, 평가 유형, positive class selection. |
| `Checkbox` + custom cards | Multi-select options | 시험항목 선택. |
| `Badge` | Short status label | 감지된 클래스, TC requirement indicators, status chips. |
| `Alert` | Warnings, success, errors | 검증 결과, TC incompatibility, validation warnings. |
| `Table` | Tabular data | Column mapping, class-wise metrics, validation checks. |
| `Tabs` | Top step navigation | See **Step Tabs** pattern below. |
| `Tooltip` | Contextual help | Field-level help icons, metric definitions. |
| `Accordion` | Collapsible content | Template examples in Step 3, role explanations in Step 4. |
| `Slider` | Numeric range input | Threshold setting in Step 4. |
| `Switch` | Boolean toggle | Optional threshold activation. |
| Drop zone (custom) | File upload | Step 3. See **Drop Zone** pattern. |

## Global Layout Components

### App Header (56px, fixed top)

- **Left**: 24×24 square logo (primary color), product name "ML 성능평가" (text-heading-small), subtitle "ISO/IEC 4213 기반" (text-body-xs text-muted).
- **Center** (optional, from Step 2 onward): breadcrumb `회사명 · 실행명 · 버전` in text-body-small text-muted.
- **Right**: help icon button (ghost variant, `?` circle).
- **Bottom border**: 1px border-border. No shadow.

### Step Tabs (48px, fixed below header) — 6 tabs total

The workflow has **6 steps** (reduced from 8). Tabs distribute evenly across the inner 1280px centered container.

Step labels:
1. 기본 정보
2. 시험항목
3. 데이터 업로드
4. 컬럼 매핑
5. 데이터 검증
6. 결과 미리보기

Each tab contains a circled step number and a label. Three visual states:

**Active** (current step):
- Circle: `bg-primary text-primary-foreground`, 20×20px, text-mono-small.
- Label: text-body-medium font-medium text-foreground.
- Bottom edge: 2px solid border-primary.
- No hover state (not clickable).

**Completed**:
- Circle: `bg-primary-subtle` with `Check` icon (lucide-react, 16px) in text-primary.
- Label: text-body-medium text-foreground.
- Hover: entire tab gets `bg-muted`.
- Clickable; cursor pointer.

**Upcoming**:
- Circle: 1px border-border outline, text-muted-foreground, 20×20px.
- Label: text-body-medium text-muted-foreground.
- Not clickable.

### Action Bar (72px, sticky bottom)

- Full width, 1px top border (border-border), bg-background.
- Flex `justify-between`, 32px side padding.
- Left: `← 이전` outline variant, hidden on Step 1.
- Right: `다음 단계 →` default variant, disabled until step's validation passes.
- On Step 6: right side has TWO buttons (`결과 내보내기 (JSON)` outline + `시험성적서 생성` default) with 8px gap, and the left side shows `← 설정 수정` instead of `← 이전`.

## Content Patterns

### Page Header (inside main area)

```
페이지 제목                                  ← text-heading-large
한 줄 서브타이틀                             ← text-body-medium text-muted
```

Followed by `--space-8` gap, then content. No icons in the page title.

### Radio Card (single-select visual cards)

Used for 시험결과서 용도, 평가 유형, positive class selection.

- Flex row of equal-width cards on desktop (each `flex-1`), stacked on mobile.
- Internal padding: --space-5.
- Unselected: 1px border-border, bg-card.
- Selected: 2px border-primary, bg-primary-subtle.
- Hover (unselected only): border-border-strong.
- Small filled circle indicator (●) in top-left when selected.
- Contents: bold title (text-body-medium font-semibold), optional description below in text-body-small text-muted.

### Selectable Card (multi-select grid cards) — TC Selection

Used for 시험항목 선택 in Step 2.

- Grid: 4 columns at xl, 3 at lg, 2 at md, 1 at sm.
- Gap: --space-3.
- Checkbox (16×16) in the top-left of the card.
- TC ID in text-mono-small uppercase (e.g., `TC1`).
- Metric English name as primary title (text-body-medium font-semibold).
- Korean description in text-body-small text-muted.
- Selected: 2px border-primary, bg-primary-subtle, checkbox filled.
- Hover (unselected): border-border-strong.

#### Requirement Badges on TC Cards (critical)

Each TC card MAY carry a small Badge at the top-right corner indicating extra requirements. The Badge must use `variant="outline"` with a warning-tinted border (text-warning, border-warning-border).

Reference rules (from SPEC.md):
- Binary TC9, TC10, TC19 → Badge `score 필요`
- Multiclass TC6 → Badge `prob 필요`
- All task types TC5 → Badge `β값 필요`

If a TC has no extra requirement, no Badge is shown.

On hover of a TC card, show a Tooltip listing the minimum columns needed (e.g., "필수: y_true, score").

#### Conditional Beta Input Card (TC5 selected)

When TC5 is selected, a separate card appears below the grid:
- Title: "Fβ Score 설정"
- Label "β값" + numeric Input (min=0.1, max=10, step=0.1, default=1.0)
- Helper: "β=1: F1과 동일 / β>1: Recall 중시 / β<1: Precision 중시"
- Range hint: "권장 범위: 0.5 ~ 2.0"

### Metric Block (horizontal grid in Step 6)

Dashboard-style metric display used in Step 6 result preview.

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ ACCURACY (TC1)   │ MACRO PRECISION  │ MACRO RECALL     │ MACRO F1 (TC11)  │
│ 0.8000           │ 0.8024           │ 0.8000           │ 0.8006           │
│ 전체 정확도      │ 클래스 평균 P    │ 클래스 평균 R    │ 클래스 평균 F1   │
│ 36/45            │                  │                  │                  │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

- 4 columns at xl, 2 at md, 1 at sm.
- Each cell: top label (text-mono-small uppercase text-muted), value (text-metric-large font-mono tabular-nums), sublabel (text-body-small text-muted).
- Separated by 1px vertical dividers (border-border) — a single card with internal dividers, NOT separate cards.
- Card padding: --space-6.

### Data Table (metrics, distribution, mapping, validation)

- shadcn `Table`.
- Header row: text-body-small font-medium text-muted uppercase with `bg-muted/40`.
- Data rows: text-body-medium. Numeric columns right-aligned with tabular-nums. Text left-aligned.
- Row separator: 1px border-border. No vertical grid lines.
- Hover on row: `bg-muted/50`.
- First column (class name / column name) in font-medium.
- No outer border around the table; the containing Card provides that.

### Alert (validation and status messages)

Use shadcn `Alert` with appropriate variant.

- **Success**: `bg-success-subtle`, `border-success-border`, Check icon + title ("검증 성공") + one-line body.
- **Warning**: `bg-warning-subtle`, `border-warning-border`, AlertTriangle icon + title + body.
- **Destructive**: `bg-danger-subtle`, `border-danger-border`, XCircle icon + title + body.
- Title: text-body-medium font-semibold.
- Body: text-body-small.
- Never stack more than 2 alerts on a screen. If 3+ issues exist, consolidate into a single alert with a bullet list.

### Drop Zone (Step 3)

- Large card with dashed border (border-dashed border-border).
- Empty state: Upload icon (lucide, 48px, text-muted) + "파일을 드래그하거나 클릭하여 업로드" (text-heading-small) + "CSV 또는 JSON 파일 지원 · 최대 100MB" (text-body-small text-muted).
- Min height 280px.
- Hover: border-primary (still dashed), bg-primary-subtle/30.
- After upload: solid border, FileText icon + filename + size + small X button to remove.

## Step-Specific Component Patterns

### Step 4 — Column Mapping Table

- shadcn `Table` with 4 columns: 원본 컬럼명 / 샘플 값 미리보기 / 추론된 역할 / 수정 표시.
- 원본 컬럼명: font-mono.
- 샘플 값 미리보기: text-body-small text-muted, first 3 values comma-separated, truncated with max-width ~200px.
- 추론된 역할: shadcn `Select` dropdown with options `id`, `y_true`, `y_pred`, `score`, `prob_class_*`, `prob_label_*`, `ignore`.
- 수정 column: shows small `수정됨` Badge (variant="secondary") only after user changes the dropdown.
- `ignore` rows: text-muted and subtle `bg-muted/30` row background.
- Duplicate-role conflicts: the conflicting rows' Select gets `border-danger` + inline warning text below.

### Step 4 — Conditional Config Cards

After the mapping table, additional cards appear conditionally based on task_type and mapping state:

**Positive Class Selection Card** (binary only, y_true mapped):
- Radio cards of each unique y_true value.
- Each card: class name (font-mono font-semibold) + sample count (text-muted).
- Auto-suggested value has a small `자동 선택` Badge (variant="outline").

**Threshold Setting Card** (binary with score but no y_pred, OR multilabel with prob_label but no y_pred):
- Explanation text.
- Slider (0 to 1, step 0.05) + synced Input (numeric).
- Default value: 0.5.
- Helper: "score가 이 값 이상이면 양성으로 판정합니다."

### Step 4 — Mapping Summary Card (with TC compatibility)

- Top row: counts of detected / mapped / ignored columns as a 3-cell metric block.
- "계산 가능한 시험항목" section:
  - "선택한 N개 중 M개 계산 가능" summary line.
  - Grid of Badges for compatible TCs (variant="secondary") and incompatible TCs (variant="destructive" with reason in Tooltip).
- If any selected TC is incompatible: blocking Alert at the bottom with two actions:
  - `[시험항목으로 돌아가기]` outline
  - `[자동 해제하고 계속]` default

### Step 5 — Settings Summary (complete)

The summary card in Step 5 is the most comprehensive on the app. It combines:

**Section 1: 기본 정보** (from Step 1)
- 2-column grid: 회사명, 대상 모델, 시험결과서 용도, 평가 유형.

**Section 2: 시험항목** (from Step 2, with parameters)
- Flex-wrap Badge list of selected TCs. Badges include any runtime parameter (e.g., `TC5 Fβ (β=1.0)`).

**Section 3: 데이터 설정** (from Steps 3 & 4)
- File name, size, sample count, class list with counts.
- Mapped columns table (brief).

**Section 4: 판정 설정** (from Step 4 conditional cards)
- Positive class (if binary): `1` / `defect` / etc.
- Threshold (if applicable): `0.5`.
- Prediction mode: `y_pred 직접 사용` / `score → threshold` / `argmax` / `레이블별 threshold`.
- β value (if TC5 selected): `1.0`.

Sections separated by 1px `border-border` dividers.

## Component Do's and Don'ts

- ✅ DO use `Card` for every block-level grouping. Never raw `<div>` with borders.
- ✅ DO use shadcn `Alert` variants for all messages.
- ✅ DO use `Badge` with `variant="secondary"` for neutral tags, `variant="outline"` for requirement indicators, `variant="destructive"` for error states.
- ✅ DO apply `tabular-nums` on every numeric value.
- ❌ DO NOT add `className` overrides that change shadcn core colors.
- ❌ DO NOT use shadow-md or heavier on cards. Only on floating elements.
- ❌ DO NOT wrap already-bordered shadcn components in another bordered div.
- ❌ DO NOT inline runtime parameters (threshold, β) as separate steps — they belong inside the relevant card in the current step.
