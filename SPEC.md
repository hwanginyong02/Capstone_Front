# 지표별 컬럼 요구사항 스펙 (SPEC.md)

본 문서는 **KS X ISO/IEC TS 4213:2022**의 각 메트릭 정의(6.2~6.5절)를 기반으로, 
각 지표(Metric) 계산에 필요한 컬럼과 UI 입력값을 정리한 단일 진실 문서입니다.

프론트엔드와 백엔드 모두 이 문서를 기준으로 구현합니다.

**최종 갱신 2026-09-07** — 확률·점수 전면 지원(결정 1)과 "SPEC↔코드 충돌은 현재 동작을
정본으로 SPEC 을 정정한다"(결정 3)를 반영했다. 갱신된 절: §0(확률 역할·`decision_threshold`),
§1~§3(확률 대안 경로), §4(엔드포인트별 분리·등급 정정·미구현 항목 삭제), §5(예시),
§6(단계 번호를 앱 라우트에 맞춤).

---

## 0. 표준 컬럼 역할 (Canonical Roles)

기업마다 컬럼명이 다양하므로, 우리 시스템은 LLM으로 자동 매핑한 뒤 사용자 확인을 받아 
모든 컬럼을 아래 **표준 역할** 중 하나로 통일합니다.

| 역할 | 필수/선택 | 값 형식 | 설명 |
|------|----------|---------|------|
| `id` | 선택 (권장) | string, **unique** | 샘플 고유 식별자. 중복 검사에만 쓰이며 지표 계산에는 쓰이지 않는다. **없으면 그대로 진행한다**(행 번호 자동 생성은 하지 않는다) |
| `y_true` | **필수 (모든 경우)** | binary: `0`/`1`, multiclass: 클래스명, multilabel: `"A\|B"` 문자열 또는 배열 | 실제 정답 레이블 |
| `y_pred` | 조건부 필수 | y_true와 동일 형식 | 모델의 하드 예측 레이블 |
| `score` | 조건부 필수 | float [0,1] | **Binary 전용** 양성 클래스 확률 (M9·M10·M19) |
| `prob_class_*` | 조건부 필수 | float [0,1], 클래스마다 1컬럼 | **Multiclass 전용** 클래스별 확률 |
| `prob_label_*` | 조건부 필수 | float [0,1], 레이블마다 1컬럼 | **Multilabel 전용** 레이블별 점수 |
| `latency` | 선택 | 숫자 (ms) | 추론 지연시간. 모든 task 공통, 지표 계산에는 미사용(지연시간 통계 전용) |
| `ignore` | 선택 | any | 평가에 사용하지 않는 컬럼 (메모, 노이즈 등) |

> **확률 컬럼은 세 task 모두에서 정식 입력입니다**(2026-09-07 결정).
> 하드 예측(`y_pred`)이 없으면 확률에서 예측을 **파생**합니다 — binary 는 결정 임계값,
> multiclass 는 argmax, multilabel 은 레이블별 임계값. 둘 다 있으면 `y_pred` 를 우선합니다.
>
> **확률 컬럼과 클래스·레이블의 대응은 컬럼명으로 확정합니다** — `prob_<클래스명>` /
> `score_<레이블명>` (허용 접두어: `prob_`, `probability_`, `score_`, `p_`).
> 컬럼 **순서**로 추측하지 않습니다. 정렬 순서가 컬럼 순서와 같다는 보장이 없고, 잘못
> 짝지으면 전 행의 예측이 뒤바뀐 채 겉보기 정상인 성적서가 나오기 때문입니다.
> 이름으로 확정할 수 없으면 400 으로 거절합니다.

### UI 입력값 (컬럼이 아닌 사용자 입력)

| 입력명 | 타입 | 필수 조건 | 기본값 |
|-------|------|----------|--------|
| `task_type` | `binary` / `multiclass` / `multilabel` | 항상 필수 | — |
| `positive_class` | y_true 고유값 중 하나 | **Binary에서만** 필수 | 숫자면 `1`, 문자면 알파벳 후순위 |
| `beta` | float > 0 | **M5 Fβ Score 선택 시** 필수 | `1.0` |
| `decision_threshold` | float [0,1] *또는* {컬럼명: float} | 하드 예측 없이 확률만 제출할 때 (binary·multilabel) | `0.5` |

