# Capstone_Front 프로젝트 아키텍처 및 구조 가이드

본 문서는 프로젝트에 처음 참여하는 개발자가 **전체적인 프로젝트 구조와 아키텍처 원칙**을 빠르게 파악할 수 있도록 작성되었습니다. 구조적으로 지켜야 할 세부 규칙은 `FRONTEND_DEVELOPMENT_GUIDELINE.md` 를 함께 참고하세요.

## 1. 프로젝트 개요

- **목적**: KS X ISO/IEC TS 4213:2022 표준에 기반한 머신러닝 모델 성능 평가 보고서("시험성적서") 자동 생성 웹 애플리케이션
- **주요 흐름**: 작업 유형(`/app`) → 평가 흐름 만들기(`/app/composer`) → 입력 화면들 → 검증(`/app/data-validation`) → 확인과 생성(`/report/:id`)
  - 평가 흐름 만들기에서 사용자가 항목을 넣어 블록을 만들고 순서를 정한다. 입력 화면은 그 블록 순서대로 나오며, 검증과 확인과 생성까지 합쳐 최소 8개·전체 12개다(`utils/domain/workflowSteps.ts` 의 `buildStepList`). 자세히는 `docs/MATERIAL_PICKER.md` §12.
  - 입력 화면과 검증은 `/app/*` 이고, run 이 생긴 뒤의 확인과 생성만 `/report/:id` 다. 발급한 성적서는 번호로 연다(`/report/no/:reportNo`).
  - 화면 용어로 '단계'는 흐름의 네 묶음(의뢰 정보·모델·데이터·평가 기준)만 뜻하고, 입력 화면 하나하나는 '화면'이라 부른다.
- **핵심 정책 및 스펙 문서**:
  - `SPEC.md`: 각 테스트 케이스(지표)별 필요 컬럼 및 동적 계산 로직이 정의된 **단일 진실 문서(Single Source of Truth)**. (프론트/백엔드 공통 기준)
  - `FRONTEND_DEVELOPMENT_GUIDELINE.md`: 프론트엔드 아키텍처 규칙 및 개발 시 준수해야 할 구조적 가이드라인 명시
  - 디자인 시스템(색·글자·모서리): `docs/imports/colors.md`·`typography.md`·`spacing.md` 와 `docs/MATERIAL_PICKER.md` §10. 실제 값의 정본은 `src/styles/theme.css` 다.

## 2. 기술 스택

- **Core**: React (v18.3), TypeScript
- **Build Tool**: Vite (v6)
- **Routing**: React Router (v7)
- **Styling**: Tailwind CSS (v4), shadcn/ui (Radix UI 기반 프리미티브). `package.json` 에 Emotion·MUI 가 남아 있지만 `src/` 는 쓰지 않는다.
- **State/Data Management**: Zustand 전역 스토어 (`src/utils/stores/useWorkflowStore.ts`, `useWorkspaceStore.ts`)
- **Package Manager**: pnpm

## 3. 디렉토리 구조 (Directory Structure)

프로젝트는 **"페이지 기반 컴포넌트 코로케이션(Page-based Component Colocation)"** 아키텍처를 따릅니다. 페이지(`pages/`)는 상태를 스토어에서 읽어 도메인 컴포넌트에 주입하고 레이아웃을 제어하는 **얇은 조립자(Assembler)** 역할만 하며, 실제 UI와 비즈니스 로직은 도메인별 `components/`, `hooks/`, `lib/` 로 분리됩니다.

단계는 번호가 아니라 이름(`StepId`)으로 부른다 — 화면 순서는 사용자가 평가 흐름 만들기에서 정하므로 폴더에 단계 번호를 붙이지 않는다.

```text
Capstone_Front/
├── docs/                      # 프로젝트 문서
├── src/
│   ├── components/            # 도메인별 및 재사용 UI 컴포넌트
│   │   ├── task-type/         # 작업 유형 선택 (TaskTypeSelect, TaskTypeIcon)
│   │   ├── material-picker/   # 평가 흐름 만들기 (트리·흐름도·하단 바)
│   │   ├── basic-info/        # 회사·모델 정보 폼 (의뢰자 정보·평가 대상 모델 화면이 씀)
│   │   ├── composer-input/    # 레지스트리 항목을 그리는 입력 폼 부품
│   │   ├── model-env/         # 모델 설정과 실행 환경
│   │   ├── data-info/         # 학습 데이터·테스트 데이터·정답 라벨
│   │   ├── report-info/       # 학습 데이터 예시 파일 칸
│   │   ├── data-upload/       # 평가 데이터 업로드
│   │   ├── column-mapping/    # 컬럼 매핑
│   │   ├── test-items/        # 지표와 합격 기준
│   │   ├── data-validation/   # 검증
│   │   ├── workflow/          # 여러 화면이 함께 쓰는 안내 (생성 전 안내, 백엔드 안내, 파일 다시 올리기)
│   │   ├── report/            # 📊 최종 성적서 렌더링 (layout/ · sections/ · shared/ — 판 1~3, edition4/ — 판 4, §6.6)
│   │   ├── workspaces/        # 워크스페이스 목록/상세용 컴포넌트
│   │   ├── landing/           # 랜딩 페이지 섹션 컴포넌트
│   │   ├── ui/                # 🧩 공통 원시(primitive) 컴포넌트 (shadcn/ui 기반)
│   │   └── ErrorBoundary.tsx  # 렌더 오류를 잡아 백지 대신 안내를 보인다
│   ├── data/                  # 정적 도메인 데이터/카탈로그 (evaluationData, reportComposer(항목 레지스트리), workflowSteps(화면 카탈로그), templateExamples, landingData, dataValidationShowcase, reportShowcase)
│   ├── hooks/                 # React 결합 재사용 로직 (useReportData, useIssuance, usePdfDownload, useDataValidation, useColumnAnalysis, usePrintOnReady, useStepFlow, useScrollEdges)
│   ├── layout/                # 공개 레이아웃 셸
│   │   ├── WorkflowShell.tsx  # 워크플로우 화면용 셸 (AppHeader + StepRail + ActionBar)
│   │   ├── AppShell.tsx       # 비-워크플로우 페이지용 경량 셸 (AppHeader만)
│   │   └── components/        # 레이아웃 내부 부품 (AppHeader, ActionBar, StepRail) — 은닉
│   ├── lib/                   # 백엔드 계약·외부 연동(API)·리포트 도메인 로직 계층
│   │   ├── apiBase.ts         # API base URL 헬퍼
│   │   ├── mapping/           # 프론트↔백엔드 역할 변환 (translateRoleToBackend/Frontend)
│   │   ├── report/            # 성적서 조립·평가 로직 + 코로케이션된 테스트 (edition4/ — 판 4 순수 함수, §6.6)
│   │   └── upload/            # 업로드 파일 크기 한도
│   ├── pages/                 # 라우팅 단위 페이지 (Assembler 역할)
│   │   ├── report/            # Report, ReportPrint, ReportByNumber(번호로 열기)
│   │   └── workspaces/        # WorkspaceList, WorkspaceDetail
│   ├── styles/                # 글로벌 스타일 (fonts.css, index.css, landing.css, tailwind.css, theme.css)
│   ├── test/                  # 테스트 설정과 저장소 전체 검사
│   │   ├── archive/           # 옛 판 성적서 정답 파일·스냅샷 (손으로 고치지 않는다, §6.3)
│   │   ├── contract/          # 사실 시트 계약 사본 (백엔드와 같아야 함, §6.2 · 판 4 사본 *_ed4.json §6.6)
│   │   ├── edition3/          # 판 3 새 성적서 정답 (손으로 고치지 않는다, §6.6)
│   │   ├── edition4/          # 판 4 시험 자료 — 고정 문구 사본·예시본 사본·렌더 픽스처 (§6.6)
│   │   ├── noPrivateDocLinks.test.ts  # 저장소 밖 개인 문서 링크 금지
│   │   ├── noStockColors.test.ts      # 토큰 대신 쓴 stock 색 금지
│   │   └── setup.ts, smoke.test.tsx …
│   ├── types/                 # TypeScript 타입 정의 (*.types.ts)
│   ├── utils/                 # 계층화된 유틸리티 (아래 4.4 참고)
│   │   ├── styling/           # styles.ts (Tailwind cn 등)
│   │   ├── format/            # format.ts (파일 크기·날짜 포맷)
│   │   ├── domain/            # 순수 도메인 헬퍼 (workflowSteps, cardOrder, flowChart, validation, mappingHelpers …)
│   │   ├── image/             # 예시 이미지 미리보기
│   │   └── stores/            # useWorkflowStore.ts, useWorkspaceStore.ts (Zustand)
│   ├── App.tsx                # 라우팅 설정 (BrowserRouter + Routes, routes.ts 를 map)
│   ├── main.tsx               # React DOM 진입점 (styles/index.css 로드)
│   └── routes.ts              # 라우트 배열 정의
├── package.json
├── README.md
└── SPEC.md
```

