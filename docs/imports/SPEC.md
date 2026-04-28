# TC별 컬럼 요구사항 스펙 (SPEC.md)

본 문서는 **KS X ISO/IEC TS 4213:2022**의 각 메트릭 정의(6.2~6.5절)를 기반으로, 
각 TC(Test Case) 계산에 필요한 컬럼과 UI 입력값을 정리한 단일 진실 문서입니다.

프론트엔드와 백엔드 모두 이 문서를 기준으로 구현합니다.

---

## 0. 표준 컬럼 역할 (Canonical Roles)

기업마다 컬럼명이 다양하므로, 우리 시스템은 LLM으로 자동 매핑한 뒤 사용자 확인을 받아 
모든 컬럼을 아래 **표준 역할** 중 하나로 통일합니다.

| 역할 | 필수/선택 | 값 형식 | 설명 |
|------|----------|---------|------|
| `id` | 선택 (권장) | string, **unique** | 샘플 고유 식별자. 없으면 행 번호로 자동 생성 |
| `y_true` | **필수 (모든 경우)** | binary: `0`/`1`, multiclass: 클래스명, multilabel: `"A\|B"` 문자열 또는 배열 | 실제 정답 레이블 |
| `y_pred` | 조건부 필수 | y_true와 동일 형식 | 모델의 하드 예측 레이블 |
| `score` | 조건부 필수 | float [0,1] | **Binary 전용** 양성 클래스 확률 |
| `prob_class_*` | 조건부 필수 | float [0,1], 각 행의 합 ≈ 1 | **Multiclass 전용** 클래스별 확률 (클래스마다 한 컬럼) |
| `prob_label_*` | 조건부 필수 | float [0,1], 각 레이블 독립 | **Multilabel 전용** 레이블별 확률 |
| `ignore` | 선택 | any | 평가에 사용하지 않는 컬럼 (메모, 노이즈 등) |

### UI 입력값 (컬럼이 아닌 사용자 입력)

| 입력명 | 타입 | 필수 조건 | 기본값 |
|-------|------|----------|--------|
| `task_type` | `binary` / `multiclass` / `multilabel` | 항상 필수 | — |
| `positive_class` | y_true 고유값 중 하나 | **Binary에서만** 필수 | 숫자면 `1`, 문자면 알파벳 후순위 |
| `threshold` | float [0,1] | **Binary에 score만 있고 y_pred 없을 때** 필수 | `0.5` |
| `threshold_per_label` | float [0,1] | **Multilabel에 prob_label만 있고 y_pred 없을 때** 필수 | `0.5` |
| `beta` | float > 0 | **TC5 Fβ Score 선택 시** 필수 | `1.0` |

---

## 1. Binary Classification TCs

허용 TC: TC1~TC10, TC19, TC20, TC21~TC23

| TC | 메트릭 | 필수 컬럼 | 선택 컬럼 | UI 입력 | 비고 |
|----|--------|-----------|-----------|---------|------|
| TC1 | Accuracy | `y_true`, `y_pred` *또는* `score`+threshold | — | threshold (score만 있을 때) | 4213 6.3.3 |
| TC2 | Precision | `y_true`, `y_pred` *또는* `score`+threshold | — | **positive_class**, threshold | 4213 3.2.9 |
| TC3 | Recall | `y_true`, `y_pred` *또는* `score`+threshold | — | **positive_class**, threshold | 4213 3.2.10 |
| TC4 | F1 Score | `y_true`, `y_pred` *또는* `score`+threshold | — | **positive_class**, threshold | 4213 3.2.8 |
| TC5 | Fβ Score | `y_true`, `y_pred` *또는* `score`+threshold | — | **positive_class**, threshold, **beta** | 4213 6.2.6 |
| TC6 | KL Divergence | `y_true`, `y_pred` | — | — | 4213 6.3.5 (카운트 기반) |
| TC7 | Specificity | `y_true`, `y_pred` *또는* `score`+threshold | — | **positive_class**, threshold | 4213 3.2.11 |
| TC8 | FPR | `y_true`, `y_pred` *또는* `score`+threshold | — | **positive_class**, threshold | 4213 3.2.12 |
| TC9 | AUROC | `y_true`, **`score`** | — | **positive_class** | 4213 6.3.6. **score 필수** |
| TC10 | AUPRC | `y_true`, **`score`** | — | **positive_class** | 4213 6.3.7. **score 필수** |
| TC19 | Log Loss | `y_true`, **`score`** | — | — | **score 필수** |
| TC20 | MCC | `y_true`, `y_pred` *또는* `score`+threshold | — | threshold | — |
| TC21 | Confusion Matrix | `y_true`, `y_pred` *또는* `score`+threshold | — | threshold | 4213 6.3.2 |
| TC22 | Class별 Metric | `y_true`, `y_pred` *또는* `score`+threshold | `score` | **positive_class**, threshold | — |
| TC23 | Imbalance Ratio | `y_true` | `y_pred`, `score` | — | 카운트만 필요 |