> **이름이 `threshold` 가 아니라 `decision_threshold` 인 이유** — 프론트에 이미
> `threshold`(성적서의 **합격 목표값**)가 있어 같은 이름을 쓰면 두 개념이 섞입니다.
> 스칼라를 주면 전 확률 컬럼 공통, 객체를 주면 컬럼명별 값입니다(multilabel 레이블별 임계값).
> multiclass 는 argmax 라 사용하지 않으며, 보내면 경고를 남기고 무시합니다.
>
> **argmax·threshold 로 만든 예측은 모델의 실제 출력이 아니라 파생값**이므로,
> 성적서 6절 '성능 평가 산출 기준'에 파생 사실·사용한 임계값·출처 컬럼을 기재합니다.
> 백엔드는 `results.success_metrics.derived_prediction` 으로 이 사실을 내려보냅니다.
> 예측을 실제로 쓰는 지표를 하나도 고르지 않았다면(M23 만 선택) 파생하지 않습니다.

---

## 1. Binary Classification metrics

허용 지표: M1~M10, M19, M20, M21~M23

| 지표 | 메트릭 | 필수 컬럼 | 선택 컬럼 | UI 입력 | 비고 |
|----|--------|-----------|-----------|---------|------|
| M1 | Accuracy | `y_true`, `y_pred` *또는* `score`+decision_threshold | — | decision_threshold (score만 있을 때) | 4213 6.3.3 |
| M2 | Precision | `y_true`, `y_pred` *또는* `score`+decision_threshold | — | **positive_class**, decision_threshold | 4213 3.2.9 |
| M3 | Recall | `y_true`, `y_pred` *또는* `score`+decision_threshold | — | **positive_class**, decision_threshold | 4213 3.2.10 |
| M4 | F1 Score | `y_true`, `y_pred` *또는* `score`+decision_threshold | — | **positive_class**, decision_threshold | 4213 3.2.8 |
| M5 | Fβ Score | `y_true`, `y_pred` *또는* `score`+decision_threshold | — | **positive_class**, decision_threshold, **beta** | 4213 6.2.6 |
| M6 | KL Divergence | `y_true`, `y_pred` | — | — | 4213 6.3.5 (카운트 기반) |
| M7 | Specificity | `y_true`, `y_pred` *또는* `score`+decision_threshold | — | **positive_class**, decision_threshold | 4213 3.2.11 |
| M8 | FPR | `y_true`, `y_pred` *또는* `score`+decision_threshold | — | **positive_class**, decision_threshold | 4213 3.2.12 |
| M9 | AUROC | `y_true`, **`score`** | — | **positive_class** | 4213 6.3.6. **score 필수** |
| M10 | AUPRC | `y_true`, **`score`** | — | **positive_class** | 4213 6.3.7. **score 필수** |
| M19 | Log Loss | `y_true`, **`score`** | — | — | **score 필수** |
| M20 | MCC | `y_true`, `y_pred` *또는* `score`+decision_threshold | — | decision_threshold | — |
| M21 | Confusion Matrix | `y_true`, `y_pred` *또는* `score`+decision_threshold | — | decision_threshold | 4213 6.3.2 |
| M22 | Class별 Metric | `y_true`, `y_pred` *또는* `score`+decision_threshold | `score` | **positive_class**, decision_threshold | — |
| M23 | Imbalance Ratio | `y_true` | `y_pred`, `score` | — | 카운트만 필요 |

### 핵심 규칙 (Binary)

1. **`y_pred` 또는 `score` 중 하나는 반드시 있어야 함** (둘 다 있으면 y_pred 우선 사용) — 단, 선택한 지표가 모두 예측을 쓰지 않으면(M23만 선택) 면제
2. **`score`만 있으면** UI에서 `decision_threshold`(기본 0.5)를 받아 예측을 파생한다:
   `y_pred = positive_class if score ≥ decision_threshold else negative_class`.
   파생값은 **모델의 실제 출력이 아니므로** 성적서 6절에 파생 사실과 임계값을 기재한다.