## 4. 핵심 아키텍처 원칙

### 4.1. 얇은 페이지 컴포넌트 (Thin Pages / Assembler Pattern)
`src/pages/` 내의 파일들은 복잡한 JSX나 비즈니스 로직을 직접 갖지 않습니다.
- **역할**: `useWorkflowStore`(Zustand)에서 상태를 읽어 `components/<도메인>/` 컴포넌트에 props 로 주입하고, `WorkflowShell`(워크플로우) 또는 `AppShell`(비-워크플로우)로 감쌉니다. 데이터 페칭 등 부수효과는 `hooks/` 로 분리합니다.
- **구조**: 각 입력 화면은 독립 라우트/페이지입니다. 예: `routes.ts` 의 `/app/client-info → ClientInfo`, `/app/metrics → TestItems`. `Home.tsx` 는 루트("/")에서 `LandingPage` 를 렌더합니다. 옛 `/app/basic-info` 는 이제 작업 유형 화면(`/app`)으로 보내는 리다이렉트일 뿐입니다.
- **레퍼런스**: `pages/ClientInfo.tsx`, `pages/TestItems.tsx` 가 얇은 조립자의 모범 예시입니다.

### 4.2. 관심사의 분리 (Separation of Concerns)
- **전역 상태**: 워크플로우/워크스페이스 상태는 `utils/stores/` 의 Zustand 스토어에 응집됩니다.
- **데이터 페칭**: `/api/*` 호출 등 부수효과는 `hooks/`(예: `useDataValidation`, `useColumnAnalysis`)와 `lib/`(예: `report/confirmMappingApi`)로 분리합니다.
- **비즈니스 로직**: 성적서 조립·평가·백엔드 계약 매핑은 `lib/report/`, `lib/mapping/` 에 응집되며 순수 UI 헬퍼는 `utils/domain/` 에 둡니다.
- **도메인 컴포넌트**: `components/<도메인>/` 는 메인 컨텐츠 UI와 사용자 이벤트 처리만 담당합니다.

### 4.3. UI 및 디자인 시스템 (Tailwind + shadcn/ui)
- 크리스프한 흰색 카드, 플랫 서피스 디자인
- `shadcn/ui` 기반 접근성 높은 원시 컴포넌트(`components/ui/`) 활용
- 커스텀 CSS 는 지양하고 **Tailwind 유틸리티 클래스**를 우선 사용

### 4.4. 계층별 배치 규칙 (요약)
- `components/ui/`: 앱 전반 재사용 primitive만 (button, input, card, calendar, popover 등)
- `components/<도메인>/`: 특정 화면 전용 컴포넌트 (코로케이션)
- `lib/`: 백엔드 계약·외부 연동·리포트 도메인 로직 (테스트 코로케이션)
- `utils/`: 순수·동기 UI 헬퍼(`styling`/`format`/`domain`) 및 전역 스토어(`stores`)
- `hooks/`: React 결합 재사용 로직
- `data/`: 정적 도메인 데이터
- `layout/`: 공개 셸(`WorkflowShell`, `AppShell`)은 최상위, 내부 부품은 `layout/components/`

## 5. 새로운 개발자를 위한 시작 팁
1. **`SPEC.md` 정독 필수**: "데이터 컬럼 매핑 규칙"과 "계산 가능한 테스트 케이스 결정 로직"이 이 문서에 있습니다.
2. **`FRONTEND_DEVELOPMENT_GUIDELINE.md` 확인**: 페이지=조립자, 레이아웃 오케스트레이션, UI/도메인 분리, utils/lib 계층화 등 반드시 지켜야 할 규칙이 정리되어 있습니다.
3. **컴포넌트 추적 방법**: 특정 화면을 수정하려면 `src/routes.ts` 에서 경로(예: `/app/data-upload → DataUpload`)를 확인하고, 해당 `src/pages/*.tsx` 페이지가 주입하는 `src/components/<도메인>/` 컴포넌트를 찾으세요.
4. **주석 속 짧은 코드**: 코드 주석의 `A-01`·`E-06`·`F-09` 같은 코드는 옛 문제 대장(저장소에 없음)의 항목 번호이고, `DESIGN_GAPS R1`~`R6` 은 옛 설계–구현 차이 기록의 번호다. 둘 다 "이 코드가 왜 이렇게 됐는지"를 가리키는 역사 표시로만 남겨 두었다. 원문은 저장소에 없으므로 주석이 그 자리의 이유를 직접 적는다.

