# Capstone_Front 프로젝트 아키텍처 및 구조 가이드

본 문서는 프로젝트에 처음 참여하는 개발자가 **전체적인 프로젝트 구조와 아키텍처 원칙**을 빠르게 파악할 수 있도록 작성되었습니다. 구조적으로 지켜야 할 세부 규칙은 `FRONTEND_DEVELOPMENT_GUIDELINE.md` 를 함께 참고하세요.

## 1. 프로젝트 개요

- **목적**: KS X ISO/IEC TS 4213:2022 표준에 기반한 머신러닝 모델 성능 평가 보고서("시험성적서") 자동 생성 웹 애플리케이션
- **주요 워크플로우 (7단계, 각 단계 = 독립 라우트 `/app/*`)**:
  기본 정보 입력 → 시험항목(지표) 선택 → 지표 상세 → 데이터 업로드 → 컬럼 매핑 → 데이터 검증 → 결과 미리보기(보고서 생성)
- **핵심 정책 및 스펙 문서**:
  - `SPEC.md`: 각 테스트 케이스(지표)별 필요 컬럼 및 동적 계산 로직이 정의된 **단일 진실 문서(Single Source of Truth)**. (프론트/백엔드 공통 기준)
  - `FRONTEND_DEVELOPMENT_GUIDELINE.md`: 프론트엔드 아키텍처 규칙 및 개발 시 준수해야 할 구조적 가이드라인 명시
  - `README.md`: 전체적인 디자인 시스템(색상, 타이포그래피, 레이아웃) 및 기타 설정 명시

## 2. 기술 스택

- **Core**: React (v18.3), TypeScript
- **Build Tool**: Vite (v6)
- **Routing**: React Router (v7)
- **Styling**: Tailwind CSS (v4), shadcn/ui (Radix UI 기반 프리미티브), Emotion (일부 지원용)
- **State/Data Management**: Zustand 전역 스토어 (`src/utils/stores/useWorkflowStore.ts`, `useWorkspaceStore.ts`)
- **Package Manager**: pnpm

## 3. 디렉토리 구조 (Directory Structure)

프로젝트는 **"페이지 기반 컴포넌트 코로케이션(Page-based Component Colocation)"** 아키텍처를 따릅니다. 페이지(`pages/`)는 상태를 스토어에서 읽어 도메인 컴포넌트에 주입하고 레이아웃을 제어하는 **얇은 조립자(Assembler)** 역할만 하며, 실제 UI와 비즈니스 로직은 도메인별 `components/`, `hooks/`, `lib/` 로 분리됩니다.

```text
Capstone_Front/
├── docs/                      # 프로젝트 문서
├── src/
│   ├── components/            # 도메인별 및 재사용 UI 컴포넌트
│   │   ├── basic-info/        # Step 1: 기본 정보
│   │   ├── test-items/        # Step 2: 시험항목(지표) 선택
│   │   ├── metric-detail/     # Step 3: 지표 상세
│   │   ├── data-upload/       # Step 4: 데이터 업로드
│   │   ├── column-mapping/    # Step 5: 컬럼 매핑
│   │   ├── data-validation/   # Step 6: 데이터 검증
│   │   ├── report/            # 📊 최종 성적서 렌더링 (layout/ · sections/ · shared/)
│   │   ├── workspaces/        # 워크스페이스 목록/상세용 컴포넌트
│   │   ├── landing/           # 랜딩 페이지 섹션 컴포넌트
│   │   └── ui/                # 🧩 공통 원시(primitive) 컴포넌트 (shadcn/ui 기반)
│   ├── data/                  # 정적 도메인 데이터/카탈로그 (evaluationData, templateExamples, landingData, dataValidationShowcase)
│   ├── hooks/                 # React 결합 재사용 로직 (useReportData, useIssuance, usePdfDownload, useDataValidation, useColumnAnalysis, usePrintOnReady)
│   ├── layout/                # 공개 레이아웃 셸
│   │   ├── WorkflowShell.tsx  # 워크플로우 스텝 페이지용 셸 (AppHeader + StepTabs + ActionBar)
│   │   ├── AppShell.tsx       # 비-워크플로우 페이지용 경량 셸 (AppHeader만)
│   │   └── components/        # 레이아웃 내부 부품 (AppHeader, ActionBar, StepTabs) — 은닉
│   ├── lib/                   # 백엔드 계약·외부 연동(API)·리포트 도메인 로직 계층
│   │   ├── apiBase.ts         # API base URL 헬퍼
│   │   ├── mapping/           # 프론트↔백엔드 역할 변환 (translateRoleToBackend/Frontend)
│   │   └── report/            # 성적서 조립·평가 로직 + 코로케이션된 테스트
│   ├── pages/                 # 라우팅 단위 페이지 (Assembler 역할)
│   │   ├── report/            # Report, ReportPrint
│   │   └── workspaces/        # WorkspaceList, WorkspaceDetail
│   ├── styles/                # 글로벌 스타일 (fonts.css, index.css, landing.css, tailwind.css, theme.css)
│   ├── test/                  # 테스트 설정 및 스모크 테스트 (setup.ts, smoke.test.tsx)
│   ├── types/                 # TypeScript 타입 정의 (*.types.ts)
│   ├── utils/                 # 계층화된 유틸리티 (아래 4.4 참고)
│   │   ├── styling/           # styles.ts (Tailwind cn 등)
│   │   ├── format/            # format.ts (파일 크기·날짜 포맷)
│   │   ├── domain/            # validation.ts, mappingHelpers.ts, showcaseSeed.ts
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
- **구조**: 각 단계는 독립 라우트/페이지입니다. 예: `routes.ts` 의 `/app/basic-info → BasicInfo`, `/app/metrics → TestItems`. `Home.tsx` 는 루트("/")에서 `LandingPage` 를 렌더합니다.
- **레퍼런스**: `pages/BasicInfo.tsx`, `pages/TestItems.tsx` 가 얇은 조립자의 모범 예시입니다.

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
3. **컴포넌트 추적 방법**: 특정 단계를 수정하려면 `src/routes.ts` 에서 경로(예: `/app/data-upload → DataUpload`)를 확인하고, 해당 `src/pages/*.tsx` 페이지가 주입하는 `src/components/<도메인>/` 컴포넌트를 찾으세요.
