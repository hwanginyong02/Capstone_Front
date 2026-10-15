# UI 설계 — 분류 유형 아이콘화 및 분리

> 브랜치 `feature/workflow-redesign` · 기준일 2026-09-19
>
> **범위**: 세 분류 유형(이진·다중 클래스·다중 레이블)을 **아이콘으로 구분되는 독립
> 진입점**으로 분리하는 화면 설계. 단계 구조·라우트·스토어는
> `docs/WORKFLOW_REDESIGN.md`, 색상·타이포 등 디자인 시스템은 `README.md`. *(MATERIAL_PICKER.md로 대체됨, §10 — 디자인 시스템의 정본은 MATERIAL_PICKER.md §10)*
>
> 문구의 언어(한/영)는 이번 범위 밖이다. 아래 문구는 **자리와 길이를 잡기 위한
> 임시안**이며 나중에 일괄 정리한다. *(MATERIAL_PICKER.md로 대체됨, §8 — 화면 문구는 한국어로 정리됐다)*

---

## 1. 무엇을 고치는가

세 유형은 **이미 내부적으로 완전히 다르게 처리된다.** `data/evaluationData.ts` 하나만
봐도 `task_type` 이 가르는 것이:

| 가르는 것 | 근거 |
|---|---|
| 노출 지표 | `getAvailableMetrics` — multilabel 은 M1·M11·M12·M13 이 아예 없다 |
| 요구 컬럼 | `REQUIRED_COLUMNS_BY_METRIC` — task 별로 표가 따로 있다 |
| 매핑 가능 역할 | `MAPPABLE_ROLES_BY_TASK` — `score` / `prob_class_*` / `prob_label_*` |
| 예측 파생 방식 | binary=임계값, multiclass=argmax, multilabel=레이블별 임계값 |
| 임계값 입력 형태 | 스칼라 vs 컬럼별 객체 |

백엔드도 `evaluation/metrics/{binary,multiclass,multilabel}.py` 로 파일이 갈려 있다.

**차이는 전부 구현돼 있다. 화면에만 없다.**

지금은 세 유형이 하나의 공용 화면 안에서 조건문으로만 갈린다. 사용자 눈에 보이는 건:

1. `basic-info` 세 번째 카드 맨 아래의 라디오 카드 3장 — **필수 입력 12개 중 마지막**
2. 그 뒤로는 **아무것도 없다** — `AppHeader` 는 "ML Evaluation" 고정 텍스트,
   `StepTabs` 는 숫자 1~7

앱 전체를 가르는 분기점이 폼 필드 하나와 같은 무게로 놓여 있고, 고르고 나면 사라진다.

**→ 이번 작업은 없는 기능을 만드는 게 아니라 이미 있는 차이를 드러내는 것이다.**

---

## 2. 아이콘 ★

이 문서의 핵심이다. **아이콘 자체가 세 유형의 차이를 설명해야 한다** — 텍스트 설명을
장식하는 그림이 아니다.

### 2.1 설계 원칙

셋이 **같은 도형(원)** 을 쓰고, **개수와 채움만** 다르게 한다. 그래야 나란히 놓았을 때
차이가 도형에서 바로 읽힌다.

| 유형 | 도형 | 읽히는 뜻 |
|---|---|---|
| 이진 | 원 2개 중 1개 채움 | 후보가 **둘**, 답은 **하나** |
| 다중 클래스 | 원 4개 중 1개 채움 | 후보가 **여럿**, 답은 **하나** |
| 다중 레이블 | 원 4개 중 3개 채움 | 후보가 **여럿**, 답도 **여럿** |

"채움 = 이 샘플에 배정된 것"이라는 규칙이 셋 모두에서 일관되게 성립한다.

### 2.2 마크업

`lucide-react` 에 다중 레이블을 뜻하는 아이콘은 없다. 인라인 SVG 로 직접 만든다.

