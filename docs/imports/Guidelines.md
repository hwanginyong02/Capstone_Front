# Guidelines

This project is a web application that automates the generation of **ML model performance evaluation reports** ("시험성적서") based on the **KS X ISO/IEC TS 4213:2022** standard. End users are enterprises that need a formal, credible test report for their ML classification models.

The product name is **"ML 성능평가 / ISO/IEC 4213 기반"**. Treat this as a professional B2B SaaS tool, not a consumer product.

## Design Inspiration

The visual language draws directly from **Linear**, **Vercel**, and **Supabase** dashboards:

- Crisp white surfaces on a very light neutral page background
- Sharp, precise typography with generous line-height
- Flat surfaces — borders do the work, not shadows
- Full-width layout that trusts the data to fill the space
- One accent color — navy `#1d3b6e` (`--primary`) — that appears only on interactive elements and saved/current states (`docs/MATERIAL_PICKER.md` §10)

This is NOT a warm/friendly tool (Notion, Airbnb). It is NOT a playful tool (Figma, Miro). It is a precise instrument.

## Tone & Atmosphere

- **Precise and calm.** Every pixel should feel intentional. No decorative elements.
- **Dense but never cluttered.** Users see many numbers (metrics, sample counts, class distributions). Whitespace creates rhythm; it's not emptiness.
- **Confident and quiet.** Don't over-explain. Short labels, direct helper text, no unnecessary icons.

## Always Read First

Before generating any UI, read these files in order:

1. `../MATERIAL_PICKER.md` §10 — 디자인 시스템 요약(인증 네이비 톤, 강조색 #1d3b6e)
2. `colors.md` — color roles and semantic usage
3. `typography.md` — type scale
4. `spacing.md` — spacing, radius, elevation

실제 값의 정본은 `src/styles/theme.css` 다. 문서와 값이 다르면 theme.css 를 따른다.

## Core Layout

입력 화면은 머리 · 본문 · 오른쪽 단계 표시줄 · 아래 Action Bar 로 이루어진다(`src/layout/WorkflowShell.tsx`).

```
┌──────────────────────────────────────────────────────────────┐
│  App Header (56px, 위에 고정)                                 │
│  ML 성능평가 / ISO/IEC 4213 기반          [분류 유형 배지] ...  │
├───────────────────────────────────────────┬──────────────────┤
│                                           │  StepRail        │
│   본문 (좌우 32px, 안쪽 최대 폭 1344px)     │  (세로 단계      │
│                                           │   표시줄, 288px) │
│   화면 제목 + 부제                         │  [평가 흐름 만들기]│
│   내용 (카드, 표, 폼)                      │  1 의뢰자 정보    │
│                                           │  2 ...           │
├───────────────────────────────────────────┴──────────────────┤
│  Action Bar (72px, 아래에 고정)                               │
│  [< 이전]  (왼쪽 요약)               (오른쪽 안내)  [다음 >]   │
└──────────────────────────────────────────────────────────────┘
```

### Layout rules

- **단계 표시줄은 본문 오른쪽의 세로 목록이다**(`src/layout/components/StepRail.tsx`). 단계 수가 고른 블록에 따라 8~12개로 바뀌고 이름 길이가 제각각이라 가로 탭을 쓰지 않는다. 좁은 화면에서는 본문 위로 올라간다. 위쪽 가로 탭 내비게이션은 없다.
- **본문은 전체 폭, 안쪽은 최대 폭으로 묶는다.** 좌우 32px 여백, 안쪽 최대 폭 1344px 를 가운데에 둔다(머리·Action Bar 도 같은 폭).
- **Action Bar 는 아래에 붙어 있다.** 긴 화면을 내려도 이동 버튼이 보인다.
- **평가 흐름 만들기(`/app/composer`)는 예외다.** 입력 화면에 들어가기 전 화면이라 단계 표시줄이 없고, 왼쪽에 항목 트리, 가운데에 흐름도를 둔다. 하단 현황(`PickStatusBar`)은 Action Bar 왼쪽 자리에 들어간다(`docs/MATERIAL_PICKER.md` §12.3).
- **No floating help bubble.**

### Step states (StepRail)

- 지난 화면(마쳤거나 현재보다 앞): 본문색, 누를 수 있다.
- 현재 화면: 제목색, 굵기 500, 강조색 막대, `aria-current="step"`.
- 다음 화면: 흐린 글자, 누를 수 없다. 마친 화면에는 완료 표시가 붙는다.
- 따로 진행 막대를 두지 않는다 — 단계 표시줄이 곧 진행 표시다.

### Action Bar

- 높이 72px, 화면 전체 폭, 위 테두리 1px `border-border`, 배경 `bg-background`, 아래에 고정(sticky).
- 안쪽은 위아래 16px, 좌우 32px 여백에 양 끝 정렬(`justify-between`).
- 왼쪽: "이전"(`outline`, 왼쪽 Chevron 아이콘). 그 옆에 요약 같은 요소를 둘 수 있다(`leftAction`).
- 오른쪽: "다음"(`default`, 오른쪽 Chevron 아이콘). 그 왼쪽에 안내 한 줄(예: 입력 화면의 "비어 있는 칸" 안내 `RemainingNotice`)을 둘 수 있고, 안내와 다음 버튼 사이는 16px 다(`rightAction`).
- 근거: `src/layout/components/ActionBar.tsx`.

## Component Preference Rules

IMPORTANT: Always prefer shadcn/ui components over custom HTML.

- Use `Card`, `CardHeader`, `CardContent` for every grouped content block.
- Use `Button` with correct variant (`default`, `outline`, `ghost`, `secondary`), never raw `<button>`.
- Use `Input`, `Label`, `Select`, `RadioGroup`, `Checkbox` for all form inputs.
- Use `Badge` for status labels and inline tags.
- Use `Alert` with `variant="default" | "destructive"` for messages.
- Use `Table` for any tabular data — do NOT hand-roll tables.

## Data Density Principles

Because this is a full-width, data-dense product, follow these rules:

- **Use tables over card lists** when showing 4+ items with the same structure (e.g., class-wise metrics, 지표 list).
- **Inline status with data** rather than separating them. A sample count like `45` should sit next to a `warning` badge when it's too low, not be explained in a separate alert far below.
- **Use tabular numeric alignment.** Numbers in tables align right. Metric values on dashboards use tabular-nums font feature.

## Data Table

클래스별 정밀도·재현율·F1, 클래스 분포 비교, 지표 요약처럼 같은 모양의 줄이 여럿인 표에 쓴다.

- shadcn `Table` 을 쓴다.
- 머리 줄: 작은 글자, `font-medium`, `text-muted-foreground`, 배경 `bg-muted/40`.
- 데이터 줄: 숫자 열은 오른쪽 정렬에 `tabular-nums`, 글자 열은 왼쪽 정렬.
- 줄 사이는 1px `border-border` 선. 세로 격자선은 긋지 않는다.
- 줄에 마우스를 올리면 `bg-muted/50`.
- 첫 열(보통 클래스 이름)은 `font-medium`.
- 표 전체에 테두리를 두르지 않는다 — 줄 구분선과 감싸는 Card 의 테두리만 있다.

## Alerts

- 한 화면에 알림(`Alert`)은 2개까지만 쌓는다. 문제가 3개 이상이면 알림 하나에 글머리 목록으로 모은다.

## Writing Voice (Korean UI Strings)

- **Labels**: short noun phrases ("회사명", "대표자", "시험항목 선택").
- **Helper text**: single sentence, direct and informational ("평가에 필요한 기본 정보를 입력해주세요.").
- **Validation messages**: start with what is wrong, not what to do. ("샘플 수가 적습니다.", "y_true에 없는 클래스가 y_pred에 있습니다.")
- **Buttons**: 이동 버튼은 화살표 글자 없이 "이전"·"다음"이고, Chevron 아이콘(`ChevronLeft`·`ChevronRight`)을 붙인다. Plain verbs for standalone actions ("시험성적서 생성").

Never use casual language, emoji in production copy, or exclamation marks outside success confirmations.

## Do Not

- ❌ Do NOT use gradients, glows, or animated background effects.
- ❌ Do NOT use rounded corners larger than 8px on cards. 4–6px is standard. Corporate precision > soft friendliness.
- ❌ Do NOT use shadows on default card states. Borders only.
- ❌ Do NOT use more than ONE accent color per screen. 네이비 `#1d3b6e` 가 유일한 강조색이다.
- ❌ Do NOT use icons decoratively next to text labels. Icons appear only for actions or status.
- ❌ Do NOT use a left sidebar in the input screens. 예외는 평가 흐름 만들기(`/app/composer`)의 왼쪽 항목 트리 하나다.
- ❌ Do NOT stack more than 3 nested containers.