## 6. 성적서 서술과 판(contentSchema)

> 2026-10, AI 서술 설계 구현 라운드. 백엔드 쪽(작업 번호·장별 생성·칸별 검사·규칙 문장·결정 번호 Dnn 의 뜻)은 백엔드 저장소 `docs/ARCHITECTURE.md` §10, 평가 응답과 클래스 표기는 같은 문서 §9 에 있다. 여기서는 프론트가 하는 일만 적는다.

한 줄 요약: **평가는 한 번, 서술은 작업 번호로 기다린다.** 서술이 끝나야(done) 완성본이 되고, 그 전에는 인쇄·PDF·발급이 잠긴다. 성적서 데이터에는 판 번호(`contentSchema`)가 찍혀 있어, 이미 발급한 옛 판은 발급 당시 모양 그대로 그린다. 새 성적서는 기본이 판 3 이고, 판 4(목차를 대상·방법·결과·소견·권고로 다시 묶은 판)는 빌드 환경변수로 켠다(§6.6).

### 6.1 흐름 — run 을 만들 때부터 완성본까지

1. **평가 요청 스냅샷**(`lib/report/evaluationRequest.ts`): 검증 화면에서 "다음"을 눌러 run 을 만들 때 평가 요청 본문·조립 입력·모델 정보와 **파일 지문**(이름·바이트·마지막 수정 시각)을 run 에 얼린다. 성적서 화면은 지금 입력이 아니라 이 스냅샷으로만 평가한다. 가진 파일의 지문이 다르거나 파일이 없으면 "이 평가의 파일을 다시 올려 주세요", 스냅샷이 없는 옛 run 은 "다시 평가", 없는 id 는 "찾을 수 없음". 판 번호(`contentSchema`)도 이때 성적서 데이터에 찍힌다(`mapWorkflowToFinalReport` 가 `reportEdition.newRunContentSchema()` 로 정한다 — 기본 3, 판 4 는 §6.6).
2. **성적서 화면 `/report/:id`**(`hooks/useReportData.ts`) — 효과가 둘이다.
   - **평가 효과**: 의존성은 run id·서술 상태·평가할 파일뿐이다(run 객체를 넣으면 저장할 때마다 평가와 유료 서술 작업이 되풀이된다). 서술을 아직 시작하지 않은 run 만 `POST /api/evaluate` → 조립(6.2) → `POST /api/narrative/jobs` 를 부르고, 1단계 성적서(지표·차트·8.1 표, 서술 없음)와 서술 상태 pending(작업 번호·다시 만들기용 요청)을 **한 번에** 저장한다. 같은 run 의 평가는 **모듈 단위로 한 번만** 돈다(`evaluationsInFlight`) — `main.tsx` 가 `React.StrictMode` 라 개발 중에는 효과가 두 번 돌고, 인쇄 탭·두 화면이 같은 run 을 열 수도 있기 때문이다.
   - **서술 효과**: pending 이고 작업 번호가 있으면 `GET /api/narrative/jobs/{id}` 로 조회만 한다(`lib/report/narrativeJobApi.ts`). 진행 단계(대기·생성 중·검사 중·다시 만드는 중)는 컴포넌트 상태에만 두고, **저장소에는 끝 상태(pending/done/failed)만** 쓴다.
3. **done 이어야 완성본**: done 이면 서술을 1단계 성적서에 합쳐 `isEvaluated: true` 로 저장한다. 판정·점수는 프론트 규칙(`computeVerdict`) 값 그대로이고 서술만 합친다.
4. **잠금**: 완성본이 아니면 PDF·발급·정정 발급이 잠긴다(버튼과 함수 양쪽, 이유 표시). 인쇄 화면은 저장된 완성본만 읽는다(`useStoredReport` — 평가·작업을 시작하지 않는다). 완성본이 아니면 "서술이 끝나지 않아 인쇄할 수 없습니다"이고 `usePrintOnReady` 가 인쇄를 부르지 않는다. 저장에 실패해도 PDF 를 잠근다.
5. **실패와 다시 하기**(`components/report/ReportStateNotices.tsx`):
   - 서버가 실패를 알리면(시간 초과·유실·오류·결과 글 만료) "서술 다시 만들기" — run 에 저장해 둔 서술 요청(40만 자 상한, 넘으면 평가부터 다시)으로 새 작업을 만든다.
   - 조회가 60초 동안 닿지 않았거나(unreachable) 12분을 기다리다 포기했으면(gave_up) 버튼은 "서술 진행 다시 확인" — 새 유료 작업을 만들지 않고 **원래 작업 번호부터** 다시 조회한다.
   - 413·422(rejected)는 같은 요청을 다시 보내도 같으므로 다시 만들기 버튼이 없다.
6. **새로고침**하면 저장된 작업 번호로 이어 조회한다(평가를 다시 하지 않는다).
7. **결과 글은 24시간**: 백엔드는 끝난 작업의 결과 글을 24시간 뒤 지운다(`NARRATIVE_RESULT_TTL_HOURS`). 그 뒤에 조회하면 실패(expired)이고, 다시 만들기로 푼다. 완성본은 이미 run 에 저장돼 있어 영향이 없다.

### 6.2 사실 시트 — AI 에 보내는 값을 만드는 곳

평가 응답을 받은 뒤 서술 요청을 만드는 순서다. 모두 `lib/report/` 에 있다.