```tsx
// components/task-type/TaskTypeIcon.tsx
const R = 7;
const FILL = { binary: [1], multiclass: [0], multilabel: [0, 1, 2] };
const POS = {
  binary:     [[12, 20], [28, 20]],                    // 가로 2개
  multiclass: [[12, 12], [28, 12], [12, 28], [28, 28]], // 2x2
  multilabel: [[12, 12], [28, 12], [12, 28], [28, 28]], // 2x2 (동일 격자)
};

export function TaskTypeIcon({ type, size = 40 }: { type: TaskType; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      {POS[type].map(([cx, cy], i) =>
        FILL[type].includes(i)
          ? <circle key={i} cx={cx} cy={cy} r={R} fill="currentColor" />
          : <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                    stroke="currentColor" strokeWidth="2" opacity="0.35" />
      )}
    </svg>
  );
}
```

- `currentColor` 만 쓴다 → 선택 시 부모의 `text-primary` 를 그대로 따라간다. 상태별
  색을 따로 관리하지 않는다
- multiclass 와 multilabel 이 **같은 2×2 격자**를 쓰는 게 중요하다. 격자가 다르면
  "채운 개수의 차이"가 아니라 "다른 그림"으로 읽힌다
- `aria-hidden` — 의미는 옆의 제목 텍스트가 전달한다. 스크린리더에 도형을 읽힐 이유가 없다

### 2.3 README "장식 아이콘 금지" 규칙과의 관계

충돌하지 않는다. 그 규칙이 막는 것은 **의미 없이 붙는 그림**이다. 여기 아이콘은
채운 개수가 곧 분류 규칙이라 **정보를 지닌 도형**이다. 이 문단을 근거로 남긴다.

---

## 3. 진입 화면 (`/app`)

```
┌───────────────────────────────────────────────────────────┐
│   (제목: 어떤 분류 모델을 평가하나)                            │
│   (부제: 선택에 따라 지표·필요 컬럼·검증 규칙이 달라진다)          │
│                                                           │
│   ┌───────────┐   ┌───────────┐   ┌───────────┐          │
│   │   ○ ●     │   │  ● ○      │   │  ● ●      │          │
│   │           │   │  ○ ○      │   │  ○ ●      │          │
│   │           │   │           │   │           │          │
│   │  이진 분류  │   │ 다중 클래스 │   │ 다중 레이블 │          │
│   │  (설명 1줄) │   │ (설명 1줄) │   │ (설명 1줄)  │          │
│   │           │   │           │   │           │          │
│   │  예: …     │   │  예: …     │   │  예: …     │          │
│   └───────────┘   └───────────┘   └───────────┘          │
└───────────────────────────────────────────────────────────┘
```

**레이아웃**
- 그리드 `md` 이상 3열 / 미만 1열 (README 반응형 규칙)
- 카드는 기존 `ClassifierCard`(`components/basic-info/BasicInfo.tsx`) 스타일 재사용 —
  선택 `border-primary` + `bg-blue-50`, 비선택 `border-border` + hover *(MATERIAL_PICKER.md로 대체됨, §10 — `bg-blue-50` 은 `bg-primary-subtle` 토큰으로 바뀌었다)*
- **아이콘은 카드 상단에 크게(40px)** 놓는다. 세 카드를 훑을 때 도형이 먼저 눈에 들어와야 한다

**동작**
- **카드 클릭 = 즉시 다음 화면.** 라디오 인디케이터를 넣지 않는다 — 선택 상태를 보여줄
  시간이 없고, 넣으면 "고르고 → 다음 버튼" 두 동작이 된다
- 하단 Action Bar 없음
- `StepTabs` 숨김 — 아직 워크플로우에 들어가기 전이다

**각 카드가 담는 3줄**
1. 유형 이름
2. 한 줄 설명 — 세 카드가 **같은 문장 골격**을 쓴다. 바뀌는 부분만 다르게 해서
   나란히 읽으면 차이가 드러나게 한다
3. 구체 예시 한 줄 — 추상 설명만으로는 다중 클래스/다중 레이블이 구분되지 않는다