3. **M9, M10, M19는 score가 반드시 필요** — y_pred만으로는 계산 불가 (임곗값별 계산이 필요)
4. **positive_class는 대부분의 지표에서 필요** — 어느 클래스를 "양성"으로 볼지 결정

---

## 2. Multiclass Classification metrics

허용 지표: M1~M6, M11~M14, M21~M23

| 지표 | 메트릭 | 필수 컬럼 | 선택 컬럼 | UI 입력 | 비고 |
|----|--------|-----------|-----------|---------|------|
| M1 | Accuracy | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | 4213 6.4.2. prob만 있으면 argmax |
| M2 | Precision (Macro/Micro/Weighted 중 기본: Macro) | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | — |
| M3 | Recall | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | — |
| M4 | F1 Score | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | — |
| M5 | Fβ Score | `y_true`, `y_pred` *또는* `prob_class_*` | — | **beta** | — |
| M6 | KL Divergence | `y_true`, `y_pred` | `prob_class_*` | — | 4213 6.3.5 (카운트 기반) |
| M11 | Macro Average | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | 4213 6.4.3 |
| M12 | Micro Average | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | 4213 6.4.3 |
| M13 | Weighted Average | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | 4213 6.4.3 |
| M14 | Distribution Diff (MC) | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | 4213 6.4.4 |
| M21 | Confusion Matrix | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | — |
| M22 | Class별 Metric | `y_true`, `y_pred` *또는* `prob_class_*` | — | — | — |
| M23 | Imbalance Ratio | `y_true` | `y_pred`, `prob_class_*` | — | — |

### 핵심 규칙 (Multiclass)

1. **`y_pred` 또는 `prob_class_*` 중 하나는 필수** — 단, 선택한 지표가 모두 예측을 쓰지 않으면(M23만 선택) 면제
2. **`prob_class_*`만 있으면 argmax로 y_pred 를 파생** — 임계값 불필요(다중 클래스는 기본 argmax).
   컬럼↔클래스 대응은 **컬럼명으로** 확정한다(§0). 이름으로 확정할 수 없으면 400 으로 거절한다.
3. **M6 KL Divergence는 y_pred 기반** — 정답/예측 레이블의 클래스 빈도 분포를 비교하며 확률 컬럼은 사용하지 않는다
4. **positive_class 불필요** — 모든 클래스를 순환하며 "해당 클래스 vs 나머지"로 계산
5. `prob_class_*` 컬럼 수는 감지된 클래스 수와 같은 것이 정상이지만, **이 개수 검사는
   구현되어 있지 않다.** 대신 argmax 파생 시 컬럼명으로 클래스를 확정하지 못하면 거절한다.

---

## 3. Multilabel Classification metrics

허용 지표: M1~M5, M15~M18, M21~M23

| 지표 | 메트릭 | 필수 컬럼 | 선택 컬럼 | UI 입력 | 비고 |
|----|--------|-----------|-----------|---------|------|
| M1 | Accuracy (subset) | `y_true`, `y_pred` *또는* `prob_label_*`+decision_threshold | — | decision_threshold(레이블별) | subset accuracy = exact match |
| M2 | Precision (**Macro 평균**) | `y_true`, `y_pred` *또는* `prob_label_*`+decision_threshold | — | decision_threshold(레이블별) | — |
| M3 | Recall (**Macro 평균**) | `y_true`, `y_pred` *또는* `prob_label_*`+decision_threshold | — | decision_threshold(레이블별) | — |
| M4 | F1 Score (**Macro 평균**) | `y_true`, `y_pred` *또는* `prob_label_*`+decision_threshold | — | decision_threshold(레이블별) | — |
| M5 | Fβ Score (**Macro 평균**) | `y_true`, `y_pred` *또는* `prob_label_*`+decision_threshold | — | decision_threshold(레이블별), **beta** | — |
| M15 | Hamming Loss | `y_true`, `y_pred` *또는* `prob_label_*`+decision_threshold | — | decision_threshold(레이블별) | 4213 6.5.2 |
| M16 | Exact Match Ratio | `y_true`, `y_pred` *또는* `prob_label_*`+decision_threshold | — | decision_threshold(레이블별) | 4213 6.5.3 |
| M17 | Jaccard Index (**샘플 평균**) | `y_true`, `y_pred` *또는* `prob_label_*`+decision_threshold | — | decision_threshold(레이블별) | 4213 6.5.4 · 빈 레이블 행(0/0)은 일치로 셈 |
| M18 | Distribution Diff (ML) | `y_true`, `y_pred` | `prob_label_*` | — | 4213 6.5.5 (레이블 빈도 벡터의 코사인 거리) |
| M21 | Confusion Matrix (label-wise) | `y_true`, `y_pred` *또는* `prob_label_*`+decision_threshold | — | decision_threshold(레이블별) | 각 레이블별 2x2 |
| M22 | Class별 Metric | `y_true`, `y_pred` *또는* `prob_label_*`+decision_threshold | — | decision_threshold(레이블별) | — |
| M23 | Imbalance Ratio | `y_true` | `y_pred`, `prob_label_*` | — | — |

