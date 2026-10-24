# ML 성능평가 프론트엔드 / ISO/IEC 4213 기반

ML 모델 성능 평가 보고서("시험성적서")를 **KS X ISO/IEC TS 4213:2022** 표준에 따라 자동 생성하는 웹 애플리케이션의 프론트엔드입니다.

> 이 README는 **디자인 시스템·컴포넌트 패턴** 위주입니다. 코드 구조/아키텍처는 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)와 [`docs/FRONTEND_DEVELOPMENT_GUIDELINE.md`](docs/FRONTEND_DEVELOPMENT_GUIDELINE.md)를, 지표·컬럼·검증 규칙은 [`SPEC.md`](SPEC.md)(프론트/백 공통 단일 진실 문서)를, 프로젝트 전체(프론트+백)는 백엔드 저장소(`Capstone_Back`)의 `docs/PROJECT_OVERVIEW.md`를 참고하세요. 성적서 서술·판(contentSchema)은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §6, 판 4 켜는 법은 §6.6.

## 프로젝트 구조 (요약)

"페이지 = 얇은 조립자(Assembler)" 아키텍처. 자세한 규칙은 `docs/ARCHITECTURE.md` 참조.

```
src/
├── App.tsx / main.tsx / routes.ts   # 라우팅 진입 (워크플로우는 /app/*, 성적서는 /report/*)
├── pages/          # 라우트 단위 얇은 조립자 (+ report/, workspaces/)
├── components/     # 도메인별 UI (material-picker, composer-input … report, workspaces, landing, ui)
├── layout/         # WorkflowShell(워크플로우 셸) · AppShell(비-워크플로우 셸)
├── hooks/          # 데이터 페칭·부수효과 훅
├── lib/            # apiBase · mapping(role 변환) · report(API·성적서 로직) · upload(업로드 한도)
├── utils/          # styling · format · domain · stores(Zustand) · image(예시 이미지 미리보기)
└── data/ · types/ · styles/ · test/
```

## 평가 흐름

작업 유형(`/app`) → 평가 흐름 만들기(`/app/composer`) → 입력 화면들 → 검증(`/app/data-validation`) → 확인과 생성(`/report/:id`)

- **작업 유형**: 이진 분류 / 다중 클래스 분류 / 다중 레이블 분류 중 하나를 고른다.
- **평가 흐름 만들기**: 빈 흐름도에서 시작해, 왼쪽 트리의 항목을 단계(의뢰 정보 · 모델 · 데이터 · 평가 기준)에 넣어 블록을 만든다. 필수 항목을 모두 넣어야 "다음"으로 간다. 블록과 단계를 끌어 입력 순서를 정한다(`docs/MATERIAL_PICKER.md` §12).
- **입력 화면**: 사용자가 정한 블록 순서대로 걷는다. 의뢰자 정보 · 평가 대상 모델 · 평가 데이터(업로드, 컬럼 매핑) · 평가 관점 · 지표와 합격 기준은 늘 있고, 모델 설정과 실행 환경 · 학습 데이터 · 테스트 데이터 · 정답 라벨은 넣었을 때만 나온다. 검증과 확인과 생성까지 합쳐 최소 8개, 전체 12개 화면이다(`src/utils/domain/workflowSteps.ts` 의 `buildStepList`).
- **검증**: 백엔드 전처리 검증 결과와 생성 전 안내(빠진 항목)를 보여 주고 run 을 만든다.
- **확인과 생성**: 평가를 실행하고 성적서를 그린다. AI 서술은 백엔드 작업 경로(`POST /api/narrative/jobs` 로 작업 번호를 받고 조회해 기다림)로 받고, 키가 없거나 실패한 칸은 규칙 문장으로 채운다. 서술이 끝나야 인쇄·PDF·발급이 열린다. 발급한 성적서는 번호로 다시 연다(`/report/no/:reportNo`). 자세히는 `docs/ARCHITECTURE.md` §6.

입력 화면 오른쪽의 세로 단계 표시줄(`StepRail`)이 진행을 보여 준다.

## 성적서 판

성적서 데이터에는 판 번호(`contentSchema`)가 찍히고, 성적서는 **찍힌 판의 모양으로** 그린다. 그래서 발급한 보관본은 코드가 바뀌어도 발급 당시 모양 그대로다.

| 판 | 무엇 |
|---|---|
| 1 | 판 표시가 없는 옛 발급본(운영 main `d38890d` 시절) |
| 2 | 서술 라운드 앞 dev 의 모양(운영에는 배포되지 않음) |
| 3 | 지금 기본값. 소절 번호 1.1~9.2, 7·8·9절 서술 |
| 4 | 목차를 대상·방법·결과·소견·권고(1~6절)로 다시 묶은 판. 플래그로 켜며, 운영에서는 아직 켜지 않았다 |

- 새 성적서의 판은 run 을 만들 때 `src/lib/report/reportEdition.ts` 의 `newRunContentSchema()` 한 곳에서 정한다. 빌드 환경변수 `VITE_REPORT_EDITION` 이 꼭 `"4"` 일 때만 판 4, 그 밖(없음·빈 값·`"3"`·`"true"`)은 판 3 이다.
- **판 4 를 켜려면 백엔드를 먼저 배포**하고(`/health` 의 `commit` 확인), Vercel 환경변수에 `VITE_REPORT_EDITION=4` 를 넣고 다시 배포한다. 켜기 전 확인 목록과 이유는 `docs/ARCHITECTURE.md` §6.6.