1. `assembleEvaluatedReport` — 평가 응답으로 1단계 성적서와 사실 시트를 조립한다(서술과 무관한 결정론적 부분). 7~9절 고정 문장 목록(`facts.fixed_sentences`)도 여기서 만든다.
2. `buildFactSheet` + `narrativeFacts` — `narrativeFacts.ts` 는 **서술용 파생값을 계산하는 한 곳**이다(최약 클래스·작은 표본, 최다 오분류 쌍, 예측 편향, 마진·판정 사유 등). 9절 문제 목록과 7.1 아래 D6 표도 같은 값을 읽는다. 엔진이 계산한 값(FP/FN·신뢰구간·불균형 영향 등)은 다시 세지 않는다.
3. `factSheetFit` — 백엔드와 **같은 상한**(`factSheetLimits.ts`)으로 미리 자른다. 상위 N개만 남기고 뺀 수는 `facts.omitted` 에 적는다. 요청 본문이 1.8MB 를 넘으면 클래스 단위 칸을 비운다(413 으로 서술을 잃지 않게).
4. `buildClientInputs`(`reportMaterials.ts`) — 의뢰자가 준 입력(평가 관점·데이터 설명·모델 이름과 버전·실행 환경 등). **회사·과제 정보는 보내지 않는다.**

- **계약 사본**: 사실 시트 모양은 `src/test/contract/`(계약 + 예시 요청 + 백엔드 골든 평가 응답 사본)에 있고, 백엔드 저장소 `tests/contract/` 와 같아야 한다. `factSheetContract.test.ts` 가 실제 조립 결과를 예시와 대조하고, 옆 저장소가 있을 때만 두 사본이 같은지 본다. 예시를 다시 만들려면 `UPDATE_CONTRACT=1 pnpm vitest run src/lib/report/factSheetContract.test.ts` — 백엔드 사본도 함께 고친다.

### 6.3 판(contentSchema) — 발급한 성적서는 발급 당시 모양으로

발급한 성적서는 데이터를 통째로 서버에 보관하고, 번호로 열 때 지금 코드로 다시 그린다. 그래서 그리는 코드가 바뀌어도 옛 성적서 모양이 바뀌지 않게 판 번호로 가른다(`lib/report/normalizeReportContent.ts`).

| 판 | 언제 | 그리는 모양 |
|---|---|---|
| 1 | 판 표시가 없는 데이터(운영 main `d38890d` 이 발급한 것) | 발급 당시 그대로. 파생 예측 문장은 6.0 일러두기 자리, 목표값 없음은 `threshold: 0` 으로 적혀 있어 그릴 때만 `null` 로 읽는다 |
| 2 | 목표값 없음을 `null` 로 적기 시작한 판(서술 라운드 앞의 dev — 운영 main 에는 배포되지 않았다) | 서술 라운드 앞 dev 가 그리던 모양. 판 1 과 같은 것은 1.4 의 'LLM 생성 소견에 대한 면책' 항목·서명란·표지의 AI 표현·장 단위 배지뿐이고, 판 1 전용 분기(`legacyLayout`, 아래)의 main 모양은 따르지 않는다 — 1.4 는 세부 줄 목록, 1.1 빈 FAX·홈페이지 줄 없음·'평가 의뢰일', 2절 시험 대상 모델 표, 8절 '통과율 (참고)' 등. 파생 예측 문장은 7.1 앞. 칸별 출처는 있지만 판 3 의 새 모양은 없음 |
| 3 | 기본값(`REPORT_CONTENT_SCHEMA = 3`). 판 플래그를 켜지 않은 앱이 만드는 새 성적서 | 아래 목록 |
| 4 | 판 플래그(`VITE_REPORT_EDITION=4`)를 켠 앱이 만든 새 성적서(`EDITION4_CONTENT_SCHEMA = 4`). 아직 운영에서 켜지 않았다 | 판 3 섹션 부품을 쓰지 않고 따로 그린다 — 표지, 1 시험 개요 · 2 시험 대상 · 3 시험 방법 · 4 시험 결과(4.1~4.8) · 5 분석 소견 · 6 개선 권고, 발급 이력, "— 끝 —". §6.6 |

- **판 술어**: `isLegacyLayout` = 판 1(`< 2`), `usesSchema3` = 판 3 이상(판 4 에도 참이다), `usesSchema4` = 판 4 이상. 판 3 만 가르려면 `usesSchema3` 과 `usesSchema4` 를 함께 본다. 판 비교는 지금 상수가 아니라 **그 뜻이 생긴 판 번호**에 박는다 — 상수를 올릴 때 옛 분기가 따라 움직이지 않게. 판 2 보관본에도 `narrativeSections` 가 있으므로 키가 있는지가 아니라 판으로 가른다. 섹션 부품은 모두 `schema3` prop 을 받는다(화면·인쇄 양쪽).
- **`legacyLayout` prop** — 판 1 전용 운영 main 모양(`isLegacyLayout`, 화면 `ReportSections`·인쇄 `ReportPrint` 가 넘긴다). 받는 섹션: `CompanyInfoSection`(1.1 빈 FAX·홈페이지 줄과 '계약일자', 1.3 옛 용도 이름, 1.4 인라인 문장·세부 줄 없음), `EvalScopeSection`(2절 시험 대상 모델 표 없음), `DatasetSection`(학습 샘플 수 0개도 찍음, 예시 표 '정상/불량 데이터'), `ChartSection`(차트 없음 안내 옛 문장), `ConclusionSection`(8절 '종합 점수'와 그 정의). 섹션을 고칠 때 이 분기도 함께 본다.
- **판 3 에서 생긴 것**:
  - 소절 번호(1.1 ~ 9.2, `SubsectionTitle`)와 7.3 추가 관찰(빈 글이면 고정 문구 15 "해당 없음").
  - 7절 제목 바로 아래 ※ 한 줄 "소견은 정량 지표를 바탕으로 작성된 참고 의견이며, 시험 결과에 해당하지 않습니다." 그 대신 1.4 의 "LLM 생성 소견에 대한 면책" 항목이 빠진다.
  - 본문에 AI·LLM 표현이 없다 — 표지 "{기관명} 평가 플랫폼", 4절 "분류 성능 평가 시스템", 서명란 "자동화 평가 시스템". 기관 이름 자리표시자는 "리트머스"(`reportConstants.DEFAULT_PERFORMER`).
  - 칸별 "규칙 기반 문장" 배지(`SectionSourceBadge` — 규칙 문장으로 대체된 칸에만, 화면에만 `print:hidden`, 서술 대기·실패 중엔 없음). 판 1·2 의 장 단위 배지는 판 3 에 없다.
  - 화면 전용 **"작성 기록"** 상자(`NarrativeRecordPanel`): 칸마다 AI 작성(모델 이름)·규칙 기반 문장·고정 문구. `/report/:id` 와 `/report/no/:번호` 화면에만 있고, 인쇄 경로·본문에는 넣지 않으며 `print:hidden` 이다. 재료는 성적서 데이터의 `narrativeSections`·`narrativeModels`(발급 보관본에도 저장된다).
  - 고정 문구 7·16·6, 9 의 조사(숫자를 읽는 소리로 을/를), 15·17·18 을 코드가 찍는다(6.4 표).
  - 7.1 아래 D6 표(`NarrativeFactTables` — 최약 클래스, 최다 오분류 쌍(다중), 예측 편향. 비율은 %).
  - 3절 불균형 진단 세 갈래(D20 — 기준 이내 / 왜곡 관찰 / 왜곡 미관찰, `buildDatasetDiagnosis`). 왜곡 미관찰인데 다수 F1 − 소수 F1 이 음수면 승인 문장 뒤에 "다수 클래스의 F1이 소수 클래스보다 낮다(차이가 음수)."를 덧붙인다(멀티레이블은 '레이블'). '와/과'는 다수 클래스 이름의 끝소리로 고른다 — '이름(설명)' 꼴은 괄호 앞 이름으로("'2(정상)'와", "'0(정상)'과", 괄호 안은 읽지 않는 것으로 보고 앞말에 맞추는 표기 관례). 영문은 대략의 읽는 소리(대문자 약어 끝은 앞 글자와 상관없이 글자 이름 — L·M·N·R 만 받침, '%' 는 받침 없음, 소문자 끝은 -ng·-m·-n·-l·-ck 와 모음 뒤 -t 만 받침 — 'cat'과·'malignant'와). 이 규칙(`koreanJosa.nameFinalSound`)은 백엔드 `wording._final` 과 같고 같은 대조 표를 두 저장소 테스트에 둔다. 조립 때 문장을 저장하므로 새 run 에만 나온다 — 판 1·2 보관본의 3절 글은 저장된 글 그대로다.
  - 8.1 표의 모델 값·목표값은 6.1 과 같은 판정 자릿수(`formatBenchmarkValue` — 참조 범위 위치와 같은 쪽으로 읽히게 최대 여섯째 자리까지 늘리고, 그래도 반대면 위치 쪽으로 자른다. 판정 대상 지표는 같은 자릿수에서 목표 판정도 맞아야 하고, 둘 다 맞는 표기가 없을 때만 목표 판정 우선. 백엔드 8.1 서술 `range_value_text` 와 같은 규칙).
