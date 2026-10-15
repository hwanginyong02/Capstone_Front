# Guidelines

This project is a web application that automates the generation of **ML model performance evaluation reports** ("시험성적서") based on the **KS X ISO/IEC TS 4213:2022** standard. End users are enterprises that need a formal, credible test report for their ML classification models.

The product name is **"ML 성능평가 / ISO/IEC 4213 기반"**. Treat this as a professional B2B SaaS tool, not a consumer product.

## Design Inspiration

The visual language draws directly from **Linear**, **Vercel**, and **Supabase** dashboards:

- Crisp white surfaces on a very light neutral page background
- Sharp, precise typography with generous line-height
- Flat surfaces — borders do the work, not shadows
- Full-width layout that trusts the data to fill the space
- One accent color (a considered blue) that appears only on interactive elements *(MATERIAL_PICKER.md로 대체됨, §10 — 강조색은 네이비 #1d3b6e)*

This is NOT a warm/friendly tool (Notion, Airbnb). It is NOT a playful tool (Figma, Miro). It is a precise instrument.

## Tone & Atmosphere

- **Precise and calm.** Every pixel should feel intentional. No decorative elements.
- **Dense but never cluttered.** Users see many numbers (metrics, sample counts, class distributions). Whitespace creates rhythm; it's not emptiness.
- **Confident and quiet.** Don't over-explain. Short labels, direct helper text, no unnecessary icons.

## Always Read First

Before generating any UI, read these files in order:

1. `overview-components.md` — component catalog and shared patterns
2. `colors.md` — color roles and semantic usage
3. `typography.md` — type scale
4. `spacing.md` — spacing, radius, elevation

## Core Layout — Full-width with Top Tab Navigation

> **MATERIAL_PICKER.md로 대체됨** (§4) — 재료 고르기 화면은 3단이다(왼쪽 카탈로그, 가운데 필드, 오른쪽 입력 순서). 이전·다음 버튼도 하단 Action Bar 가 아니라 오른쪽 패널에 있다. 아래는 종전 규칙.

Every main screen uses this single-column, full-width structure:

```
┌─────────────────────────────────────────────────────────┐
│  App Header (56px fixed)                                │
│  [Logo] ML 성능평가        [회사명 · run1]      [?]     │
├─────────────────────────────────────────────────────────┤
│  Tab Navigation (48px fixed)                            │
│  ① 기본 정보  ② 시험항목  ③ 데이터 업로드  ...          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   (content area, full-width with 32px side padding,     │
│    inner max-width: 1280px, centered)                   │
│                                                         │
│   Page title + subtitle                                 │
│                                                         │
│   Content (cards, tables, forms)                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Action Bar (72px sticky bottom)                        │
│  [← 이전]                              [다음 단계 →]    │
└─────────────────────────────────────────────────────────┘
```

### Layout rules

- **No left sidebar.** All navigation is at the top. *(MATERIAL_PICKER.md로 대체됨, §9 — 입력 화면의 단계 표시줄은 본문 오른쪽의 세로 목록이다)*
- **Full width with inner cap.** The content area uses full viewport width with 32px side padding, but inner content is capped at 1280px and centered. This gives breathing room on ultra-wide monitors without wasting space on 1440px screens.
- **Sticky action bar at the bottom.** Navigation buttons stay visible as the user scrolls. Essential for long screens like data upload or result preview.
- **No floating help bubble.** The help icon lives in the top-right of the app header.

## The 7-Step Workflow (as Top Tabs)

> **MATERIAL_PICKER.md로 대체됨** (§3) — 단계는 재료 고르기에서 넣은 카드에 따라 8~10개이고 카드 순서를 따른다. 아래는 종전 기록.

Tabs are always visible at the top. Users can click any completed or current tab; upcoming tabs are disabled.

1. 기본 정보
2. 시험항목
3. 데이터 업로드
4. 클래스 감지
5. 예측 설정
6. 데이터 검증
7. 결과 미리보기

### Tab states

> **MATERIAL_PICKER.md로 대체됨** (§9) — 세로 단계 표시줄이다. 지난 단계는 본문색이고 누를 수 있다. 현재 단계는 제목색·굵기 500에 강조색 막대를 붙이고 `aria-current="step"` 이다. 다음 단계는 흐린 글자이고 누를 수 없다. 마친 단계에는 완료 표시(강조색 원 안의 체크)가 붙는다. 아래는 종전 기록.

- **Active** (current step): step number in a solid primary circle, label in `text-foreground font-medium`, 2px primary-colored underline along the bottom edge of the tab.
- **Completed**: step number replaced with a small check icon in primary color, label in `text-foreground`, clickable with hover state.
- **Upcoming**: step number in a muted outlined circle, label in `text-muted-foreground`, cursor not-allowed.

Do NOT use a separate progress bar — the tab states ARE the progress indicator.

## Component Preference Rules

IMPORTANT: Always prefer shadcn/ui components over custom HTML.

- Use `Card`, `CardHeader`, `CardContent` for every grouped content block.
- Use `Button` with correct variant (`default`, `outline`, `ghost`, `secondary`), never raw `<button>`.
- Use `Input`, `Label`, `Select`, `RadioGroup`, `Checkbox` for all form inputs.
- Use `Badge` for status labels and inline tags.
- Use `Alert` with `variant="default" | "destructive"` for messages.
- Use `Tabs` component from shadcn for the top navigation (with custom styling to match our step tab pattern). *(MATERIAL_PICKER.md로 대체됨, §9 — 단계 표시줄은 `<nav><ol>` 세로 목록이고 Tabs 를 쓰지 않는다)*
- Use `Table` for any tabular data — do NOT hand-roll tables.

## Data Density Principles

Because this is a full-width, data-dense product, follow these rules:

- **Use tables over card lists** when showing 4+ items with the same structure (e.g., class-wise metrics, 지표 list).
- **Show multiple metrics side-by-side** on the result preview. Use a horizontal grid of metric blocks, not stacked cards.
- **Inline status with data** rather than separating them. A sample count like `45` should sit next to a `warning` badge when it's too low, not be explained in a separate alert far below.
- **Use tabular numeric alignment.** Numbers in tables align right. Metric values on dashboards use tabular-nums font feature.

## Writing Voice (Korean UI Strings)

- **Labels**: short noun phrases ("회사명", "대표자", "시험항목 선택").
- **Helper text**: single sentence, direct and informational ("평가에 필요한 기본 정보를 입력해주세요.").
- **Validation messages**: start with what is wrong, not what to do. ("샘플 수가 적습니다.", "y_true에 없는 클래스가 y_pred에 있습니다.")
- **Buttons**: verb + arrow for directional motion ("다음 단계 →", "← 이전"). Plain verbs for standalone actions ("시험성적서 생성", "결과 내보내기"). *(MATERIAL_PICKER.md로 대체됨, §8 — 이동 버튼은 프로토타입대로 화살표 없이 "이전"·"다음")*

Never use casual language, emoji in production copy, or exclamation marks outside success confirmations.

## Do Not

- ❌ Do NOT use gradients, glows, or animated background effects.
- ❌ Do NOT use rounded corners larger than 8px on cards. 4–6px is standard. Corporate precision > soft friendliness.
- ❌ Do NOT use shadows on default card states. Borders only.
- ❌ Do NOT use more than ONE accent color per screen. The primary blue is the only accent. *(MATERIAL_PICKER.md로 대체됨, §10 — 유일한 강조색은 네이비다)*
- ❌ Do NOT use icons decoratively next to text labels. Icons appear only for actions or status.
- ❌ Do NOT use a left sidebar anywhere in the main workflow. *(MATERIAL_PICKER.md로 대체됨, §4 — 재료 고르기는 왼쪽에 카탈로그를 둔다)*
- ❌ Do NOT stack more than 3 nested containers.
