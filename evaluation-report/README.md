# 시험성적서 (Evaluation Report) 컴포넌트

KS X ISO/IEC TS 4213:2023 기반 머신러닝 모델 성능 시험성적서 React 컴포넌트.

## 📁 파일 구조

```
src/
├── pages/
│   └── EvaluationReport.tsx              # 어셈블러 (state + layout, 58줄)
├── components/
│   └── evaluation-report/
│       ├── ReportHeader.tsx              # 표지·메타데이터
│       ├── OverviewSection.tsx           # §1 + Section 헬퍼 export
│       ├── DatasetSection.tsx            # §2 데이터셋 정보
│       ├── TestItemsSection.tsx          # §3 평가 지표·수식
│       ├── TestResultsSection.tsx        # §4 KPI + Confusion Matrix
│       ├── DiagnosticSection.tsx         # §5 Recharts + 진단 카드
│       ├── SummarySection.tsx            # §6 LLM 종합 소견
│       └── RecommendationSection.tsx     # §7 권고 사항
└── data/
    └── evaluationReportData.ts           # 모든 mock 데이터 + 타입
```

## 🚀 셋업

### 1. 의존성 설치

```bash
npm install recharts lucide-react
```

또는 새 프로젝트에 통합 시:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Vite 경로 별칭 설정

`vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

`tsconfig.json` (compilerOptions에 추가):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

### 3. Tailwind 설정

`tailwind.config.js`:

```javascript
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Geist', Arial, sans-serif;
  font-feature-settings: "liga" 1;
  background: #ffffff;
  color: #171717;
}

.font-mono {
  font-family: 'Geist Mono', ui-monospace, SFMono-Regular, monospace;
  font-feature-settings: "liga" 1, "tnum" 1;
}
```

### 4. Geist 폰트 로드

`index.html`의 `<head>`에 추가:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/style.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-mono/style.css" />
```

### 5. 페이지 사용

`src/App.tsx`:

```tsx
import { EvaluationReport } from '@/pages/EvaluationReport';

export default function App() {
  return <EvaluationReport />;
}
```

```bash
npm run dev
```

## 🎨 디자인 시스템 핵심 규칙

- **테두리**: 모든 테두리는 `box-shadow`로 처리 (이미지 프레임만 예외)
- **폰트 weight**: 400 / 500 / 600만 사용 (700 금지)
- **섹션 배경**: 모든 섹션 `#ffffff` (배경색 차이로 섹션 구분 금지)
- **그리드 gap**: 16px (`gap-4`) 또는 32px (`gap-8`)
- **카드 padding**: 24px (`p-6`) 또는 32px (`p-8`)
- **Radius**: 버튼 6px / 카드 8px / 이미지 12px / 뱃지 9999px
- **타이포**: Geist Sans + Geist Mono, 헤딩 negative letter-spacing

## 📊 Mock 데이터 도메인

대상: **뿌리업종 표면결함 분류 모델** (5-class CNN)

- 클래스: Scratch, Pitting, Inclusion, Crazing, Patches
- 데이터셋: 12,450 샘플 (Train 8,715 / Val 1,867 / Test 1,868)
- 모델: SurfaceDefectNet v2.3.1 (ResNet-50 + FPN, 25.6M params)
- 종합 정확도: 94.43% (PASS)
- 발급기관: TTA AI품질평가단

## 🔧 커스터마이징

데이터를 자체 도메인에 맞게 변경하려면 `src/data/evaluationReportData.ts`만 수정하면 됩니다. 컴포넌트는 props 기반으로 구성되어 있어 데이터 구조만 유지하면 그대로 작동합니다.