- **판 1 은 운영 main(`d38890d`)이 그리던 글 그대로다.** 번호로 연 화면은 main 의 발급본 글과 같다 — main 이 찍던 '(미발급)' 표시 오류(번호로 연 화면의 표지·서명란)만 고쳤다(`14f4754`). 정답은 `src/test/archive/main_d38890d/`(main 코드가 같은 픽스처를 그린 글)이고, `archiveLayout.test.tsx` 가 지금 코드로 그린 글이 이 파일과 한 글자도 다르지 않은지 `toBe` 로 단정한다. **이 정답 파일과 판 1 스냅샷은 새 코드로 다시 뜨지 않는다** — 다르면 판 1 분기를 고친다. 만드는 법은 `main_d38890d/generate.tsx.txt` 머리말에 있다.
- **판 2 스냅샷(`src/test/archive/__snapshots__/schema2_*`)도 바뀌면 안 된다.** 바뀌었다면 판 3 변경이 옛 판에 샌 것이다.
- **워크스페이스 저장소 판 사슬**(`utils/stores/useWorkspaceStore.ts` `migrateWorkspaceState`, 지금 3): 판마다 차례로 지난다(v1 → v2 → v3). v1 → v2 는 문자열 interpretation 을 두 칸으로, v2 → v3 은 서술이 빈 완성본 가운데 발급 안 된 것은 완성본 표시를 거둬 다시 평가하게, 발급된 것은 그대로 두고 안내(`issued_empty_narrative`)한다. 이 저장소 판은 성적서 판(contentSchema)과 다른 번호다.

### 6.4 고정 문구 번호 표

AI·규칙 문장이 아니라 코드가 찍는 문장이다. 7~9절 문장은 사실 시트의 `facts.fixed_sentences`(번호·소절·원문)에도 실어, 백엔드가 같은 말을 되풀이하지 않게 한다.

| 번호 | 위치 | 코드 |
|---|---|---|
| 1 | 원래 필요 없는 칸의 "해당 없음"(재료 표) | `reportMaterials.NOT_APPLICABLE` |
| 2.1 · 2.2 · 2.3 | 빠진 보고 항목 — 그 자리에서 보기(예: 6.4 응답시간 자리의 "제공되지 않음") · 빠졌을 때 판단할 수 없는 것 · 표지 | `LatencySection` 등 · `materialCheck.REPORTING_ITEMS` 의 `impact` · `ReportCoverSection` |
| 3 | 1.4 신뢰구간(신뢰구간을 찍은 성적서만) | `reportConstants.CONFIDENCE_INTERVAL_PREMISE` |
| 4 | 5절 다중 클래스 평균 방식 | `reportMaterials` `averagingSentence` |
| 6 | 9절 — 문제가 0개일 때(판 3 은 이 문장만) | `reportConstants.NO_PROBLEM_SENTENCE` |
| 7 | 7.2 앞 — 다중 레이블 불균형 비율 정의(판 3) | `narrativeSectionText.MULTILABEL_IMBALANCE_DEFINITION` |
| 9 | 7.1 앞 — 예측을 확률에서 파생했다는 사실 | `derivationText.derivationStatement`(판 3 은 숫자 읽는 소리로 을/를, `koreanJosa`) |
| 10 | 6.1 판정 규칙(+ 아슬아슬 표시 문장) | `reportConstants.verdictRuleText` · `NEAR_TARGET_SENTENCE` |
| 11a · 11b | 8.2 — 평가 데이터가 학습과 같은 / 다른 출처 | `dataCautionPhrases.SAME_SOURCE_SENTENCE` · `DIFFERENT_SOURCE_SENTENCE`(`sourceRelationSentence`) |
| 12 | 7.2 — 정답 라벨 주의 | `dataCautionPhrases.labelCautionSentence` |
| 13 | 1.4 — 의뢰자 제공 정보 전제 | `reportConstants.CLIENT_PROVIDED_PREMISE` |
| 14 | 2절 목적별 점검 미충족 줄(1.4 에도) | `materialCheck` · `reportConstants.constraintsFor` |
| 15 | 7.3 — 추가 관찰 없음 "해당 없음"(판 3) | `narrativeSectionText.NO_ADDITIONAL_OBSERVATION_TEXT` |
| 16 | 8.1 표 아래 — 기준표에 없는 서술 지표(판 3, 전부 없으면 8.1 은 표·16 만) | `benchmarkBaselines.noBenchmarkSentence`(기준표 지표 이름 사본 `BENCHMARK_METRIC_NAMES`) |
| 17 | 7.1 — 오류 비율 숫자 문장 | `errorRatios.errorRatioSentence` |
| 18 | 8.3 — 목표값에 아슬아슬한 지표 | `nearTarget.nearTargetNote` |
| ※ | 7절 제목 아래 한 줄(판 3) | `narrativeSectionText.SECTION7_OPINION_NOTE` |