### 핵심 규칙 (Multilabel)

1. **`y_pred` 또는 `prob_label_*` 중 하나는 필수** — 단, 선택한 지표가 모두 예측을 쓰지 않으면(M23만 선택) 면제
2. **`prob_label_*`만 있으면 각 레이블 독립 판정** — `label_i ∈ y_pred ⟺ prob_label_i ≥ decision_threshold[i]`.
   컬럼↔레이블 대응은 **컬럼명으로** 확정한다(§0).
3. **`decision_threshold` 는 레이블마다 다를 수 있다**(객체로 전달, 키는 확률 컬럼명).
   각 레이블 합이 1이 아니므로 argmax 를 쓸 수 없다. 생략하면 전 레이블 0.5.
4. **레이블 배열/파이프 구분 표기 통일**: 입력 파서에서 `"A|B|C"`, `["A","B","C"]` 둘 다 받아 내부는 배열로 정규화
5. **M2~M5의 평균 방식은 Macro(레이블별 값의 단순평균)다** — 2026-09-05 결정.
   종전 이 표는 "sample 평균"이라고 적었으나 구현은 macro였다(ISSUES.md A-08).
   구현이 아니라 이 문서를 정정하는 방향으로 결정한 근거는 **성적서의 자체 검산 가능성**이다.
   성적서는 M22(클래스별 지표)를 레이블별 표로 인쇄하고 M2~M5를 헤드라인 수치로 인쇄하는데,
   macro일 때만 **독자가 인쇄된 표를 평균해 헤드라인을 재계산할 수 있다.**
   sample 평균은 인쇄되는 어떤 값으로도 유도되지 않아, 재계산하면 불일치가 난다.
   - 대조: **M17(Jaccard)만 샘플 평균**이다. Jaccard는 본래 샘플 단위로 정의되는 지표라
     레이블 단위 평균이 성립하지 않는다. 두 지표의 기준이 다른 것은 의도된 것이다.
   - 이 규약은 `Capstone_Back/tests/test_metric_values.py`가 기대값으로 고정한다
     (macro 4/9 vs samples 0.625를 명시적으로 구분).

---

## 4. Validation 로직 — 어느 엔드포인트가 무엇을 검사하는가

검증은 **두 엔드포인트로 나뉜다.** 종전 이 절은 전부 `/api/confirm-mapping` 이 한다고
적었으나, 그 요청은 DataFrame 도 `positive_class` 도 받지 않아 데이터 내용 검사가
**구조적으로 불가능**하다. 실제 배치는 아래와 같다(2026-09-07 실측으로 정정).

### 4-1. `/api/confirm-mapping` — 매핑 자체만 본다 (데이터 없이)

**Error (진행 차단)**

