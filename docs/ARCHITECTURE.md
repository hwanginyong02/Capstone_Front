# Capstone_Front 프로젝트 아키텍처 및 구조 가이드

본 문서는 프로젝트에 처음 참여하는 개발자가 **전체적인 프로젝트 구조와 아키텍처 원칙**을 빠르게 파악할 수 있도록 작성되었습니다.

## 1. 프로젝트 개요

- **목적**: KS X ISO/IEC TS 4213:2022 표준에 기반한 머신러닝 모델 성능 평가 보고서("시험성적서") 자동 생성 웹 애플리케이션
- **주요 워크플로우**: 
  기본 정보 입력 → 시험항목(지표) 선택 → 데이터 업로드 → 컬럼 매핑 → 데이터 검증 → 결과 미리보기(보고서 생성)
- **핵심 정책 및 스펙 문서**:
  - `SPEC.md`: 각 테스트 케이스(지표)별 필요 컬럼 및 동적 계산 로직이 정의된 **단일 진실 문서(Single Source of Truth)**. (프론트/백엔드 공통 기준)
  - `FRONTEND_DEVELOPMENT_GUIDELINE.md`: 프론트엔드 프로젝트의 아키텍처 규칙 및 개발 시 준수해야 할 구조적 가이드라인 명시
  - `README.md`: 전체적인 디자인 시스템(색상, 타이포그래피, 레이아웃) 및 기타 설정 명시

## 2. 기술 스택

- **Core**: React (v18.3), TypeScript
- **Build Tool**: Vite (v6)
- **Routing**: React Router (v7)
- **Styling**: Tailwind CSS (v4), shadcn/ui (Radix UI 기반 프리미티브), Emotion (일부 지원용)
- **State/Data Management**: Custom Hooks (`useHomeWorkflow` 등)
- **Package Manager**: pnpm

## 3. 디렉토리 구조 (Directory Structure)

프로젝트는 **"페이지 기반 컴포넌트 코로케이션(Page-based Component Colocation)"** 아키텍처를 따르고 있습니다. 즉, 페이지(`pages/`)는 단순히 레이아웃과 컴포넌트를 조립(Assemble)하는 역할만 수행하며, 실제 비즈니스 로직과 UI 구성요소는 도메인별 `components/` 폴더에 분리되어 있습니다.

```text
Capstone_Front/
├── docs/                      # 프로젝트 문서 폴더
├── src/
│   ├── components/            # 도메인별 및 재사용 가능한 UI 컴포넌트
│   │   ├── home/              # 🏠 메인 워크플로우(Home) 전용 컴포넌트 (BasicInfo, DataUpload 등 단계별 UI)
│   │   ├── report/            # 📊 최종 성능평가 보고서 렌더링 전용 컴포넌트
│   │   └── ui/                # 🧩 공통 UI 컴포넌트 (shadcn/ui 기반 버튼, 카드, 모달 등)
│   ├── data/                  # 정적 데이터, Mock 데이터 및 상수 정의
│   ├── hooks/                 # 재사용 가능한 Custom Hooks (예: useHomeWorkflow.ts)
│   ├── layout/                # 전체 앱 레이아웃 컴포넌트 (헤더, 푸터, 사이드바 등)
│   ├── lib/                   # 유틸리티 함수 (utils.ts 등)
│   ├── pages/                 # 라우팅 단위의 페이지 컴포넌트 (Assembler 역할)
│   │   └── Home.tsx           # 메인 워크플로우를 관장하는 진입점
│   ├── styles/                # 글로벌 스타일 (fonts.css, theme.css, default_shadcn_theme.css)
│   ├── types/                 # TypeScript 인터페이스 및 타입 정의
│   ├── App.tsx                # 앱 최상위 래퍼 컴포넌트
│   ├── Root.tsx               # 라우팅/프로바이더 설정 컴포넌트
│   ├── main.tsx               # React DOM 렌더링 진입점
│   └── routes.ts              # 애플리케이션 라우트 정의
├── package.json               # 의존성 및 스크립트
├── README.md                  # 디자인 시스템 및 개발 환경 설정 가이드
└── SPEC.md                    # ISO/IEC 평가 기준, 지표 컬럼 및 검증 로직 상세 명세서
```

## 4. 핵심 아키텍처 원칙

### 4.1. 얇은 페이지 컴포넌트 (Thin Pages / Assembler Pattern)
`src/pages/` 디렉토리 내의 파일들은 상태나 복잡한 비즈니스 로직을 직접 가지지 않습니다. 
- **역할**: `hooks/`에서 상태와 비즈니스 로직을 가져오고, `components/`에서 UI 조각을 가져와 상황에 맞게 렌더링(조립)합니다.
- **예시 (`Home.tsx`)**: `useHomeWorkflow()` 훅을 통해 현재 단계(Step 1 ~ Step 7) 상태를 구독하고, `if (currentStep === 1) return <BasicInfo />` 처럼 단계에 맞는 컴포넌트를 반환합니다.

### 4.2. 관심사의 분리 (Separation of Concerns)
- **상태 관리**: 워크플로우 상태 관리 로직은 뷰에서 분리되어 `hooks/useHomeWorkflow.ts` 내부에 존재합니다. 
- **비즈니스 제약사항**: 테스트 케이스 간의 의존성, 필수 컬럼 유무에 대한 판별 로직은 `SPEC.md`에 정의된 룰에 따라 `lib/` 또는 훅 내부에 응집됩니다.
- **도메인 컴포넌트**: `components/home/` 내부의 컴포넌트들은 각 단계의 UI 표현과 사용자 이벤트 처리만을 담당합니다.

### 4.3. UI 및 디자인 시스템 (Tailwind + shadcn/ui)
모든 스타일링은 `README.md`에 명시된 디자인 철학을 따릅니다:
- 크리스프한 흰색 카드, 플랫 서피스 디자인
- `shadcn/ui` 기반의 접근성 높은 컴포넌트 활용
- 커스텀 CSS 작성은 지양하고, **Tailwind CSS 유틸리티 클래스**를 최우선으로 사용하여 일관성을 유지합니다.

## 5. 새로운 개발자를 위한 시작 팁
1. **`SPEC.md` 정독 필수**: 본 시스템의 핵심인 "데이터 컬럼 매핑 규칙"과 "계산 가능한 테스트 케이스 결정 로직"이 이 문서에 있습니다. 코드를 수정하기 전 반드시 확인하세요.
2. **`README.md` 가이드라인 확인**: 디자인 시스템 규칙(숫자엔 tabular-nums 적용, 장식 그림자 금지 등)과 컴포넌트 사용 원칙이 있습니다.
3. **컴포넌트 추적 방법**: 화면 상의 특정 단계를 수정하고 싶다면, 먼저 `src/pages/Home.tsx`를 열어 해당 단계 번호(Step)에 매핑된 컴포넌트(예: `Step 4` -> `<DataUpload />`)를 확인한 뒤, `src/components/home/` 폴더 안에서 해당 파일을 찾으세요.