### 핵심 규칙 (Binary)

1. **`y_pred` 또는 `score` 중 하나는 반드시 있어야 함** (둘 다 있으면 y_pred 우선 사용)
2. **`score`만 있으면** UI에서 `threshold`를 받아 y_pred를 계산: `y_pred = 1 if score ≥ threshold else 0`
3. **TC9, TC10, TC19는 score가 반드시 필요** — y_pred만으로는 계산 불가 (임곗값별 계산이 필요)
4. **positive_class는 대부분의 TC에서 필요** — 어느 클래스를 "양성"으로 볼지 결정

---

## 2. Multiclass Classification TCs

허용 TC: TC1~TC6, TC11~TC14, TC21~TC23

| TC | 메트릭 | 필수 컬럼 | 선택 컬럼 | UI 입력 | 비고 |
|----|--------|-----------|-----------|---------|------|
| TC1 | Accuracy | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | 4213 6.4.2. prob만 있으면 argmax |
| TC2 | Precision (Macro/Micro/Weighted 중 기본: Macro) | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | — |
| TC3 | Recall | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | — |
| TC4 | F1 Score | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | — |
| TC5 | Fβ Score | `y_true`, `y_pred` *또는* `prob_class_*` | — | **beta** | — |
| TC6 | KL Divergence | `y_true`, **`prob_class_*`** | `y_pred` | — | **prob 필수** |
| TC11 | Macro Average | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | 4213 6.4.3 |
| TC12 | Micro Average | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | 4213 6.4.3 |
| TC13 | Weighted Average | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | 4213 6.4.3 |
| TC14 | Distribution Diff (MC) | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | 4213 6.4.4 |
| TC21 | Confusion Matrix | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | — |
| TC22 | Class별 Metric | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | — |
| TC23 | Imbalance Ratio | `y_true` | `y_pred`, `prob_class_*` | — | — |

### 핵심 규칙 (Multiclass)

1. **`y_pred` 또는 `prob_class_*` 중 하나는 필수**
2. **`prob_class_*`만 있으면 argmax로 y_pred 자동 계산** — threshold 불필요 (다중 클래스는 기본 argmax)
3. **TC6 KL Divergence는 prob_class_* 필수** — 하드 레이블로는 계산 불가
4. **positive_class 불필요** — 모든 클래스를 순환하며 "해당 클래스 vs 나머지"로 계산
5. **`prob_class_*` 컬럼 수 = 감지된 클래스 수**여야 함 (검증 항목)

---

## 3. Multilabel Classification TCs

허용 TC: TC1~TC5, TC15~TC18, TC21~TC23

| TC | 메트릭 | 필수 컬럼 | 선택 컬럼 | UI 입력 | 비고 |
|----|--------|-----------|-----------|---------|------|
| TC1 | Accuracy (subset) | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label | subset accuracy = exact match |
| TC2 | Precision (sample 평균) | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label | — |
| TC3 | Recall (sample 평균) | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label | — |
| TC4 | F1 Score (sample 평균) | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label | — |
| TC5 | Fβ Score | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label, **beta** | — |
| TC15 | Hamming Loss | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label | 4213 6.5.2 |
| TC16 | Exact Match Ratio | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label | 4213 6.5.3 |
| TC17 | Jaccard Index | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label | 4213 6.5.4 |
| TC18 | Distribution Diff (ML) | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label | 4213 6.5.5 |
| TC21 | Confusion Matrix (label-wise) | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label | 각 레이블별 2x2 |
| TC22 | Class별 Metric | `y_true`, `y_pred` *또는* `prob_label_*`+threshold | — | threshold_per_label | — |
| TC23 | Imbalance Ratio | `y_true` | `y_pred`, `prob_label_*` | — | — |

### 핵심 규칙 (Multilabel)

1. **`y_pred` 또는 `prob_label_*` 중 하나는 필수**
2. **`prob_label_*`만 있으면 각 레이블 독립 판정** — `y_pred_label_i = 1 if prob_label_i ≥ threshold else 0`
3. **threshold는 필수** (y_pred가 이미 있지 않은 한) — 각 레이블 합이 1이 아니므로 argmax 불가
4. **레이블 배열/파이프 구분 표기 통일**: 입력 파서에서 `"A|B|C"`, `["A","B","C"]` 둘 다 받아 내부는 배열로 정규화

---

## 4. 컬럼 매핑 단계의 Validation 로직

Step 4 "컬럼 매핑 확인"에서 `[다음 단계]` 버튼을 누를 때 백엔드가 수행할 검증:

### Error (진행 차단)
- `y_true`가 매핑되지 않음
- `y_true`가 2개 이상 매핑됨
- `y_pred`가 2개 이상 매핑됨
- Binary인데 `prob_class_*`가 매핑됨 (역할 불일치)
- Multiclass인데 `score`가 매핑됨 (역할 불일치)
- Multilabel인데 `score` 또는 `prob_class_*`가 매핑됨
- `y_pred`도 없고 확률 컬럼(`score`/`prob_class_*`/`prob_label_*`)도 없음
- `id` 컬럼에 중복 또는 null 존재

