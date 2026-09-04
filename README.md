# ML 성능평가 프론트엔드 / ISO/IEC 4213 기반

ML 모델 성능 평가 보고서("시험성적서")를 **KS X ISO/IEC TS 4213:2022** 표준에 따라 자동 생성하는 웹 애플리케이션의 프론트엔드입니다.

> 이 README는 **디자인 시스템·컴포넌트 패턴** 위주입니다. 코드 구조/아키텍처는 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)와 [`docs/FRONTEND_DEVELOPMENT_GUIDELINE.md`](docs/FRONTEND_DEVELOPMENT_GUIDELINE.md)를, 지표·컬럼·검증 규칙은 [`SPEC.md`](SPEC.md)(프론트/백 공통 단일 진실 문서)를, 프로젝트 전체(프론트+백)는 상위 `../PROJECT_OVERVIEW.md`를 참고하세요.

## 프로젝트 구조 (요약)

"페이지 = 얇은 조립자(Assembler)" 아키텍처. 자세한 규칙은 `docs/ARCHITECTURE.md` 참조.

```
src/
├── App.tsx / main.tsx / routes.ts   # 라우팅 진입 (워크플로우는 /app/*)
├── pages/          # 라우트 단위 얇은 조립자 (+ report/, workspaces/)
├── components/     # 도메인별 UI (basic-info … report, workspaces, landing, ui)
├── layout/         # WorkflowShell(워크플로우 셸) · AppShell(비-워크플로우 셸)
├── hooks/          # 데이터 페칭·부수효과 훅
├── lib/            # apiBase · mapping(role 변환) · report(API·성적서 로직)
├── utils/          # styling · format · domain · stores(Zustand)
└── data/ · types/ · styles/ · test/
```

## 7단계 워크플로우

1. **기본 정보** — 회사/모델 정보, 평가 유형(binary/multiclass/multilabel) 선택
2. **시험항목** — 지표(Metric, M1~M23) 선택
3. **지표 상세** — 지표별 목표값·추가 입력(M5 선택 시 β값 등)
4. **데이터 업로드** — 평가 데이터(CSV/JSON) + 학습 데이터셋 정보
5. **컬럼 매핑** — AI 자동 매핑 검토, positive_class 설정(조건부)
6. **데이터 검증** — 백엔드 전처리 검증 결과 확인
7. **결과 미리보기(성적서)** — 지표 대시보드, 혼동 행렬, 차트, LLM 서술

## 디자인 시스템

### 영감
Linear, Vercel, Supabase 대시보드에서 영감을 받은 정밀하고 깔끔한 디자인:
- 크리스프한 흰색 카드 + 밝은 중립 배경
- 샤프한 타이포그래피 + 넉넉한 line-height
- 플랫 서피스 (그림자 없이 border로 구분)
- 단일 액센트 컬러 (Blue #2563EB)

### 컬러 시스템
- **Neutrals**: #FAFAFA (background) → #FFFFFF (card) → #09090B (text)
- **Primary**: #2563EB (액션 컬러)
- **Status**: Green(success), Amber(warning), Red(danger)

### 타이포그래피
- **Sans**: Pretendard Variable (한글), Inter (영문)
- **Mono**: JetBrains Mono (숫자, 코드, 지표 ID)
- 모든 숫자에 `tabular-nums` 적용 필수

### 레이아웃
- Full-width with inner cap (1280px centered, 32px side padding)
- Sticky top navigation (App Header 56px + Step Tabs 48px)
- Sticky bottom Action Bar (72px)
- 카드 간격: 24px (기본), 40px (주요 섹션 구분)

## 주요 컴포넌트 패턴

### Radio Card
- 2~4개 상호 배타적 옵션 (평가 유형, 시험결과서 용도, positive class)
- 선택: 2px border-primary + bg-primary-subtle
- 상단 좌측에 작은 원형 인디케이터

### Selectable Card (지표 Selection)
- 체크박스 + 지표 ID(mono) + 메트릭명 + 설명
- 그리드: xl=4열, lg=3열, md=2열, sm=1열
- M5 선택 시 하단에 β값 입력 카드 표시
- 요구사항 Badge: "score 필요", "prob 필요", "β값 필요"

### Metric Block
- 대형 메트릭 표시 (성적서/결과)
- 상단 라벨(mono uppercase) + 값(2rem mono) + 보조 텍스트
- 수직 divider로 구분된 단일 카드

### Data Table
- shadcn Table 사용
- 헤더: bg-muted/40, uppercase mono
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

## 중요 규칙

### 컴포넌트 사용
- ✅ shadcn/ui 컴포넌트 우선 사용
- ✅ Card로 모든 그룹핑
- ✅ 모든 숫자에 font-mono + tabular-nums
- ❌ 그라디언트, 그림자, 장식 아이콘 금지
- ❌ 8px 이상의 border-radius 금지

### 데이터 처리 (자세한 규칙은 `SPEC.md`)
- Binary: positive_class 필수, score 사용 시 threshold 필요
- Multiclass: argmax 기본, prob_class_* 컬럼 수 = 클래스 수
- Multilabel: 레이블별 독립 threshold

### 검증 규칙
- y_true 필수
- y_pred 또는 확률 컬럼(score/prob_class_*/prob_label_*) 중 하나 필수
- ID 중복 금지, 확률값 0~1 범위, Multiclass prob 합 ≈ 1

## 라이선스

© 2026 서울과학기술대학교