## 디자인 시스템

톤은 "인증 네이비"이고 강조색은 하나(#1d3b6e)다. 그림자 대신 테두리로 나누는 평평하고 정밀한 화면을 지향한다. 요약은 `docs/MATERIAL_PICKER.md` §10, 색 역할은 `docs/imports/colors.md`, 실제 값의 정본은 `src/styles/theme.css` 다.

### 컬러

- **배경**: #ffffff (기본), #f4f5f7 (띠·회색 영역, `--muted`)
- **글자**: #0d1420 (제목), #1f2a3a (본문), #4a5568 (보조), #667080 (비활성·placeholder)
- **강조**: #1d3b6e (`--primary`), 강조 배경 #edf2f9 (`--primary-subtle`)
- **선**: 구분선 #e6e8ec (`--border`), 카드 테두리 #c9ced6 (`--border-strong`)
- **상태**: 오류 #aa0808 (`--destructive`, 실제 오류에만), 성공 초록 · 주의 호박색 (`--success`·`--warning`)

### 타이포그래피

- **Sans**: Pretendard Variable (`src/styles/fonts.css`)
- **Mono**: JetBrains Mono (숫자, 코드, 지표 ID)
- 22px/500 화면 제목, 16px/500 이름·버튼, 14px/400 설명. 자세히는 `docs/imports/typography.md`
- 모든 숫자에 `tabular-nums` 적용

### 레이아웃

- 머리(App Header 56px) + 본문 + 오른쪽 세로 단계 표시줄(`StepRail`) + 아래 고정 Action Bar(72px)
- 본문은 좌우 32px 여백, 안쪽 최대 폭 1344px 를 가운데에 둔다
- 평가 흐름 만들기는 단계 표시줄 없이 왼쪽 항목 트리와 가운데 흐름도를 둔다
- 자세히는 `docs/imports/Guidelines.md`

## 주요 컴포넌트 패턴

### Radio Card
- 2~4개 상호 배타적 옵션 (작업 유형, 성적서 용도, 양성 클래스)
- 선택: 강조색 테두리 + 강조 배경(`bg-primary-subtle`)

### 지표 선택
- 체크박스 + 지표 ID(mono) + 지표 이름 + 설명
- 매핑한 컬럼으로 계산할 수 없는 지표는 비활성으로 두고 이유를 한 줄 붙인다(`docs/MATERIAL_PICKER.md` §3)
- F-β 를 고르면 β 값 입력 칸이 나온다

### Data Table
- shadcn Table 사용
- 헤더: bg-muted/40
- 숫자 컬럼: 우측 정렬 + tabular-nums
- 행 hover: bg-muted/50

## 기술 스택

- **Framework**: React 18.3 + TypeScript
- **Build**: Vite 6
- **Routing**: React Router v7
- **State**: Zustand (`src/utils/stores/`)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: lucide-react
- **Package Manager**: pnpm

## 개발

```bash
pnpm install          # 의존성 설치
pnpm dev              # 개발 서버 (Vite)
pnpm typecheck        # 타입 체크 (tsc --noEmit)
pnpm test             # 단위 테스트 (vitest)
pnpm build            # 프로덕션 빌드
```
`VITE_API_BASE_URL` 미설정 시 API 호출은 상대경로 → Vite 프록시로 전달됩니다.

테스트 관례: 옆 저장소(`../Capstone_Back`)를 읽는 테스트는 `it.skipIf(!existsSync(…))` 로 둔다 — CI 는 이 저장소만 받는다. 판 1 보관본의 정답은 운영 main 이 그린 글(`src/test/archive/main_d38890d/`)이고 새 코드로 다시 뜨지 않는다(판 1·2 스냅샷이 바뀌면 그 판 분기를 고친다). 판 2·3 보관본 정답(`src/test/archive/issued/`)과 판 3 새 성적서 정답(`src/test/edition3/newRun/`)도 고치지 않는다 — 실패하면 코드를 고친다. 판 4 시험 자료와 다시 뜨는 법은 `docs/ARCHITECTURE.md` §6.6.

## 중요 규칙

### 컴포넌트 사용
- ✅ shadcn/ui 컴포넌트 우선 사용
- ✅ Card로 모든 그룹핑
- ✅ 모든 숫자에 font-mono + tabular-nums
- ❌ 그라디언트, 그림자, 장식 아이콘 금지
- ❌ 8px 초과 border-radius 금지 (버튼·카드는 8px — `docs/MATERIAL_PICKER.md` §10)

### 데이터 처리 (자세한 규칙은 `SPEC.md`)
- Binary: positive_class 필수, score 사용 시 threshold 필요
- Multiclass: argmax 기본. `prob_class_*` 컬럼과 클래스의 대응은 컬럼명으로 정한다(컬럼 수 검사는 하지 않는다 — SPEC.md §2)
- Multilabel: 레이블별 독립 threshold

### 검증 규칙
- y_true 필수
- y_pred 또는 확률 컬럼(score/prob_class_*/prob_label_*) 중 하나 필수
- 확률값은 0~1 범위(벗어나면 오류), Multiclass 확률 합 ≈ 1(경고)
- ID 중복은 경고만 하고 행을 빼지 않는다(SPEC.md §4)

## 라이선스

© 2026 Kim Minseo, Hwang Inyong (서울과학기술대학교 졸업과제)