| 검사 | 코드 | 비고 |
|------|------|------|
| `task_type` 에 허용되지 않는 역할이 매핑됨 | `INVALID_ROLE_FOR_TASK` | 예: Binary 인데 `prob_class_*`, Multiclass 인데 `score`, Multilabel 인데 `score`/`prob_class_*`. 기준은 `VALID_ROLES_BY_TASK` 하나다 |
| 단일 역할이 2개 이상 컬럼에 매핑됨 | `DUPLICATE_ROLE` | 확률 역할과 `ignore` 는 다중 매핑이 정상이라 제외 |
| 한 컬럼이 정답·예측 양쪽에 매핑됨 | `SAME_COLUMN_TRUE_PRED` | 모든 지표가 가짜 100% 가 된다 |
| 한 컬럼이 서로 다른 역할 2개에 매핑됨 | `COLUMN_MULTIPLE_ROLES` | |
| 정답 역할(`y_true`/`true_labels`) 미매핑 | `MISSING_REQUIRED` | 어떤 지표를 고르든 필수 |
| 예측도 확률도 없음 | `MISSING_PRED_OR_SCORE` / `MISSING_REQUIRED` | 선택 지표가 전부 예측을 쓰지 않으면(M23 만) 면제 |
| 선택한 지표의 요구 역할이 매핑되지 않음 | `MISSING_METRIC_REQUIREMENT` | 예측 역할은 확률 역할로도 충족된다 |

**Warning (진행 가능)**

| 검사 | 코드 |
|------|------|
| Binary 에 `score` 없음 → M9·M10·M19 계산 불가 | `MISSING_SCORE_POSITIVE` |
| 하드 예측 없음 → 확률에서 파생함을 안내 | `MISSING_Y_PRED` / `MISSING_PRED_LABELS` |

> **`id` 는 어떤 지표의 요구 컬럼도 아니다.** 매핑하지 않아도 진행할 수 있다(§0).

### 4-2. `/api/validate-data` — 데이터 내용을 본다

응답은 항상 200 이고 `error_count` / `warning_count` 로 보고한다. 프론트 게이트가
`error_count` 를 보고 다음 단계를 막는다.

| 검사 | 등급 | 비고 |
|------|------|------|
| `task_type` 에 맞지 않는 역할 | Error | 4-1 과 같은 검사의 백스톱 |
| 데이터 행 0개 | Error | |
| 매핑된 컬럼이 파일에 없음 | Error | |
| 결측치(NaN) 존재 | Warning | 해당 행을 평가에서 제외 |
| `id` 중복 | **Warning** | 행을 제외하지는 **않는다**(§6 참조) |
| 예측에만 있는 미지 클래스 | Warning | `y_true` 기준 클래스 집합의 오분류로 센다 |
| 확률·점수 값이 [0,1] 이탈 | **Error** | 평가 전체 중단. 세 task 모두 검사한다 |
| Multiclass 확률합이 1 ± 0.01 이탈 | Warning | |
| Multiclass argmax 와 `y_pred` 불일치 | Warning | 컬럼명으로 클래스를 확정할 수 있을 때만 검사 |
| Binary 인데 `y_true` 클래스가 2개가 아님 | Error(3개↑) / Warning(1개) | |
| Multilabel 라벨 형식 오류 | Warning | 앞 100행 표본 |
| `latency` 비숫자·음수 | Warning | 지연시간 통계에서만 제외 |

> **종전 이 절과 달라진 점**(현재 동작을 정본으로 삼아 문서를 정정 — 2026-09-07 결정 3)
> - `id` 중복은 Error 가 아니라 **Warning** 이고 null 검사는 없다. 흔한 엑셀 내보내기
>   파일이 거절되지 않도록 관대하게 유지한다.
> - 확률 [0,1] 이탈은 Warning 이 아니라 **Error** 다(구현이 더 엄격한 쪽이었다).
> - "`prob_class_*` 컬럼 수 ≠ 클래스 수"와 "샘플 수 < 100" 은 **구현되어 있지 않다.**
>   지키지 않는 약속을 문서에 남기지 않기 위해 목록에서 뺐다.
> - "Binary + `score` + `positive_class` 미설정 → Warning" 은 백엔드에서 구조적으로
>   불가능하다(요청에 `positive_class` 가 없다). 대신 **프론트가 양성 클래스 미지정을
>   진행 차단 사유로 강제**한다.
> - 미지 클래스는 공통 검사(`Class mismatch`)와 multiclass 검사(`Unknown class detected`)
>   **두 곳에서 보고된다.** 중복이지만 각각 다른 그룹에 인쇄되므로 그대로 둔다.

## 5. "계산 가능한 지표" 동적 결정 로직