번호 5·8 은 지금 코드에 없다. 판 3 전용 문장(16·7)은 판 3 바탕일 때만 사실 시트에 싣고, 9 는 그 판 화면과 같은 조사로 싣는다 — 옛 판 화면이 찍지 않는 문장을 실으면 AI 가 "성적서가 따로 찍는다"고 믿고 빼 버려 그 판 성적서에서 말이 빠진다.

### 6.5 입력 쪽 — 덧붙이는 글과 셈 규칙

- **덧붙이는 글**: 선택지 아래 500자 글 칸. `data/reportComposer.ts` 에서 `allowsNote` 인 칸은 13개다(서술 칸 11개 + 성적서 용도·학습과 같은 전처리). 그중 `noteNeedsChoice` 인 4칸(중요 오류 유형·클래스 중요도·사용 방식·GPU 사용 여부)은 글만으로는 답이 아니고 선택지를 골라야 한다. 칸 목록은 `docs/COMPOSER_COMPONENTS.md` "덧붙이는 글" 절.
- **셈 규칙 한 곳**(`utils/domain/composerFieldGate.ts`): `noteAnswers` — 글이 선택지 대신 답이 되는가(글 칸이고 선택 필수가 아니고 글이 있음). `chosenText` — 고른 선택값(모름이거나 글만 쓴 답이면 null). 진행 점검·성적서·재료 선택 점검·AI 고객 입력이 이 둘을 같이 쓴다.
- **"모름 + 글"은 제공이 아니다.** 그 보고 항목은 "제공되지 않음"으로 세고, 글은 버리지 않고 "제공되지 않음 (의뢰자 제공: …)"으로 성적서에 찍고 AI 에도 보낸다(`reportMaterials.materialRowText`). 백엔드는 "제공되지 않음"으로 **시작**하는 값을 제공 아님으로 읽는다.
- **점검 표 2.0**(`materialCheck.MATERIAL_CHECK_VERSION`): 이 셈 규칙과 칸 이름 변경(불균형 보정 → 편향 감소 노력)이 들어간 판. 1.0 으로 점검한 진행 중 run 에는 "다시 확인" 안내가 뜬다.
- **셈 규칙 표 테스트** `lib/report/noteCountingRules.test.ts`: 경우마다 진행 점검(답함)·2층 제공·성적서 인쇄 글·AI 글 네 자리를 한 줄로 단정한다. 한 자리만 바뀌면 어긋나므로 규칙을 바꾸면 이 표부터 고친다.

### 6.6 판 4 — 켜는 법과 정답

> 2026-10, 판 4 구현 라운드. 백엔드 쪽(서술 요청의 `report_edition`, 평가 엔진 버전, 백엔드 정답 폴더)은 백엔드 저장소 `docs/ARCHITECTURE.md` §13 에 있다.

한 줄 요약: **판 4 는 판 3 옆에 길을 하나 더 낸 것이다.** 판 3 을 그리는 코드는 그대로 두고, 판은 run 을 만들 때 한 곳에서만 정하며, 그 뒤 모든 단계는 찍힌 판만 따른다. 지금 기본값은 판 3 이고, 운영에서는 아직 켜지 않았다.

**판을 정하는 곳은 한 군데다**

- `lib/report/reportEdition.ts` 의 `newRunContentSchema()` 가 **호출될 때** `import.meta.env.VITE_REPORT_EDITION` 을 읽어, 값이 꼭 `"4"` 일 때만 4, 그 밖(변수 없음·빈 값·`"3"`·`"true"` …)은 3 을 돌려준다.
- 이 함수를 부르는 곳은 `mapWorkflowToFinalReport`(옵션 `contentSchema` 를 주지 않았을 때의 기본값) 하나다. 여기서 정한 판이 성적서 데이터의 `contentSchema` 에 찍힌다.
- 그 뒤(조립 `assembleEvaluatedReport`, 서술 요청 `buildNarrativeRequest`, 그리기, 발급)는 플래그를 다시 읽지 않고 찍힌 판(`usesSchema4`)만 본다. 그래서 플래그를 켰다 꺼도 이미 만든 run 은 만든 때의 판 그대로이고, 발급한 보관본도 찍힌 판으로 그린다(§6.3).
- 정적 시험(`reportEdition.test.ts`)이 환경변수를 읽는 곳이 이 파일 하나뿐인지 지킨다. 테스트 기본값은 `vitest.config.ts` 의 `test.env: { VITE_REPORT_EDITION: "3" }` 와 `unstubEnvs: true` 로 고정한다 — 저장소의 `.env*` 값이 테스트 기본값을 바꾸지 못하고, 한 테스트에서 `vi.stubEnv` 로 켠 판 4 가 다음 테스트로 새지 않는다.

**그리는 곳 — 입구 세 곳**

판 4 데이터는 판 3 섹션 부품에 들어가지 않는다. 입구에서 `usesSchema4(data)` 일 때만 판 4 쪽으로 보낸다.

| 입구 | 하는 일 |
|---|---|
| `components/report/ReportSections.tsx`(화면, 번호로 열기도 이것을 씀) | 맨 앞 한 줄에서 `<Edition4Report mode="screen" />` 로 보낸다 |
| `pages/report/ReportPrint.tsx`(인쇄) | 찾을 수 없음·인쇄 불가 가드 뒤, 인쇄 준비 신호를 거는 `<div ref={containerRef}>` **안에서** 판 4 와 판 3 을 가른다. 맨 앞에서 return 하면 인쇄 준비 신호와 자동 인쇄가 멈춘다 |
| `components/report/NarrativeRecordPanel.tsx`(화면 전용 "작성 기록") | 맨 위 한 줄에서 판 4 상자 `Ed4NarrativeRecord` 로 보낸다 |

