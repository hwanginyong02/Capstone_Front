# ML 성능평가 / ISO/IEC 4213 기반

ML 모델 성능 평가 보고서("시험성적서")를 **KS X ISO/IEC TS 4213:2022** 표준에 따라 자동 생성하는 웹 애플리케이션입니다.

## 프로젝트 구조

```
├── SPEC.md                    # TC별 컬럼 요구사항 스펙 (단일 진실 문서)
├── guidelines/                # 디자인 가이드라인
│   ├── Guidelines.md          # 전체 디자인 철학 및 규칙
│   ├── overview-components.md # 컴포넌트 카탈로그
│   └── design-tokens/
│       ├── colors.md          # 컬러 시스템
│       ├── typography.md      # 타이포그래피
│       └── spacing.md         # 간격 및 레이아웃
└── src/
    ├── app/
    │   ├── App.tsx            # 메인 애플리케이션
    │   └── components/        # 각 단계별 컴포넌트
    │       ├── BasicInfo.tsx          # 1. 기본 정보
    │       ├── TestItems.tsx          # 2. 시험항목
    │       ├── DataUpload.tsx         # 3. 데이터 업로드
    │       ├── ColumnMapping.tsx      # 4. 컬럼 매핑
    │       ├── DataValidation.tsx     # 5. 데이터 검증
    │       └── ResultPreview.tsx      # 6. 결과 미리보기
    └── styles/
        ├── fonts.css          # 폰트 imports
        └── theme.css          # 컬러 토큰 정의
```

## 6단계 워크플로우

1. **기본 정보** - 회사 정보, 모델 정보, 평가 유형(binary/multiclass/multilabel) 선택
2. **시험항목** - TC(Test Case) 선택, TC5 선택 시 β값 입력
3. **데이터 업로드** - CSV/JSON 파일 업로드
4. **컬럼 매핑** - AI 자동 매핑 검토, positive_class 및 threshold 설정(조건부)
5. **데이터 검증** - 최종 검증 및 전체 설정 요약
6. **결과 미리보기** - 메트릭 대시보드, 혼동 행렬, 클래스별 분석

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
- **Mono**: JetBrains Mono (숫자, 코드, TC ID)
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

### Selectable Card (TC Selection)
- 체크박스 + TC ID(mono) + 메트릭명 + 설명
- 그리드: xl=4열, lg=3열, md=2열, sm=1열
- TC5 선택 시 하단에 β값 입력 카드 표시
- 요구사항 Badge: "score 필요", "prob 필요", "β값 필요"

### Metric Block
- 대형 메트릭 표시 (Step 6)
- 상단 라벨(mono uppercase) + 값(2rem mono) + 보조 텍스트
- 수직 divider로 구분된 단일 카드

### Data Table
- shadcn Table 사용
- 헤더: bg-muted/40, uppercase mono
- 숫자 컬럼: 우측 정렬 + tabular-nums
- 행 hover: bg-muted/50

## 기술 스택

- **Framework**: React 18.3.1
- **Build**: Vite 6.3.5
- **Styling**: Tailwind CSS v4.1.12
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: lucide-react
- **Package Manager**: pnpm

## 개발

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행 (자동으로 실행 중)
# localhost 접근 불가 - preview surface 사용

# 빌드 (사용하지 않음 - Figma Make 환경)
# pnpm build
```

## 중요 규칙

### 컴포넌트 사용

- ✅ shadcn/ui 컴포넌트 우선 사용
- ✅ Card로 모든 그룹핑
- ✅ 모든 숫자에 font-mono + tabular-nums
- ❌ 그라디언트, 그림자, 장식 아이콘 금지
- ❌ 8px 이상의 border-radius 금지

### 데이터 처리

- **SPEC.md 참조**: TC별 필수 컬럼, 검증 규칙
- Binary: positive_class 필수, score 사용 시 threshold 필요
- Multiclass: argmax 기본, prob_class_* 컬럼 수 = 클래스 수
- Multilabel: 레이블별 독립 threshold

### 검증 규칙

- y_true 필수
- y_pred 또는 확률 컬럼(score/prob_class_*/prob_label_*) 중 하나 필수
- ID 중복 금지
- 확률값 0~1 범위
- Multiclass prob 합 ≈ 1

## 라이선스

© 2026 서울과학기술대학교