### Warning (진행 가능하나 경고)
- Binary인데 `score`가 있고 `positive_class`가 설정 안 됨 → UI에서 선택 강제
- Multiclass인데 `prob_class_*` 컬럼 수 ≠ `y_true` 고유값 수
- 확률값이 [0,1] 범위 벗어남
- Multiclass `prob_class_*` 각 행 합이 1 ± 0.01 초과
- `y_pred`에 `y_true`에 없는 클래스 존재
- 샘플 수 < 100 (신뢰성 경고)

---

## 5. "계산 가능한 TC" 동적 결정 로직

사용자가 매핑을 확정하면 시스템은 **현재 매핑으로 계산 가능한 TC**를 자동 판단합니다.

```
task_type + 매핑된 컬럼 조합 → 계산 가능한 TC 집합
```

### 예시 (Binary)

| 매핑된 컬럼 | 계산 가능한 TC |
|------------|---------------|
| `y_true`, `y_pred` | TC1, TC2, TC3, TC4, TC5, TC6, TC7, TC8, TC20, TC21, TC22, TC23 |
| `y_true`, `score` (+ threshold UI) | 위 + TC9, TC10, TC19 |
| `y_true`, `y_pred`, `score` | **전체 TC1~TC10, TC19~TC23 모두 가능** |
| `y_true`만 | TC23만 (분포 분석만 가능) |

### 예시 (Multiclass)

| 매핑된 컬럼 | 계산 가능한 TC |
|------------|---------------|
| `y_true`, `y_pred` | TC1~TC5, TC11~TC14, TC21, TC22, TC23 |
| `y_true`, `prob_class_*` (argmax로 y_pred 계산) | 위 + TC6 |
| `y_true`, `y_pred`, `prob_class_*` | **전체 가능** |

### 예시 (Multilabel)

| 매핑된 컬럼 | 계산 가능한 TC |
|------------|---------------|
| `y_true`, `y_pred` | TC1~TC5, TC15~TC18, TC21, TC22, TC23 |
| `y_true`, `prob_label_*` (+ threshold UI) | 위 TC 전체 |

### UI에서 이 로직을 어떻게 보여주는가

- **Step 2 시험항목 선택 시점**: 아직 데이터 매핑 전이므로 `task_type`만으로 필터링 (기존 유지)
- **Step 4 컬럼 매핑 확정 시점**: 매핑 결과를 기반으로 "계산 불가 TC" 경고 표시
  - 예: 사용자가 Step 2에서 TC9(AUROC)를 선택했는데 Step 4에서 score 컬럼이 매핑되지 않았다면
    → Alert: "TC9 AUROC는 score 컬럼이 필요합니다. score 컬럼을 매핑하거나 TC9 선택을 해제하세요."
  - 행동 유도: [TC 선택으로 돌아가기] 버튼 + [자동 해제하고 계속] 버튼

---

## 6. UI에 반영할 변경점 요약

이 스펙을 반영하여 디자인에 추가/수정해야 할 사항:

### Step 2 (시험항목 선택)
- 각 TC 카드 우측 하단에 작은 **요구사항 Badge**:
  - "score 필요" (TC9, TC10, TC19)
  - "prob 필요" (TC6 multiclass)
  - "β값 필요" (TC5, 기존 유지)
- 카드 hover 시 Tooltip: "필수 컬럼: y_true, score"

### Step 4 (컬럼 매핑)
- **Binary일 때만**: positive_class 선택 카드 (이미 제안함)
- **Binary + score 매핑 시**: threshold 입력 카드 (기본 0.5)
- **Multilabel + prob_label_* 매핑 시**: threshold 입력 카드 (기본 0.5)
- **매핑 요약 카드**에 "계산 가능한 TC: N/M" 표시
- **Step 2에서 선택한 TC 중 계산 불가한 것이 있으면** 하단에 Alert 경고

### Step 5 (데이터 검증, 기존 Step 7)
- "평가 설정 요약"에 threshold, positive_class, beta 모두 표시
- "검증 실패" 시 구체적으로 어떤 TC가 영향받는지 표시
  - 예: "prob_class_* 합이 1이 아닙니다 → TC6 KL Divergence가 부정확할 수 있습니다"

---

## 7. 참고: 4213 문서 출처

| 섹션 | 내용 |
|------|------|
| 6.2 | 메트릭 계산 기본 요소 (정밀도, 재현율, F1, Fβ, KL) |
| 6.3 | 이진 분류 (혼동 행렬, Accuracy, ROC, AUPRC 등) |
| 6.4 | 다중 클래스 분류 (Macro/Micro/Weighted, 분포 차이) |
| 6.5 | 다중 레이블 분류 (Hamming, Exact Match, Jaccard, 분포 차이) |
| 부속서 A | 다중 클래스 성능 계산 예시 |
| 부속서 B | ROC 곡선 생성 예시 |