- 판 4 부품은 `components/report/edition4/` 에 있다. `Edition4Report` 가 화면·인쇄 공용이고(인쇄일 때만 묶음마다 페이지 나눔), 장별 부품(`Ed4Cover`·`Ed4Overview`·`Ed4Target`·`Ed4Method`·`Ed4ResultsCore`·`Ed4ResultsDetail`·`Ed4Findings`·`Ed4Recommend`·`Ed4Closing`)과 공용 부품(`shared/`)을 부른다. 부품 이름은 "Section" 으로 끝내지 않는다 — 화면↔인쇄 배선 시험이 그 이름을 소스에서 대조한다.
- 판 4 순수 함수(문구 상수 `edition4Text.ts`, 숫자 표기, 판정 여유 `judgmentMargin.ts`, 칸→자리 대응표 `narrativeSlots.ts`, 4.4 임계값 표, 4.5 분포 표, 발급 판정 `render/issuance.ts` 등)는 `lib/report/edition4/` 에 있다. 판 3 과 같이 쓰는 잎 함수는 그대로 쓰고, 판 4 에서 글이 달라야 하면 판 4 쪽에 새 함수를 둔다.
- 판 4 저장값(판정 여유 `judgmentMargin`, `edition4Values`, 파일 해시·크기 `sourceFile`, 평가 엔진 버전 `engineVersion` 등)은 판 4 run 에만 만든다. 판 3 run 의 데이터와 서술 요청에는 판 4 키가 하나도 없다(시험이 확인).
- 서술 요청: `buildNarrativeRequest` 가 판 4 run 일 때만 최상위에 `report_edition: 4` 를 싣는다. 판 3 요청에는 이 키가 없다(백엔드 기본 3). 백엔드는 이 값 하나로만 판 4 규칙(절 번호·숫자 표기·지시문·규칙 문장)을 쓴다.
- 부록 1(성적서 점검 결과) 자리는 비워 두었다(`Ed4Closing`). 판 4 를 켜기 전에 만든다(아래 목록).

**판 4 켜는 법**

1. **백엔드를 먼저 배포한다.** 판 4 를 아는 백엔드가 운영에 떠 있는지 `/health` 의 `commit` 으로 확인한 뒤에 프론트를 켠다. 옛 백엔드가 판 4 요청을 받으면:
   - `report_edition` 을 모르는 칸이라 오류 없이 버린다 → 판 4 성적서에 판 3 절 번호·표기로 쓴 서술이 들어간다.
   - 문제 종류 `same_source`(평가 데이터가 학습과 같은 출처)를 몰라 요청 전체를 422 로 돌려보낸다.
   - 멀티레이블의 새 상태 값(`training_samples_not_provided`)을 몰라 `facts` 를 통째로 버린다.
2. **Vercel 프로젝트 환경변수에 `VITE_REPORT_EDITION=4` 를 넣고 다시 배포한다.** Vite 는 이 값을 빌드 때 앱에 박으므로 값만 넣고 다시 빌드하지 않으면 바뀌지 않는다. 끄려면 값을 지우고(또는 `3`) 다시 배포한다 — 이미 만든 판 4 run 은 판 4 그대로 남는다. Render(백엔드)에는 판 플래그가 없다.
3. 로컬에서 보려면 `VITE_REPORT_EDITION=4 pnpm dev` 처럼 띄운다.

**켜기 전 확인 목록** — 판 4 라운드에서 남긴 것. 모두 정해져야 운영에서 켠다.

- 문안 확정: 고정 문구 20(4.2 판정 근거 — 조건부 합격·불합격·판정 불가 갈래)과 21(표지 시험 결과 요약)은 초안 글로 구현했다(시험 이름에 "초안"). 부록 B31(핵심 지표가 없는 성적서의 4.2 판정 근거), B32(목표값 없는 핵심 지표의 표지 줄), B33(멀티레이블에서 학습 표본 수가 없을 때 4.5 비율 표 자리)도 초안이다.
- ISO/IEC 17025 조항 번호와 연락처 표기를 정한다(판 4 본문에는 아직 없다). 지금은 판 4 금지어 시험이 "연락처" 를 막으므로, 넣기로 하면 그 시험도 함께 고친다.
- 부록 1(성적서 점검 결과)을 만든다.
- 서술 설계 v0.14 의 "코드 반영 대기" 두 건 — 종합 총평의 평균 방식 차이 서술에 걸린 M22 조건 풀기, 종합 총평의 "평가 데이터의 대표성과 한계" 항목(판 4 묶음과 따로 하는 서술 쪽 변경). 부록 1.3 이 "평가 데이터의 대표성 | 5.1" 을 전제한다.
- 랜딩 `components/landing/ReportDemo.tsx` 는 판 3 글("시험결과서" 등)을 손으로 적은 정적 그림이라 플래그를 따라가지 않는다. 판 4 글로 바꿀지 정한다(랜딩의 다른 미리보기 `ScrollableReportPreview` 는 매퍼로 만들어 플래그를 따른다).
- 판 4 화면에서 본 어색한 곳: 평가 전 초안(3.1 핵심 열·3.4 지정 없음, 4.2·4.4·4.6 빈 소절, 4.7·4.8 문장), 인쇄 1쪽 "의뢰자" 줄이 홀로 다음 쪽으로 넘어감, "판정 불가 (… 4개 중 4개 충족)" 문장, 다중 최약 클래스 F1 넷째 자리와 고정 문구 23 범위.
- 백엔드 먼저 배포(위 1), Vercel 환경변수(위 2).
- 정해져 반영된 것(S6 뒤 사용자 결정, 2026-10-24 — 목록에서 뺐다):
  - 일부만 빠진 보고 항목은 표지·1.3·영향 줄에 "{항목 이름}(빠진 것: {빠진 줄})"(멀티레이블 "학습 데이터의 출처·크기·구성(빠진 것: 학습 클래스 분포)" — 1.3 과 2.3 의 어긋남 해결). 판정·점검 표 2.0 그대로(`materialCheck.ts`).
  - 1,000 이상 정수 건수는 표 칸뿐 아니라 문장(고정 문구 17·4.5·백엔드 규칙 문장·폴백)에도 천 단위 쉼표 — 표와 문장의 쉼표 섞임 해결. 소수·지연시간(D4)·하이퍼파라미터 글자는 그대로(`ed4Count`, 대조 표 count 줄).
  - 클래스 이름: 4.4 혼동 행렬 건수 표는 이름만, 최약·예측 편향·최다 오분류 쌍은 "이름(설명)", 설명에 괄호가 있으면 "이름[설명]", 숫자로 끝나는 이름은 4.5 분포 문장에서 "{이름}: {n}건"(`classNameEd4.ts`, 대조 표 class_name·name_count 줄) — digits 괄호 겹침·"1 55건" 해결.
  - 4.3 "불합격 | 충분" 조합은 그대로(고정 문구 19 뜻 그대로).
  - **영어 용어는 유지한다**(결정): M21 그림 축 글(Predicted/Actual), "Average 지표 세부 결과"·"Metric" 머리·"M11 — Macro Average", 4.1 "Argmax–y_pred 불일치", 산정식 기호(판 3 글 그대로). 판 4 글로 바꾸지 않는다.