사용자가 매핑을 확정하면 시스템은 **현재 매핑으로 계산 가능한 지표**를 자동 판단합니다.

```
task_type + 매핑된 컬럼 조합 → 계산 가능한 지표 집합
```

### 예시 (Binary)

| 매핑된 컬럼 | 계산 가능한 지표 |
|------------|---------------|
| `y_true`, `y_pred` | M1, M2, M3, M4, M5, M6, M7, M8, M20, M21, M22, M23 |
| `y_true`, `score` (+ decision_threshold) | **전체 가능** — 확률에서 예측을 파생한다 |
| `y_true`, `y_pred`, `score` | **전체 M1~M10, M19~M23 모두 가능** |
| `y_true`만 | M23만 (분포 분석만 가능) — M23만 선택했다면 예측 컬럼 없이 진행 가능 |

### 예시 (Multiclass)

| 매핑된 컬럼 | 계산 가능한 지표 |
|------------|---------------|
| `y_true`, `y_pred` | M1~M6, M11~M14, M21, M22, M23 |
| `y_true`, `prob_class_*` | **전체 가능** — argmax 로 예측을 파생한다 |
| `y_true`, `y_pred`, `prob_class_*` | **전체 가능** |

### 예시 (Multilabel)

| 매핑된 컬럼 | 계산 가능한 지표 |
|------------|---------------|
| `y_true`, `y_pred` | M1~M5, M15~M18, M21, M22, M23 |
| `y_true`, `prob_label_*` (+ decision_threshold) | **전체 가능** — 레이블별 임계값으로 예측을 파생한다 |

### UI에서 이 로직을 어떻게 보여주는가

- **Step 2 시험항목 선택 시점**: 아직 데이터 매핑 전이므로 `task_type`만으로 필터링 (기존 유지)
- **Step 4 컬럼 매핑 확정 시점**: 매핑 결과를 기반으로 "계산 불가 지표" 경고 표시
  - 예: 사용자가 Step 2에서 M9(AUROC)를 선택했는데 Step 4에서 score 컬럼이 매핑되지 않았다면
    → Alert: "M9 AUROC는 score 컬럼이 필요합니다. score 컬럼을 매핑하거나 M9 선택을 해제하세요."
  - 행동 유도: [지표 선택으로 돌아가기] 버튼 + [자동 해제하고 계속] 버튼

---

## 6. UI에 반영할 변경점 요약

이 스펙을 반영하여 디자인에 추가/수정해야 할 사항. **단계 번호는 실제 앱 라우트 기준이다**
(종전 이 절은 SPEC 자체 번호를 써서 앱과 한 칸 어긋나 있었다 — ISSUES.md H-12).

### 2단계 — 시험항목 선택 (`/app/metrics`)
- 각 지표 카드 우측 하단에 작은 **요구사항 Badge**:
  - "score 필요" (M9, M10, M19)
  - "β값 필요" (M5, 기존 유지)
- 카드 hover 시 Tooltip: "필수 컬럼: y_true, score"

### 5단계 — 컬럼 매핑 (`/app/column-mapping`)
- **Binary일 때만**: positive_class 선택 카드 (이미 제안함)
- **하드 예측 없이 확률만 매핑한 경우**: `decision_threshold` 입력 카드(기본 0.5). ✅ 구현됨
  - multilabel 은 확률 컬럼마다 입력을 준다. multiclass 는 argmax 라 카드를 띄우지 않는다.
  - 하드 예측이 있으면 카드를 띄우지 않는다 — 그때 임계값은 쓰이지 않기 때문이다.
- **매핑 요약 카드**에 "계산 가능한 지표: N/M" 표시 — **미구현**(A-12)
- **Step 2에서 선택한 지표 중 계산 불가한 것이 있으면** 하단에 Alert 경고

### 6단계 — 데이터 검증 (`/app/data-validation`)
- "평가 설정 요약"에 decision_threshold, positive_class, beta 모두 표시 — **미구현**
- "검증 실패" 시 구체적으로 어떤 지표가 영향받는지 표시
  - 예: "prob_class_* 합이 1이 아닙니다 → 확률 컬럼의 신뢰도가 낮을 수 있습니다"

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
