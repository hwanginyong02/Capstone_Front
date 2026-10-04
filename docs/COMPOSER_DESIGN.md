# 성적서 구성 화면 디자인 설계

Oct 3, 2026 · @인용

## 기준과 원칙

이 문서는 [성적서 구성 컴포넌트 설계](https://claude.ai/code/artifact/91d77834-9f3b-4028-bd80-f06bb41f9c93)의 카드 9개를 화면에 그리는 규칙이다. 새 디자인 시스템을 만들지 않고 프론트 저장소의 기존 기준을 따른다. 기준 문서의 우선순위는 다음과 같다.

1. `docs/imports/` — 색(`colors.md`), 간격·모서리(`spacing.md`), 글자(`typography.md`), 컴포넌트 패턴(`overview-components.md`), 전체 지침(`Guidelines.md`)
2. README "디자인 시스템" 절
3. `src/styles/theme.css` — 구현된 토큰. imports에 있는데 여기 없는 토큰은 imports 값 그대로 추가한다.

이 문서는 imports의 토큰 이름(`--color-*`, `--space-*`, `--text-*`)과 값을 그대로 쓰고, 이 화면에만 필요한 것만 정한다. 새로 만드는 토큰은 하나(`--color-foreground-secondary`)뿐이다.

이어받는 원칙은 다음과 같다.

- 밝은 중립 배경 위에 흰 카드를 놓고, 그림자 없이 테두리로만 구분한다.
- 강조색은 파랑(`--color-primary`) 하나만 쓴다. 상태 색(경고 등)은 한 번에 하나만 보인다.
- 카드 모서리는 8px, 버튼은 6px, 배지·체크박스는 4px. 그라디언트와 장식 아이콘은 쓰지 않는다.
- 숫자, 지표 ID, 파일 예시는 고정폭 글꼴에 `tabular-nums`를 적용한다.
- 다크 모드는 범위 밖이다(imports `colors.md`).

이 화면에서 두 가지 표시를 구분해서 쓴다. **파랑 테두리와 연한 파랑 배경은 "성적서에 들어감"**(기존 Selectable Card의 선택 상태와 같다), \*\*진한 테두리는 "지금 아래에서 보고 있는 카드"\*\*다.

## 화면 골격과 치수

콘텐츠는 최대 1280px로 가운데 정렬하고, 화면 가장자리에서 좌우 32px을 띄운다(imports `spacing.md`). 화면 폭이 1344px 이상이면 콘텐츠 폭은 **1280px**이다. 구성 화면은 입력 단계가 시작되기 전이라 Step Tabs(48px)는 두지 않는다.

위에서 아래로 다음 순서로 쌓는다.

| 영역 | 높이 | 아래 간격 | 고정 여부 |
| --- | --- | --- | --- |
| App Header (분류 유형 배지 포함) | 56px | 48px (`--space-12`) | 위에 고정 |
| 페이지 머리 (제목·부제, 오른쪽에 프리셋) | 약 58px | 32px (`--space-8`) | — |
| "필수" 라벨 | 22px | 12px (`--space-3`) | — |
| 필수 카드 줄 (5개) | 최소 96px | 24px (`--space-6`) | — |
| "선택" 라벨 | 22px | 12px | — |
| 선택 카드 줄 (4개) | 최소 96px | 40px (`--space-10`) | — |
| 상세 영역 | 최소 320px, 내용만큼 늘어남 | 48px (`--space-12`) | — |
| Action Bar | 72px | — | 아래에 고정 |

카드 줄의 가로 치수는 다음과 같다. 두 줄의 카드 폭이 다른 것은 의도한 것이다. 선택 카드를 필수 카드와 같은 5열 격자에 맞추면 오른쪽에 빈칸이 생겨 "카드가 하나 빠진" 것처럼 보인다.

| 줄 | 열 수 | 카드 사이 간격 | 카드 폭 (콘텐츠 1280px 기준) |
| --- | --- | --- | --- |
| 필수 | 5 | 12px (`--space-3`) | 약 246px |
| 선택 | 4 | 12px (`--space-3`) | 311px |

간격은 imports의 4px 격자 토큰만 쓴다(`--space-1` 4px \~ `--space-12` 48px). 카드 격자 간격 12px과 카드 최소 높이 96px은 기존 Selectable Card 격자 규칙과 같다.

## 색

모두 imports `colors.md`의 토큰이다. 오른쪽 열은 그 토큰이 지금 `theme.css`에 구현돼 있는지다. 구현되지 않은 토큰은 imports 값 그대로 `theme.css`에 추가한다.

| 토큰 | 값 | 이 화면에서 쓰는 곳 | theme.css |
| --- | --- | --- | --- |
| `--color-background` | `#FAFAFA` | 페이지 배경, Action Bar 배경 | 있음 (`--background`) |
| `--color-card` | `#FFFFFF` | 꺼진 카드, 상세 영역 | 있음 (`--card`) |
| `--color-muted` | `#F4F4F5` | 표 머리, 회색 배지, 프리셋 바탕 | 있음 (`--muted`) |
| `--color-border` | `#E4E4E7` | 꺼진 카드·상세 영역·표의 기본 테두리 | 있음 (`--border`) |
| `--color-border-strong` | `#D4D4D8` | 꺼진 카드 hover 테두리 | **없음** |
| `--color-foreground` | `#09090B` | 제목, 본문, "보고 있는 카드" 테두리 | 있음 (`--foreground`) |
| `--color-foreground-muted` | `#71717A` | 흰 배경 위 보조 글자 (부제, 상세 설명, 도움말) | 있음 (`--muted-foreground`) |
| `--color-primary` | `#2563EB` | 켜진 카드 테두리, 체크박스, 다음 버튼 | 있음 (`--primary`) |
| `--color-primary-hover` | `#1D4ED8` | 다음 버튼 hover | **없음** |
| `--color-primary-subtle` | `#EFF6FF` | 켜진 카드 배경, 분류 유형 배지 | **없음** |
| `--color-ring` | `#2563EB` | 키보드 포커스 | 있음 (`--ring`) |
| `--color-warning` / `-subtle` / `-border` | `#D97706` / `#FFFBEB` / `#FDE68A` | 이 화면에서는 쓰지 않음 (평가 관점과 지표의 어긋남은 지표 선택 단계에서 알린다) | **없음** |
| `--color-foreground-secondary` | `#52525B` | 연한 배경 위 보조 글자 (카드 설명, 표 머리 글자) | **이 문서에서 새로 정함** |

`--color-foreground-muted`는 흰 배경에서 4.8:1이지만, 연한 파랑(`--color-primary-subtle`) 위에서는 4.4:1, 회색(`--color-muted`) 위에서는 4.4:1로 일반 글자 기준(4.5:1)에 못 미친다. 그래서 그 두 배경 위의 보조 글자에만 `--color-foreground-secondary`(각각 7.1:1, 7.0:1)를 쓴다.

색만으로 상태를 전달하지 않는다. 켜짐과 꺼짐은 체크박스 모양으로도, 필수 카드는 자물쇠 아이콘으로도, "보고 있음"은 상세 영역 제목으로도 구분된다.

## 타이포그래피

글꼴과 크기는 imports `typography.md`의 토큰을 그대로 쓴다. 본문은 `--font-sans`(Pretendard Variable 우선), 숫자·지표 ID·파일 예시는 `--font-mono`(JetBrains Mono 우선)다.

| 용도 | 토큰 | 크기 / 줄 높이 | 굵기 | 색 |
| --- | --- | --- | --- | --- |
| 페이지 제목 "성적서 구성" | `--text-heading-large` | 24 / 32 | 700 | foreground |
| 부제 | `--text-body-medium` | 14 / 22 | 400 | foreground-muted |
| 섹션 라벨 "필수", "선택" | `--text-heading-small` | 16 / 24 | 600 | foreground |
| 섹션 라벨 옆 개수 | `--text-mono-small` | 12 / 18 | 500 | foreground-muted |
| 섹션 보조 문구 | `--text-body-small` | 13 / 20 | 400 | foreground-muted |
| 카드 이름 | `--text-body-medium` | 14 / 22 | 600 | foreground |
| 카드 설명 | `--text-body-small` | 13 / 20 | 400 | foreground-secondary |
| 상세 영역 제목 | `--text-heading-medium` | 18 / 26 | 600 | foreground |
| 상세 영역 설명, 도움말 | `--text-body-small` | 13 / 20 | 400 | foreground-muted |
| 표 머리 | `--text-body-xs` | 12 / 18 | 500 | foreground-secondary |
| 표 본문 | `--text-body-small` | 13 / 20 | 400 | foreground |
| 지표 ID (`M9`) | `--text-mono-small` | 12 / 18 | 500 | foreground-muted |
| 파일명·숫자 예시 | `--text-body-small` + Mono | 13 / 20 | 400 | foreground |
| 배지 | `--text-body-xs` | 12 / 18 | 500 | 배지별 |
| 버튼 | `--text-body-medium` | 14 / 22 | 500 | 버튼별 |
| Action Bar 요약 | `--text-body-small` (숫자는 Mono) | 13 / 20 | 400 | foreground-muted |

굵기는 imports의 네 가지(400, 500, 600, 700)를 쓰고, 700은 페이지 제목에만 쓴다. 카드 설명은 두 줄을 넘으면 말줄임표로 자르고, 전체 문장은 상세 영역에서 보여준다. 카드 설명 색만 기존 Selectable Card(foreground-muted)와 다른데, 연한 파랑 배경 위 대비 때문이다(색 절 참고).

## 카드

기존 Selectable Card 패턴(imports `overview-components.md`)을 그대로 쓰고, "필수"와 "보고 있음" 표시만 더한다.

### 크기와 내부 배치

- 최소 높이 96px, 안쪽 여백 16px(`--space-4`), 모서리 8px(`--radius-lg`).
- **왼쪽 위**에 상태 아이콘 16×16. 필수 카드는 lucide `Lock`, 선택 카드는 shadcn `Checkbox`(모서리 4px). 기존 Selectable Card의 체크박스 위치와 같다.
- 아이콘 오른쪽 8px(`--space-2`)에 카드 이름(번호 포함, 예: "⑥ 학습 데이터"), 그 아래 4px 띄워 설명 최대 2줄.

### 상태

카드에는 두 가지 표시가 겹친다. **성적서에 들어가는지**(필수는 항상, 선택은 체크박스로 결정)는 파랑으로, **지금 아래에서 보고 있는지**(카드 본문을 눌러 결정)는 진한 테두리로 나타낸다.

| 상태 | 배경 | 테두리 | 아이콘 |
| --- | --- | --- | --- |
| 필수 (항상 들어감) | `--color-primary-subtle` | 2px `--color-primary` | 자물쇠, `--color-primary` |
| 선택 · 켜짐 | `--color-primary-subtle` | 2px `--color-primary` | 체크박스 채움, `--color-primary` |
| 선택 · 꺼짐 | `--color-card` | 1px `--color-border` | 빈 체크박스 |
| 선택 · 꺼짐 + hover | `--color-card` | 1px `--color-border-strong` | 빈 체크박스 |
| 보고 있음 (위 상태와 겹침) | 그대로 | 2px `--color-foreground` | 그대로 |
| 키보드 포커스 | 그대로 | 바깥에 2px `--color-ring` 외곽선, 2px 띄움 | 그대로 |

필수 카드와 켜진 선택 카드는 같은 모양이고 아이콘(자물쇠/체크박스)으로만 구분된다. 둘 다 "성적서에 들어간다"는 같은 뜻이기 때문이다.

테두리가 1px에서 2px로 바뀔 때 카드 크기가 변하지 않도록 `box-sizing: border-box`를 쓰고, 테두리가 2px일 때 안쪽 여백을 15px로 줄인다.

### 동작

- 카드 본문을 누르면 그 카드가 "보고 있음"이 되고 상세 영역 내용이 바뀐다. 켜짐/꺼짐은 바뀌지 않는다.
- 체크박스를 누르면 켜짐/꺼짐만 바뀌고, 그 카드가 "보고 있음"이 된다.
- 화면에 처음 들어오면 ① 평가 데이터가 "보고 있음" 상태다.
- 처음에는 프리셋 "전체"가 적용되어 선택 카드 4개가 모두 켜져 있다.

## 상세 영역

카드 줄 아래에 놓는 shadcn `Card` 하나다. 배경 `--color-card`, 테두리 1px `--color-border`, 모서리 8px, 최소 높이 320px. 카드를 바꿀 때 높이가 크게 출렁이지 않도록 최소 높이를 둔다. 전환 애니메이션은 쓰지 않는다.

내부는 imports의 Card 리듬을 따른다.

1. **CardHeader** (안쪽 여백 24px): 왼쪽에 카드 이름(`--text-heading-medium`), 그 아래 8px 띄워 설명 한 줄. 오른쪽 위에 상태 배지("필수" / "선택 · 켜짐" / "선택 · 꺼짐").
2. **CardContent** (안쪽 여백 24px, 위 0): 필드 표 → 20px(`--space-5`) → 도움말(있는 카드만) → 20px → 보기 버튼(①, ②만).

### 필드 표

shadcn `Table`을 쓴다.

| 열 | 폭 | 내용 |
| --- | --- | --- |
| 필드 | 28% | 필드 이름 |
| 입력 예시 | 나머지 | 선택지는 " / "로 잇고, 파일명·숫자는 Mono로 쓴다 |
| 구분 | 128px | 배지 |

- 머리 행 배경 `--color-muted`, 높이 36px. 본문 행 높이 최소 44px, 행 사이 1px `--color-border`.
- 행 hover는 두지 않는다. 눌러서 무언가를 하는 표가 아니다.
- "더보기" 필드는 표 아래 "선택 항목 2개 더 보기" 버튼(ghost, sm)으로 접어 둔다.

### 구분 배지

shadcn `Badge`, 모서리 4px(`--radius-sm`), `--text-body-xs` 500.

| 구분 | 모양 |
| --- | --- |
| 필수 | `variant="secondary"` (배경 `--color-muted`, 글자 `--color-foreground`) |
| 선택 | `variant="outline"` (테두리 1px `--color-border`, 글자 `--color-foreground-muted`) |
| 조건부 ("Fβ 선택 시" 등) | 배지 없이 `--text-body-xs` 글자만, `--color-foreground-muted` |

### 도움말

`--text-body-small`, `--color-foreground-muted`. 앞에 lucide `Info` 16px을 둔다. 장식이 아니라 "설명 문구"라는 표시라 기존 규칙(장식 아이콘 금지)에 걸리지 않는다.

### 보기 버튼과 펼친 내용

- 버튼: `Button variant="outline" size="sm"`(높이 32px), 오른쪽에 `ChevronDown` 16px(펼치면 `ChevronUp`).
- ① **예시 파일 보기**: 선택한 분류 유형의 예시 CSV를 표로 보여준다. 전부 `--text-mono-small`, 셀 테두리 1px, 머리 배경 `--color-muted`. 표 아래 12px 띄워 필수 컬럼 안내 한 줄(`--text-body-small`).
- ② **고를 수 있는 지표 보기**: 지표를 `Badge variant="outline"`로 나열한다(높이 28px, 사이 8px). 배지 안에 지표 ID(`--text-mono-small`)와 이름(`--text-body-xs`). 확률이 필요한 지표는 이름 뒤에 "확률 필요"를 붙인다(기존 "score 필요" 배지와 같은 역할).
- 다른 카드로 바꾸면 펼친 내용은 닫힌다.

## 상단과 Action Bar, 버튼

### 상단

- **App Header**(56px): imports `overview-components.md`의 구조 그대로다. 분류 유형 배지는 `docs/UI_DESIGN.md` §4(유형 배지)를 따른다.
- **페이지 머리**: 왼쪽에 제목 "성적서 구성"(`--text-heading-large`), 4px 아래 부제 "넣을 정보를 고르세요. 카드를 누르면 아래에 자세히 보입니다."(`--text-body-medium`, foreground-muted). 제목에 아이콘은 넣지 않는다.
- **프리셋**: 페이지 머리 오른쪽에 두 칸짜리 토글(최소 구성 / 전체). 바탕 `--color-muted`, 모서리 6px(`--radius-md`), 높이 32px. 선택된 칸은 배경 `--color-card`와 테두리 1px `--color-border`, 글자 `--text-body-medium` 500. 현재 카드 상태가 어느 프리셋과도 같지 않으면(사용자가 일부만 켬) 두 칸 모두 선택 해제로 보인다.
- **섹션 라벨**: "필수" 옆에 개수 "5", "선택" 옆에 개수 "4"(`--text-mono-small`). "선택" 아래에는 보조 문구 "켜면 안의 필수 항목은 모두 입력합니다"(`--text-body-small`).

### Action Bar

imports의 Action Bar 그대로다. 높이 72px, 아래 고정, 화면 전체 폭, 위 테두리 1px `--color-border`, 배경 `--color-background`, 위아래 여백 16px, 좌우 여백 32px, 양 끝 정렬.

- **왼쪽**: `← 이전`(outline). 분류 유형 선택 화면으로 돌아간다.
- **오른쪽**: 요약 한 줄 "이진 분류 · 선택 카드 3/4 · 입력 단계 9개"(`--text-body-small`, 숫자는 Mono + `tabular-nums`) → 16px → `다음 단계 →`(default).
- 이 화면에서 다음 버튼이 비활성되는 경우는 없다. 필수 카드는 항상 들어가고, 입력은 다음 단계에서 받는다.

### 버튼

모두 shadcn `Button`, 모서리 6px(`--radius-md`), 글자 `--text-body-medium` 500. 버튼 문구는 imports `Guidelines.md`대로 이동하는 버튼에 화살표를 붙인다("← 이전", "다음 단계 →").

| 쓰는 곳 | variant | size (높이) | hover |
| --- | --- | --- | --- |
| 다음 단계 → | `default` (배경 `--color-primary`, 글자 흰색) | `lg` (40px) | 배경 `--color-primary-hover` |
| ← 이전 | `outline` | `lg` (40px) | 배경 `--color-muted` |
| 예시 파일 보기, 지표 보기 | `outline` | `sm` (32px) | 배경 `--color-muted` |
| 선택 항목 더 보기 | `ghost` | `sm` (32px) | 배경 `--color-muted` |

한 화면에 `default` 버튼은 "다음 단계 →" 하나만 둔다.

## 반응형과 접근성

### 반응형

주 사용 환경은 데스크톱 웹이다. 구간은 imports와 같은 Tailwind 기본값을 쓰고, 카드 폭이 200px 아래로 내려가기 전에 열을 줄인다.

| 구간 | 화면 폭 | 필수 카드 | 선택 카드 | 비고 |
| --- | --- | --- | --- | --- |
| `xl` | 1280px 이상 | 5열 1줄 | 4열 1줄 | 기준 화면 |
| `lg` | 1024 \~ 1279px | 3열 2줄 | 2열 2줄 | — |
| `md` | 768 \~ 1023px | 2열 3줄 | 2열 2줄 | 프리셋이 제목 아래 줄로 내려감 |
| `sm` 이하 | 768px 미만 | 1열 | 1열 | 상세 영역은 누른 카드 바로 아래에 펼침 |

열이 줄어도 카드 최소 높이(96px)와 상세 영역 규칙은 그대로다.

### 접근성

- 포커스 표시는 imports 규칙 그대로 모든 요소에 2px `--color-ring` 외곽선, 2px 띄움. 지우지 않는다.
- 카드 본문은 `button` 역할로 만들고 `aria-pressed`로 "보고 있음"을 알린다. 체크박스는 카드 본문과 별도 요소로 두고 `aria-label`에 "⑥ 학습 데이터 포함"처럼 카드 이름을 넣는다. 필수 카드의 자물쇠에는 `aria-label="항상 포함"`을 단다.
- 키보드 순서는 프리셋 → 필수 카드 ①\~⑤ → 선택 카드 ⑥\~⑨(각각 카드 본문 → 체크박스) → 상세 영역 → Action Bar다. 스페이스로 체크박스를 켜고 끈다.
- 상세 영역이 바뀌면 `aria-live="polite"`로 새 카드 이름을 알린다.
- 글자 대비(일반 글자 기준 4.5:1): `--color-foreground-muted`는 흰 배경과 `--color-background` 위에서만 쓴다. 연한 파랑과 회색 배경 위 보조 글자는 `--color-foreground-secondary`(7.0:1 이상)를 쓴다.

## 기존 디자인 시스템과 달라지는 점

대부분 imports 규칙을 그대로 쓰고, 아래만 다르거나 새로 생긴다.

| 항목 | 기존 (imports) | 이 화면 | 이유 |
| --- | --- | --- | --- |
| 색 토큰 | `colors.md` 토큰 | `--color-foreground-secondary`(`#52525B`) 하나 추가 | 연한 배경 위 보조 글자 대비 |
| Selectable Card | 선택 = 2px 파랑 + 연한 파랑, 체크박스 왼쪽 위 | 그대로 쓰고, 필수 카드(자물쇠)와 "보고 있음"(진한 테두리)을 더함 | 카드 하나로 "들어감"과 "보는 중"을 함께 보여줘야 한다 |
| 카드 설명 색 | `--color-foreground-muted` | `--color-foreground-secondary` | 연한 파랑 위에서 4.4:1로 기준 미달 |
| Step Tabs | 단계 화면에 48px | 구성 화면에는 없음 | 입력 단계 전이고, 단계 수가 이 화면의 선택으로 정해진다 |
| 카드 격자 | 4 / 3 / 2 / 1열 | 필수 5열, 선택 4열에서 시작 | 줄마다 카드 수가 고정(5개, 4개)이다 |

함께 정리하면 좋은 기존 문제도 있다. 이 화면만의 문제가 아니라 팀이 판단할 일이다.

- `theme.css`에는 imports의 `--color-border-strong`, `--color-primary-hover`, `--color-primary-subtle`, 상태 색(success·warning) 토큰이 아직 없다. 이 화면을 구현하려면 앞의 세 개는 반드시 추가해야 한다.
- imports가 "올바른 짝"으로 적은 경고 알림(`#D97706` 글자 on `#FFFBEB`)은 대비가 3.1:1로 일반 글자 기준에 못 미친다. 경고 글자만 `#B45309`(4.8:1)로 바꾸는 것을 권한다.
- 기존 지표 선택 화면의 Selectable Card 설명도 연한 파랑 위 `--color-foreground-muted`라서 같은 대비 문제가 있다.
- README는 영문 글꼴로 Inter를 적고, imports의 `--font-sans`에도 Inter가 대체 글꼴로 들어 있지만, `fonts.css`는 Inter를 불러오지 않는다. Pretendard가 영문도 포함하므로 실사용에는 문제가 없고, 문서끼리만 맞추면 된다.