- 켠 뒤 판 4 로 발급한 보관본은 판 1~3 처럼 발급 당시 모양을 지켜야 한다. 판 4 렌더러를 고칠 때 이 점을 함께 본다.

**평가 엔진 버전** — 판 4 3.5 "평가 엔진 버전" 칸은 평가 응답의 `engine_version`(백엔드 `app/evaluation/environment.py` 의 상수 `ENGINE_VERSION`, 첫 값 `1.0.0`)을 그대로 찍는다. 올리는 규칙은 백엔드 문서 §13. 프론트에는 버전 상수가 없다.

**판 4 정답과 시험 자료**

| 위치 | 무엇 | 다시 뜨는 법 |
|---|---|---|
| `src/test/edition4/fixedWording.ed4.json` | 판 4 고정 문구·예시본 글자·부록 B 문안 사본(설계 문서 고정 문구 rev 122·예시본 rev 84 에서 뽑음, sha256 이 `_about` 에) | 손으로 고치지 않는다. 설계 문서가 바뀌면 내보낸 글에서 스크립트로 다시 뽑고 상수(`edition4Text.ts`)를 같이 고친다 |
| `src/test/edition4/rpt0001/example.md` | 예시본 사본(RPT-2026-0001 을 판 4 목차로 다시 묶은 목표 모양). 렌더 시험이 절·소절 블록을 뽑아 그린 글과 대조한다 | 손으로 고치지 않는다(sha256 이 고정 문구 사본의 `example_sha256` 과 같아야 한다) |
| `src/test/edition4/render/fixtures/` | 판 4 렌더 픽스처 — 이진 `bc_strong`·다중 `digits_strong`·멀티레이블 `yeast_strong` 의 서술 대기(`pending`)·완료(`final`)·발급본(`issued`), `bc_strong` 서술 실패(`failed`) | `UPDATE_ED4_RENDER=1 npx vitest run src/test/edition4/render/generate.test.tsx`. 평소에는 다시 만든 글이 파일과 `toBe` 로 같은지만 본다. 다르면 생성값이 바뀐 것이니 이유를 적고 뜬다 |
| `src/test/edition4/render/text/` | 판 4 그린 글 정답 — 세 입력 × (미발급 `final`, 발급본 `issued`) × 세 경로(화면·인쇄·번호 열기)의 글 전체 18개. `render/renderedText.test.tsx` 가 `toBe` 로 대조한다 | `UPDATE_ED4_TEXT=1 npx vitest run src/test/edition4/render/renderedText.test.tsx`(`-u` 로는 안 바뀜). 다시 떠도 되는 경우는 그 폴더 [`README.md`](../src/test/edition4/render/text/README.md) — 판 4 글이 바뀐다는 뜻이니 이유를 적고 diff 를 읽는다 |
| `src/test/edition4/render/inputs/` | 픽스처를 만들 때 쓰는 서술 작업 응답(판 4 출처 글·예시본 서술 글) | 입력 — 고칠 일이 생기면 이유를 적는다 |
| `src/test/edition4/evaluateNewKeys/` | 판 4 칸을 더한 새 백엔드 평가 응답. 이 응답으로도 플래그를 끈 새 성적서가 판 3 정답과 같은지 본다 | 그 폴더 [`README.md`](../src/test/edition4/evaluateNewKeys/README.md) |
| `src/test/contract/*_ed4.json` | 판 4 서술 요청 계약 — 명세(`fact_sheet_contract_ed4.json`), 숫자·조사 대조 표(`number_wording_ed4.json`), 칸→자리 대응표(`narrative_slots_ed4.json`), 이진·다중·멀티 예시. 백엔드 `tests/contract/` 와 같은 바이트여야 한다 | 예시: `UPDATE_CONTRACT=1 npx vitest run src/test/edition4/contractExamplesEd4.test.tsx`(이름에 `ed4` 가 든 파일만 쓴다). 바뀐 이유를 적고 백엔드 사본과 두 저장소 시험의 sha256 을 함께 고친다 |

- 판 4 금지어 시험(`render/forbiddenWords.test.tsx`)이 화면·인쇄·번호 열기 글에 이모지, "시험결과서", 판 3 절 번호 참조, 통과율 같은 판 3 말이 없는지 본다(작성 기록 상자는 뺀다).

**판 3 정답 폴더는 고치지 않는다**

판 4 코드가 판 3 을 한 글자도 바꾸지 않았는지 지키는 정답이다. 시험이 실패하면 **정답이 아니라 코드를 고친다.** 정답을 다시 떠야 통과한다면 그 변경이 판 3 을 바꿨다는 뜻이다. `vitest -u` 는 쓰지 않는다.

- `src/test/archive/` — 판 1 정답(`main_d38890d/`), 판 2 스냅샷, 판 2·3 보관본 정답(`issued/` — 실제 판 3 발급본 6건과 합성 픽스처를 운영 main 코드로 그린 글, [`README.md`](../src/test/archive/issued/README.md)).
- `src/test/edition3/newRun/` — 플래그를 끈 새 성적서의 저장 데이터와 서술 요청 본문 정답([`README.md`](../src/test/edition3/newRun/README.md)).
- 판 3 계약 예시(`src/test/contract/` 의 `_ed4` 가 아닌 예시)는 sha256 으로 묶여 있고 `UPDATE_CONTRACT` 로도 쓰이지 않는다.
- 두 정답 폴더(`archive/issued/golden/`, `edition3/newRun/golden/`)에는 `SHA256SUMS` 가 있어, 정답을 몰래 다시 뜨면 diff 에 드러난다.