> 실제 문구는 언어 정리 때 확정한다. 다만 **"세 줄, 같은 골격"** 이라는 구조는 *(MATERIAL_PICKER.md로 대체됨, §8 — 문구는 한국어로 확정했다)*
> 이번에 잡아둔다 — 현재 문구는 세 번째만 문장 구조가 달라서
> (`"Multiple labels can be assigned"` 만 수동태) 가장 헷갈리는 유형의 설명이
> 가장 안 읽힌다.

---

## 4. 유형 배지 — 고른 뒤에도 보이게

분리의 나머지 절반이다. 진입 화면만 만들고 끝내면 **고른 순간 다시 안 보인다.**

`layout/components/AppHeader.tsx` 로고 오른쪽:

```
[◧] ML Evaluation                     [◈ 다중 클래스]   [?]
    ISO/IEC 4213 based
```

- §2 아이콘을 **16px 로 축소해 재사용** — 진입 화면에서 고른 그 도형이 그대로 따라온다.
  이 재사용이 "내가 고른 것"과 "지금 하는 것"을 잇는다
- `components/ui/badge.tsx`, `variant="secondary"`
- 워크플로우 밖(`AppShell`·랜딩·워크스페이스)에서는 숨긴다
- **클릭 시 유형 변경 가능. 단 확인 대화를 띄운다** — `useWorkflowStore` 의 `setTaskType`
  은 2~5단계 입력을 **전부 리셋**한다(`selectedMetricIds`·`metricDetails`·
  `uploadedFile`·`columnMapping`·`completedSteps`…). 경고 없이 날리면 안 된다

---

## 5. 이번 범위에서 뺀 것

| 항목 | 왜 |
|---|---|
| 문구 언어 정리(한/영) | 구조 변경과 문자열 변경을 한 커밋에 섞으면 리뷰가 불가능해진다. 기존 테스트가 영문 문자열을 찾고 있어 같이 움직인다 *(MATERIAL_PICKER.md로 대체됨, §8 — 한국어로 바꾸고 테스트도 함께 고쳤다)* |
| 지표 설명 문구 재작성 | 위와 같은 이유. `evaluationData.ts` 문구 15개를 한 번에 *(MATERIAL_PICKER.md로 대체됨, §8 — 지표 부제·설명도 한국어로 바꿨다)* |
| 지표+목표값 화면 시각 설계 | 병합 자체는 `WORKFLOW_REDESIGN.md` §3.1 에 있다. 표 하나로 접는 것이라 별도 시각 설계가 필요 없다 |
| 컬럼 매핑 화면 | 이미 CSV 임포트 표준 패턴을 따른다. `WORKFLOW_REDESIGN.md` §4.2 |
| 결과/성적서 화면 | 이번 개편 대상이 아니다 |

---

## 6. 디자인 시스템 정합성 (README 대조)

| 규칙 | 이 설계 |
|---|---|
| shadcn/ui 우선 | `Card`·`Badge` 재사용 ✅ |
| Card 로 모든 그룹핑 | ✅ |
| 그라디언트·그림자 금지 | 사용 안 함 ✅ |
| 장식 아이콘 금지 | §2.3 참조 — 정보를 지닌 도형이라 해당 없음 |
| `border-radius` 8px 초과 금지 | `rounded-lg`(8px) ✅ |
| 숫자에 `font-mono`+`tabular-nums` | 이 화면에 숫자 없음 — 해당 없음 |

---

## 7. 작업 순서

```
1. TaskTypeIcon 컴포넌트 (§2.2)        ← 진입 화면과 배지가 함께 쓴다
2. 진입 화면 /app (§3)
3. AppHeader 배지 + 변경 확인 대화 (§4)
4. basic-info 에서 Classifier type 카드 제거
```

4번은 `WORKFLOW_REDESIGN.md` §1.2(회사 정보를 발급 시점으로)와 같은 파일을 건드린다.
그 작업을 함께 하거나, 최소한 **유형 선택만 먼저 떼어내고** 나머지 필드는 그대로 둔다.
