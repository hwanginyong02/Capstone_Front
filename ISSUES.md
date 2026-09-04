# 문제 대장 (ISSUES.md)

시스템 보완 작업 1단계 — **문제 파악** 산출물. 해결안은 이 문서에 적지 않는다(전체 그림을 본 뒤 별도 라운드에서 설계).

**작성일** 2026-08-12 (2026-08-12 LLM 지도 작성 중 2건 추가) · **총 97건**

---

## 1. 점검 방법

**8개 축**을 좌표계로 삼고, **4개 렌즈**(①SSoT 역추적 ②사용자 여정 워크스루 ③계약 경계 코드 정독 ④실행 검증)를 겹쳐 훑었다. 각 축의 발견은 **반증을 기본 태도로 하는 별도 검증**을 거쳤다(인용 줄번호 실물 확인, 상류 차단 여부 확인, 심각도 인플레이션 점검).

| 축 | 범위 | 상태 | 건수 |
|---|---|---|---|
| **A** 표준·SPEC 정합성 | SPEC.md ↔ 백엔드 ↔ 프론트 3자 대조 | ✅ | 14 |
| **B** 계약 정합성 | API 6개 스키마·role 어휘·응답 파싱 | ✅ | 4 |
| **C** 계산 정확성 | M1~M23 구현·엣지케이스·표시 공식 | ✅ | 9 |
| **D** 파이프라인 견고성 | 검증/평가 이중구현·파싱·자원 | ✅ | 17 |
| **E** 상태·흐름 | 워크플로우 상태·재진입·인쇄·에러 UX | ✅ | 18 |
| **F** 발급 무결성·감사추적 | 성적서 진위·재현성·채번·문서 완결성 | ✅ | 12 |
| **G** 보안·운영 | 인증·남용·자원·관측성·배포 | ✅ | 8 |
| **H** 테스트·문서 | 커버리지 공백·문서 stale | ✅ | 15 |

### 등급 정의

**심각도** — `Critical` 성적서 숫자/신뢰성이 훼손되거나 정상 사용자가 워크플로우를 끝낼 수 없음 · `High` 특정 조건에서 기능 실패 또는 **잘못된 값이 조용히 산출** · `Medium` 동작은 하나 스펙/UX와 어긋남 · `Low` 유지보수·일관성

**확신도** — `확인됨` 코드/실행으로 직접 확인 · `추정` 정황상 유력하나 재현 미완

### 기준 상태

백엔드 `pytest` **81 passed** · 프론트 `tsc --noEmit` 통과 · `vitest` **8 passed** · CI 녹색.
**자동 검사가 전부 통과하는 상태에서 아래 97건이 존재한다.** 이것이 이 대장의 핵심 사실이다.

### 심각도 분포

| | Critical | High | Medium | Low |
|---|---|---|---|---|
| 건수 | **5** | **22** | **47** | **23** |

---

## 2. 종합 진단 — 7개의 구조적 뿌리

개별 97건은 대부분 아래 7개 원인의 증상이다. 수정 라운드는 항목이 아니라 **뿌리 단위**로 묶어야 한다.

### ① SSoT가 이름뿐이다 — 규칙 사본이 4곳
`SPEC.md` / 백엔드 `METRIC_REQUIREMENTS` / 프론트 `REQUIRED_COLUMNS_BY_METRIC` / 프론트 `METRICS`. 여기에 죽은 5번째 사본(`getUploadColumnGuide`)까지 있다. **A-03**이 원인이고 **A-04~A-09, A-13, H-14**가 증상이다. 한 곳을 고쳐도 나머지가 남는다.
→ A-03, A-04, A-05, A-06, A-08, A-09, A-13, H-14

### ② 성적서가 서버에 존재하지 않는다
발급 DB에 남는 것은 번호·연도·순번·모델명·발급자·시각뿐이다. 지표값·판정·데이터셋 식별자·서술 어느 것도 저장되지 않는다. 성적서의 실체는 **브라우저 localStorage**에 있고, 최종 산출물 PDF는 그 localStorage를 클라이언트가 렌더해 `window.print()` 한 인쇄물이다. 평가와 발급은 서버에서 연결되지 않아 **평가 없이도 정식 번호가 발급**된다(실행 확인).
→ F-01, F-02, F-03, F-04, F-05, F-06, G-02

### ③ 경계에서 값을 조용히 삼킨다
프론트가 백엔드 응답을 `any`/옵셔널 체이닝으로 받아, 형태가 어긋나면 예외 대신 **0 / 빈 배열 / 무시**가 된다. 반대로 백엔드가 "사용자 안내용"으로 명시해 내려보내는 필드들(`column_notes`, `warnings`, `available_metric_ids`)은 프론트에 소비처가 없다. 잘못된 역할 지정도 에러가 아니라 `ignore`로 강등된다.
→ B-01, B-02, B-03, B-04, A-10, A-12, D-16, C-07

### ④ 같은 데이터를 두 번, 다른 규칙으로 판단한다
Step6 검증과 실제 평가 전처리가 별도 구현이라 결측 기준이 다르고, **성적서 6절에 인쇄되는 "유효 예측 행 수"가 실제 평가 표본 수와 다르다**. 게다가 Step6 표의 `handling` 문구(중복 ID 제거, 미지 클래스 행 제외)는 평가 쪽에 구현조차 없는 약속이다. 멀티레이블 파서는 3벌이고 구분자 처리가 서로 다르다.
→ D-01, D-02, D-03, D-04, D-09, D-10

### ⑤ 워크플로우 입력이 휘발성이다
`useWorkflowStore`는 persist가 없고 `rawFile`(File 객체)이 들어 있어 원리적으로 복원 불가다. 그런데 이를 보완하는 재개·경고·가드가 없어, 새로고침·탭 재진입·과거 run 재오픈이 전부 **"입력은 사라졌는데 화면은 멀쩡하고 다음 버튼은 활성"** 상태로 수렴한다.
→ E-01, E-03, E-04, E-08, E-09, E-13, E-16

### ⑥ 무인증 공개 API
인증·인가·레이트리밋·크기 상한이 전 계층에 한 줄도 없다. `curl` 한 줄로 발급 기관명을 바꾸면 **이미 발급된 모든 성적서의 기관 표기가 소급 변경**되고, 순차 채번된 번호(`RPT-2026-0001`)만 알면 남의 성적서에 강제 재발급 이력을 남길 수 있다(실행 확인). OpenAI 과금 엔드포인트 2개도 상한 없이 열려 있다.
→ G-01, G-02, G-03, G-04, G-09

### ⑦ 테스트가 숫자를 검증하지 않는다
백엔드 지표 테스트의 단정은 "float인가 / 0~1인가"뿐이고, 픽스처는 전부 **무작위 노이즈**(binary accuracy 0.505, corr(score, y_true)=0.02)라 공식이 틀려도 값이 그럴듯하다. golden 스냅샷은 오라클이 아니라 현행 출력의 복사본이어서 **A-08의 오류값이 기대값으로 승격**되어 있다. 프론트는 성적서 숫자를 실제로 만드는 1,100여 줄에 테스트가 0이다.
→ H-01, H-02, H-03, H-04

---

## 3. 최우선 5건 (Critical)

| ID | 문제 | 왜 최우선인가 |
|---|---|---|
| **B-01** | M22 선택 시 종합판정이 **절대 PASS가 될 수 없고** 통과율이 깎인다 | 추천 지표 세트에 M22가 있어 **기본 경로에서 발생**. 실측 재현 완료 |
| **F-01** | 발급 DB에 성적서 내용이 하나도 없다 | 진위 확인·재현·재오픈 복원이 **원리적으로 불가능** |
| **A-01** | `threshold`/`threshold_per_label`이 전 계층 미구현 | SPEC이 규정한 확률 기반 입력 경로가 통째로 없음 |
| **A-02** | 확률만 있는 데이터셋이 매핑 검증에서 차단됨 | 위와 결합해 **정상 사용자가 워크플로우를 끝낼 수 없는 경로**가 존재 |
| **H-01** | M1~M23 중 값 정확성이 검증되는 지표 **0개** | 위 문제들이 왜 배포까지 살아남았는지에 대한 답 |

---

# A축 — 표준·SPEC 정합성

> 대조: `Capstone_Front/SPEC.md` (SSoT) ↔ `Capstone_Back/app/` ↔ `Capstone_Front/src/`

**소견**: SPEC이 SSoT로 선언돼 있으나 지표→필수컬럼 규칙이 실제로는 4곳에 각각 하드코딩되어 있고 서로 다르다. 개별 불일치는 대부분 이 구조의 증상이다. 또한 SPEC이 규정한 확률 기반 입력 경로(threshold·argmax)가 전 계층 미구현이라, SPEC 문서의 상당 부분이 아직 설계도로만 존재한다.

### [A-01] `threshold` / `threshold_per_label` 이 전 계층 미구현 — Critical / 확인됨
- **증상**: SPEC이 필수 UI 입력으로 규정한 결정 임계값이 프론트·API 계약·백엔드 어디에도 없다.
- **근거**
  - SPEC §0 "UI 입력값" — `threshold`(binary에 score만 있을 때 **필수**), `threshold_per_label`(multilabel 동일)
  - SPEC §1 규칙 2 — "score만 있으면 threshold를 받아 `y_pred = 1 if score ≥ threshold else 0`" / SPEC §3 규칙 2·3
  - `Capstone_Back/app/evaluation/schemas.py:8` — `EvaluateRequest`에 필드 없음 · `Capstone_Back/app/core/schemas.py:133` `DataMetadata`에도 없음
  - `Capstone_Back/app/evaluation/preprocessor.py` — score→y_pred 파생 단계 없음
  - 프론트의 `threshold`는 **성적서 KPI 합격기준**이라는 다른 개념(`Capstone_Front/src/hooks/useReportData.ts:159`)
- **영향**: 하드 예측 없이 확률·점수만 제출하는 사용자는 평가를 완료할 수 없다. SPEC §5 가용성 예시표의 "score만 있는 경우" 시나리오 전체가 성립하지 않는다.
- **부수**: `threshold` 한 단어가 두 의미로 쓰여 향후 구현 시 용어 충돌.

### [A-02] 확률만 있는 데이터셋이 매핑 검증에서 구조적으로 차단됨 — Critical / 확인됨
- **근거**
  - `Capstone_Back/app/analysis/validator.py:30-43` — multiclass는 `y_pred`, multilabel은 `pred_labels`를 **무조건 필수**로 요구 (binary만 "둘 중 하나" 예외, `:176-183`)
  - SPEC §2 규칙 1·2 / §3 규칙 1·2 — "`y_pred` 또는 확률 컬럼 중 하나는 필수", "확률만 있으면 argmax로 자동 계산"
  - argmax 파생 부재: 코드베이스의 `argmax`는 `Capstone_Back/app/analysis/validation_checks.py:289`의 **불일치 경고용** 한 곳뿐
- **영향**: SPEC §5 예시표의 multiclass/multilabel 확률 기반 행 전부 불가. A-01과 합쳐 확률 기반 제출 경로 전체가 미구현.

### [A-03] 지표→필수컬럼 규칙이 4곳에 중복 정의되어 서로 다름 (SSoT 붕괴) — High / 확인됨
- **근거** — 4개 출처: ①`SPEC.md` §1~§3 ②`Capstone_Back/app/core/schemas.py:70` `METRIC_REQUIREMENTS` ③`Capstone_Front/src/data/evaluationData.ts:82` `REQUIRED_COLUMNS_BY_METRIC` ④`Capstone_Front/src/data/evaluationData.ts:51` `METRICS`
- **확인된 갈라짐**

  | 지표 | SPEC | 백엔드 | 프론트 요건표 |
  |---|---|---|---|
  | binary M6 | `y_true`,`y_pred` | `{y_true, y_pred}` | `["id","y_true","score"]` ← 혼자 다름 |
  | binary M23 | `y_true`만 | `{y_true, y_pred}` ← 혼자 다름 | `["id","y_true"]` |
  | multiclass M23 | `y_true`만 | `{y_true, y_pred}` ← 혼자 다름 | `["id","y_true"]` |
  | multilabel M18 | `y_true`,`y_pred`/`prob_label` | `{true_labels, score_per_label}` ← 다름 | `["id","y_true","y_pred"]` |
- **영향**: 한 곳을 고쳐도 나머지 3곳이 남는다. 개별 불일치를 하나씩 고치는 방식으로는 재발을 막을 수 없다. (5번째 죽은 사본은 H-14 참조)

### [A-04] multilabel 허용 지표 3자 불일치 + 프론트 내부 자기모순 — High / 확인됨
- **근거**
  - SPEC §3 허용: `M1~M5, M15~M18, M21~M23`
  - 백엔드 `Capstone_Back/app/core/schemas.py:103-122`: **M6, M11, M12, M13 추가 허용**
  - 프론트 `Capstone_Front/src/data/evaluationData.ts:51` — **M1의 `supportedTaskTypes`에 multilabel 없음**
  - 프론트 내부 모순: 같은 파일 `:110` `REQUIRED_COLUMNS_BY_METRIC.multilabel`에는 **M1 항목이 존재**
- **영향**: 사용자는 multilabel에서 M1을 **선택조차 할 수 없고**, SPEC에 없는 M11~M13은 선택 가능하다.

### [A-05] M18 계산식이 성적서에 인쇄되는 공식과 다름 — High / 확인됨
- **근거**: 표시 `Capstone_Front/src/data/evaluationData.ts:68` `0.5 * ∑ |P(l) - Q(l)|` vs 구현 `Capstone_Back/app/evaluation/metrics/multilabel.py:67-85` **코사인 거리**(`1.0 - cos_sim`). 대조군 M14는 같은 표기에 실제 TVD 구현(`multiclass.py:35-45`)
- **영향**: 공식과 숫자가 함께 인쇄되는 성적서에서 **독자가 재계산하면 불일치**한다. 어느 쪽이 의도인지 문서로 결정되어 있지 않다.

### [A-06] M18의 선언 역할과 실제 구현 입력이 다름 — High / 확인됨
- **근거**: 선언 `Capstone_Back/app/core/schemas.py:118` `{true_labels, score_per_label}` vs 구현 `Capstone_Back/app/evaluation/metrics/multilabel.py:69` — `_get_binarized_true_pred()`로 **`pred_labels`** 사용, `score_per_label` 미참조(`:38-41`)
- **영향**: `score_per_label`만 매핑한 사용자에게 confirm-mapping이 M18을 **계산 가능**으로 안내하지만 평가 시 `ValueError`로 실패한다.

### [A-07] M7(Specificity)·M8(FPR)이 `positive_class`를 무시 — High / 확인됨
- **근거**
  - SPEC §1 표 — M7·M8의 "UI 입력"에 **positive_class** 명시
  - `Capstone_Back/app/evaluation/metrics/binary.py:56-72` — `confusion_matrix(y_true, y_pred)`를 `labels` 없이 호출 후 `tn, fp, fn, tp = cm.ravel()`. `_positive_class` 미참조
  - 대조군: M2~M5는 `pos_label` 반영(`common.py:49-62`), M9·M10·M19도 `_binarize_true_labels(..., pos_class)` 반영(`binary.py:37-54`)
- **영향**: 양성을 정렬상 앞선 값으로 지정하면 Specificity·FPR이 뒤집힌 값으로 나온다. **에러 없이 조용히** 발생하며, 같은 성적서 안에서 지표마다 양성 기준이 달라진다.

### [A-08] multilabel M2~M5의 평균 방식이 SPEC과 다름 — Medium / 확인됨
- **근거**: SPEC §3 "Precision(**sample 평균**)" vs `Capstone_Back/app/evaluation/metrics/common.py:70·78·86·97` — `task_type != 'binary'` 경로에서 일괄 `average='macro'`. 같은 도메인의 M17은 `average='samples'`(`multilabel.py:65`)
- **영향**: multilabel 성적서의 P/R/F1이 SPEC 정의와 다른 수치로 산출된다. **이 오류값이 golden 스냅샷에 기대값으로 고정되어 있다(H-02).**

### [A-09] multiclass M6(KL)이 확률 대신 하드 레이블로 계산 — Medium / 확인됨
- **근거**: SPEC §2 M6 필수 `prob_class_*` + 규칙 3 "**하드 레이블로는 계산 불가**" vs 백엔드 선언 `{y_true, y_pred}`(`core/schemas.py:94`) + 구현 `common.py:99-115`의 레이블 카운트 분포
- **참고**: binary M6는 SPEC이 "카운트 기반"이라 명시하므로 정합.

### [A-10] SPEC §4의 "역할 불일치" Error 3건 미구현 — High / 확인됨
- **근거**
  - SPEC §4 — "Binary인데 `prob_class_*`", "Multiclass인데 `score`", "Multilabel인데 `score`/`prob_class_*`" 매핑 시 Error
  - `Capstone_Back/app/core/schemas.py:54` `VALID_ROLES_BY_TASK`는 **LLM 프롬프트 생성에만 사용**(`prompt_builder.py:37`, `llm_mapper.py:29`). 사용자 확정 매핑 검증에서는 미사용
  - `Capstone_Back/app/analysis/validator.py:126` `validate_mapping()`에 해당 검사 없음 — 그런데 docstring `:130`은 "**1. 역할 유효성** 검사"라고 기술 → **문서와 코드 불일치**
  - `Capstone_Front/src/lib/mapping/translateRoleToBackend.ts:27` — 맞지 않는 역할은 최종 `return "ignore"`로 **조용히 강등**
- **영향**: 잘못된 역할 지정이 에러가 아니라 "그 컬럼 무시"로 처리되어, 사용자는 매핑했다고 믿지만 평가에서 빠진다.

### [A-11] SPEC §4 검증 항목 누락 및 등급 불일치 — Medium / 확인됨

| SPEC §4 항목 | SPEC 등급 | 구현 |
|---|---|---|
| `id` 중복/null | **Error(차단)** | `warning` (`validation_checks.py:74-100`), null 검사 없음 |
| 샘플 수 < 100 | Warning | **미구현** |
| `prob_class_*` 수 ≠ 클래스 수 | Warning | **미구현** |
| 확률값 [0,1] 이탈 | Warning | `error` (`:227`) — 등급 상향 |

### [A-12] SPEC §5·§6이 규정한 "계산 가능 지표" UI 미구현 — Medium / 확인됨
- **근거**: 백엔드가 `available_metric_ids`/`unavailable_metric_ids`를 반환(`validator.py:212-219`)하지만 `Capstone_Front/src/lib/report/confirmMappingApi.ts`의 `ConfirmMappingResult`는 `is_valid`, `errors`만 선언. 두 필드는 코드베이스 어디에서도 참조되지 않음
- 누락된 UI: "계산 가능한 지표: N/M" 표시, "[지표 선택으로 돌아가기]/[자동 해제하고 계속]" 버튼, Step2의 "score 필요"/"prob 필요" Badge(`probabilityRequiredFor`는 정의만 되고 미사용)
- **영향**: 사용자는 매핑 확정 후에야, 그것도 에러 메시지로만 계산 불가를 알게 된다.

### [A-13] `id`가 사실상 필수 컬럼으로 요구됨 — Medium / 확인됨
- **근거**: SPEC §0 "선택(권장), 없으면 행 번호로 자동 생성" vs `evaluationData.ts:82-131`의 **모든 지표 항목이 `"id"`로 시작** + `RequiredColumnsCard.tsx:32` "You **must map** a column…". 백엔드는 `sample_id` 없이 통과. "행 번호 자동 생성" 로직은 양쪽 어디에도 없음

### [A-14] `latency` 역할이 LLM 프롬프트의 역할 설명에서 누락 — Medium / 확인됨
> LLM 사용 지도 작성 중 발견. 상세는 [LLM_BRIEFING.md](LLM_BRIEFING.md) §2-4.

- **증상**: 컬럼 자동 매핑 프롬프트에서 `latency`가 **선택 가능한 역할 목록에는 들어가는데 그 역할이 무엇인지 설명이 없다.** LLM은 이름만 보고 추측해야 한다.
- **근거**
  - `Capstone_Back/app/analysis/prompt_builder.py:11-33` `_ROLE_HINTS` — binary/multiclass/multilabel **세 유형 모두** `latency` 항목 없음(각 5개 역할만 설명)
  - `Capstone_Back/app/analysis/prompt_builder.py:37` — `valid_roles`는 `VALID_ROLES_BY_TASK`에서 가져오므로 `latency`가 포함됨
  - 렌더링 확인 — 시스템 프롬프트에 `Map every column to exactly one of: ['sample_id', 'y_true', 'y_pred', 'score_positive', 'latency', 'ignore']` 가 출력되지만 위 설명 블록에는 `latency` 줄이 없음
  - `Capstone_Back/app/core/schemas.py:36` — `latency`는 3개 task 모두 유효 역할이고 `validation_checks.py:379`에 전용 검증 항목까지 있는 **정식 지원 역할**
- **영향**: 응답시간 컬럼이 있는 데이터셋에서 자동 매핑이 그 컬럼을 `ignore` 등으로 잘못 배정할 가능성이 높다. 사용자가 5단계에서 손으로 고쳐야 하고, 놓치면 성적서의 지연시간 절이 통째로 빈다. (SPEC.md §0 표에도 `latency`가 없는 것과 같은 뿌리 — H-12 참조)

---

# B축 — 계약 정합성

**소견**: 두 저장소 경계가 전부 `any`/옵셔널 체이닝으로 흡수되어, 형태가 어긋나도 예외 대신 조용한 기본값이 된다. 특히 `/api/evaluate`의 `results`가 `dict[str, Any]`로 선언돼 지표별 반환 타입이 계약상 전혀 표현되지 않고, 프론트는 그중 **두 형태만** 처리한 뒤 나머지를 0으로 강등한다. 반대로 백엔드가 "사용자 안내용"으로 명시해 내려보내는 필드들은 소비처가 없다. role 어휘 왕복(10개 역할)은 task_type 고정 조건에서 무손실임을 확인했다.

### [B-01] dict 반환 지표(M22/M21)를 프론트가 스칼라 0으로 강등 → 종합판정·통과율·fact_sheet 오염 — Critical / 확인됨
> C축에서 독립 발견된 동일 결함을 병합. 양쪽 모두 실행으로 재현.

- **증상**: M22를 선택하면 성적서 종합판정이 **절대 PASS가 될 수 없고** 통과율 score의 분모·분자가 틀어진다. 백엔드가 정상 계산한 `classification_report` dict가 프론트에서 값 0 / 판정 `fail`이 된다.
- **근거** (실측: TestClient로 `binary_test_data_200.csv` + M22 포함 POST → `success_metrics['M22']` 키가 `['0','1','accuracy','macro avg','weighted avg']`, `f1_score` 없음)
  - `Capstone_Back/app/evaluation/metrics/common.py:141` — M22는 classification_report dict 반환 · `:117` M21도 dict 반환
  - 대조군 `Capstone_Back/app/evaluation/metrics/multiclass.py:21` — M11~M13만 `{precision, recall, f1_score}` 형태 → 프론트는 **3개 지표의 형태만 안다**
  - `Capstone_Front/src/hooks/useReportData.ts:184` — `typeof val === "number"` 또는 `"f1_score" in val`만 처리, 그 외 dict은 `:181`의 `resolvedValue = 0` 유지
  - `Capstone_Front/src/utils/domain/validation.ts:84` — `metricNeedsTargetValue`는 M21만 면제 → M22는 목표값 **필수 입력** · `MetricDetail.tsx:77` `nextDisabled`로 강제
  - `Capstone_Front/src/lib/report/computeVerdict.ts:45·55` — `threshold > 0`이라 판정 분모에 포함, `anyFailed`가 항상 true → CONDITIONAL_PASS 확정
  - `Capstone_Front/src/lib/report/buildFactSheet.ts:119` — `{value:0, status:'fail'}`이 fact_sheet에 실려 LLM으로 전송 → `Capstone_Back/app/narrative/derived.py:88`이 통과율 근거로 사용
  - `Capstone_Front/src/data/evaluationData.ts:76` — `RECOMMENDED_METRICS`가 3개 task_type 모두 M21·M22 포함
  - `Capstone_Front/src/components/report/shared/MetricRow.tsx:23-25` — 표에는 `— / ℹ 시각화 참조`로 렌더되어 **이 fail이 화면에 드러나지 않는다**
- **영향**: 추천 지표를 그대로 쓴 정상 사용자의 성적서에서 8절 종합판정이 실제 성능과 무관하게 강등되고, 통과율이 깎인다. 동시에 LLM 서술에 "Class-wise Metric 0.000(기준 미달)"이라는 **존재하지 않는 사실**이 근거로 주입된다. 5절 시험항목 표에는 M22 합격기준이 "≥ 0.85"로 인쇄되어 6절의 "정보 제공" 표기와 정면 충돌한다.

### [B-02] multilabel에서 M21 미선택 시 `fact_sheet.n_samples`가 '레이블 등장 횟수 합'으로 바뀜 — High / 확인됨
> C축 동일 발견 병합.

- **근거** (실측: 200행 `multilabel_200.csv` → class_distribution 합계 **408**)
  - `Capstone_Back/app/evaluation/preprocessor.py:148-158` — multilabel일 때 레이블 등장 횟수를 누적(샘플 수 아님)
  - `Capstone_Front/src/lib/report/buildFactSheet.ts:132-133` — `nSamples = confusionMatrix?.totalSamples ?? distTotal` — M21 미선택 시 `confusionMatrix=null`(`useReportData.ts:240` 가드)이라 408이 n_samples가 된다
  - `Capstone_Back/app/narrative/derived.py:79` — 백엔드도 `sum(dist.values())`로 재계산 → **모순 탐지도 안 됨**
  - 대조군 `Capstone_Front/src/lib/report/buildDatasetDiagnosis.ts:28-36` — 진단문 쪽에는 multilabel 보정이 있으나 buildFactSheet에는 없다
- **영향**: 성적서 7·8절이 실제의 2배가 넘는 평가 규모를 단정한다. grounding 화이트리스트를 통과하므로 환각 방어에도 걸리지 않는다. 6절 "총 검증 건수"(200)와 7·8절 서술(408)이 한 문서에서 다른 값으로 인쇄된다.

### [B-03] `/api/analyze-columns`의 `column_notes`(LLM 컬럼 보정 안내)를 프론트가 버림 — Medium / 확인됨
- **근거**: `Capstone_Back/app/analysis/schemas.py:20` — 주석에 "**프론트 배너용**"이라고 용도 명시 · `reconcile.py:65·74` — "파일 헤더에 없어 매핑에서 제외했습니다" / "자동 매핑되지 않아 ignore로 추가했습니다" 생성 · `Capstone_Front/src/hooks/useColumnAnalysis.ts:45` — `column_mappings`만 순회, `column_notes` 참조 0건
- **영향**: LLM이 컬럼을 조용히 떨어뜨렸을 때 사용자는 Step5에서 "왜 이 컬럼이 ignore인지" 알 수 없다. 백엔드가 만든 신뢰 경계 방어의 절반이 무효화된다.

### [B-04] `/api/confirm-mapping` 응답의 `warnings`를 프론트 인터페이스가 선언하지 않음 — Low / 확인됨
- **근거**: `Capstone_Back/app/analysis/schemas.py:44` 계약 존재 + `validator.py:186-188` 생성 vs `Capstone_Front/src/lib/report/confirmMappingApi.ts:17-20` `{is_valid, errors}`만 선언 · `ColumnMapping.tsx:27-34` — `is_valid=false`일 때만 alert
- **참고**: 선택 지표 관련 사유는 `MISSING_METRIC_REQUIREMENT` **error**로 차단되므로(`validator.py:206-210`), 손실은 참고성 안내에 한정.

---

# C축 — 계산 정확성

**소견**: 문제는 "함수 하나가 틀렸다"기보다 **경계 조건에서 sklearn 기본값을 그대로 신뢰한 것**에서 나온다. `labels=`·`zero_division=`·`cm.shape` 가정이 깨질 때(레이블 1종, 유령 클래스, 빈 레이블 집합) 예외 없이 조용히 잘못된 숫자를 `success_metrics`에 실어 보낸다. 지표 함수가 예외를 던지지 않으므로 engine의 예외 격리도 report.py의 분류도 걸러내지 못하고, 현재 81건 테스트는 정상 분포 픽스처만 써서 전부 통과한다.

### [C-01] M17 Jaccard가 '레이블 없음' 샘플을 0점으로 확정 — High / 확인됨
- **증상**: true/pred가 **모든 행에서 완전히 동일한**(완벽 예측) 멀티레이블 데이터셋에서 M17이 1.0이 아닌 **0.6**으로 나온다. 같은 데이터에서 M1=1.0, M15=0.0, M16=1.0.
- **근거**
  - `Capstone_Back/app/evaluation/metrics/multilabel.py:65` — `jaccard_score(..., average='samples', zero_division=0)` — 정답·예측 모두 빈 집합인 샘플의 0/0을 **완전 불일치(0점)**로 확정
  - 대조군 `:60` — M16 `accuracy_score`는 0벡터==0벡터를 일치로 세어 1.0 → 동일 데이터에 **모순된 결론**
  - `Capstone_Back/app/evaluation/preprocessor.py:38-44` — `_fill_multilabel_missing`이 결측을 `''`로 채워 살려두므로 빈 레이블 샘플은 이 시스템이 **의도적으로 만드는 정상 입력**
  - `Capstone_Front/src/lib/report/computeVerdict.ts:29` — multilabel CORE = `["M4","M17"]` → 이 왜곡값 하나로 verdict가 FAIL 확정 가능
  - 재현: `true=pred=['A|B','A','','','B']` → M1=1.0, M15=0.0, M16=1.0, **M17=0.6**
- **영향**: 왜곡 폭이 빈 레이블 샘플 비율에 비례해 무제한으로 커진다. 예외가 아니므로 '측정 불가' 배지도 없이 그냥 낮은 숫자로 발급된다.

### [C-02] M7/M8이 혼동행렬 2x2가 아니면 예외 없이 `0.0` 반환 — High / 확인됨
- **근거**: `Capstone_Back/app/evaluation/metrics/binary.py:59-63·65-72` — `labels=` 미지정으로 행렬 크기가 데이터에 좌우되고, `if cm.shape == (2,2)`가 아니면 무조건 `return 0.0`. 대조군: M21은 `labels=`를 명시(`common.py:132-133`), M20 MCC는 같은 상황에서 다중클래스 값을 계산(`binary.py:98`) → **같은 파일군에서 태도가 갈린다**
- **영향**: ①y_true가 전부 음성인 데이터(희귀 양성 필터링)에서 모두 맞혔는데 Specificity가 1.0이 아닌 0.0으로 인쇄 ②y_pred에 미지 라벨이 섞이면 둘 다 0.0. **M8은 `higherIsBetter=false`라 0.0이 무조건 pass가 되어 "오탐률 0%"라는 허위 우수 판정이 인쇄된다.**

### [C-03] y_pred에만 등장하는 유령 클래스가 평가 클래스 집합에 편입 — Medium / 확인됨
- **근거**
  - `Capstone_Back/app/analysis/validation_checks.py:103-133` — 미지 클래스를 warning으로 표시하며 handling에 "Exclude affected rows"라고 안내하지만, `preprocessor.py:164-187`에 해당 단계 **없음**
  - `common.py:147·149` (M22), `common.py:70·78·86·97`, `multiclass.py:20·26·32` — 전부 `labels` 미지정 → 클래스 집합이 `y_true ∪ y_pred`
  - 반면 M23은 `y_true`만 본다(`common.py:151-175`) → **같은 성적서에서 M23은 3클래스, M2~M5·M22는 4클래스 기준**
  - 재현: `y_true=A,A,A,B,B,B,C,C,C` / `y_pred=A,A,D,...` → M2 1.0→**0.75**, M22에 `'D': {support: 0.0}` 행 생성
- **영향**: 오타 라벨 1건만으로 macro Precision이 25% 하락한다. 성적서의 "Macro Average"가 뜻하는 N이 데이터에 따라 달라져 **재현되지 않는다**. 유령 클래스가 클래스별 성능 표에 실재 클래스로 인쇄된다.

### [C-04] y_true 단일 클래스 데이터셋에서 M23=1.0 → 성적서가 '균형 상태'로 정반대 서술 — Medium / 확인됨
- **근거**: `common.py:164-175` — 관측 클래스가 1종이면 `majority==minority`로 1.0 (`:172`의 `if minority == 0`은 도달 불가한 죽은 코드) · `buildDatasetDiagnosis.ts:47-60` — ratio≤1.5면 "허용 기준(≤1.50) 이내의 균형 상태이다" 생성 · `validation_checks.py:194-201` — 단일 클래스는 error가 아닌 warning이라 발급까지 진행
- **영향**: 평가 데이터셋이 쓸모없는 수준일 때 성적서가 정반대로 "균형이 잡혀 있다"고 인쇄한다. 같은 문서에 "데이터셋 균형 양호"와 "AUROC 측정 불가"가 나란히 실린다.

### [C-05] 성적서 5절에 인쇄되는 공식 문자열 3건이 실제 산출식과 다른 수를 만듦 — Medium / 확인됨
- **근거** (재현 데이터 기준 수치 대조)
  - `evaluationData.ts:62` M12 `∑ TP / ∑ (TP+FP+FN)` — 이는 micro-Jaccard 식. 구현은 `average='micro'`(`multiclass.py:26`). 인쇄 식은 8/10=**0.800**, 실제 산출값 **0.889**
  - `:54·55` M4·M5 `2*(P*R)/(P+R)` — 구현은 macro-F1(`common.py:86·97`). macro-F1 ≠ macro-P와 macro-R의 조화평균. 인쇄 식 **0.7059**, 실제 **0.700**
  - `:52·53` M2·M3 `TP/(TP+FP)` (이진 단일 클래스 식) — 구현은 macro 평균. 전역 계산 **0.889** vs 인쇄된 M2 값 **0.750**
  - `MetricListSection.tsx:69` — 이 문자열이 성적서 표 셀에 그대로 렌더됨
- **영향**: 공식 성적서 안에서 '산출식'과 '산출 결과'가 검산되지 않는다. **성적서의 검증 가능성 자체가 훼손된다.** (구현은 SPEC과 맞고 인쇄 문자열만 어긋난 케이스)

### [C-06] M11~M13의 대표값이 `f1_score` 하나뿐이라 목표값 판정이 precision/recall을 검사하지 않음 — Medium / 확인됨
- **근거**: `useReportData.ts:186-188` — `resolvedValue = val.f1_score` · `:192-194` — f1만 목표값과 비교 · `KpiResultSection.tsx:133-167` — precision/recall은 판정 배지 없이 값만 표시 · `MetricDetailInput.tsx:169-171` — 안내문은 "acceptance criterion"이라고만 함
- **영향**: `{precision:0.75, recall:0.667, f1:0.70}`에 목표 0.70을 넣으면 pass로 인쇄되지만 recall은 미달이다. 사용자 의도의 절반만 적용된 채 합격 도장이 찍힌다.

### [C-07] `report.py`의 success/failed 분류가 `'error'` **키 존재**만 검사 — Medium / 확인됨
- **근거**: `Capstone_Back/app/evaluation/report.py:26-27` — `if isinstance(val, dict) and "error" in val` · `engine.py:104-106` — 에러 표현이 `{"error": str(e)}`뿐이라 정상 결과 dict와 **네임스페이스를 공유** · `useReportData.ts:163-175` — 문자열이 아니면 `String(failReason)` → `"[object Object]"`
- **영향**: 클래스 이름이 `'error'`인 데이터셋(장애 로그·불량 판정 등에서 흔함)에서 M22가 계산에 성공했는데도 "측정 불가"로 표기되고, 클래스별 성능 표와 LLM 클래스 분석이 통째로 사라진다(`useReportData.ts:197`, `buildFactSheet.ts:141`).

### [C-08] 멀티레이블 혼동행렬 중 **첫 번째 레이블**의 2x2만 fact_sheet로 전달 — Medium / 확인됨
- **근거**: `useReportData.ts:249-255` — `multilabelMatrices[0]`만 대표 행렬 · `buildFactSheet.ts:142-148` — `multilabelMatrices` 필드가 fact_sheet 타입에 없어 통째로 버려짐. 백엔드는 전체 행렬과 `_mlb_classes`를 정상 반환(`common.py:122-130`) → **정보 손실은 프론트 조립 단계에서만 발생**
- **영향**: LLM이 "이 모델의 혼동행렬"로 해석하는 FN/FP가 실제로는 알파벳 순 첫 레이블 하나의 것이다. 레이블별 편차가 큰 모델에서 특정 레이블 특성이 모델 전체 특성으로 일반화되어 기술된다.

### [C-09] 데이터셋 특성 지표 M23이 모델 종합 판정 분모에 섞임 — Low / 확인됨
- **근거**: `validation.ts:67-71·84-86` — M23도 목표값 강제 · `computeVerdict.ts:45·52-55` — `threshold > 0`인 모든 지표가 판정 대상 · 대조군 `:26-30` — `CORE_METRIC_IDS`에는 M23 없음 · `KpiResultSection.tsx:13-17` — 표시 계층의 `KPI_CORE_IDS`에는 3개 task 모두 M23 포함 → **판정 로직과 표시 로직의 위상이 다름**
- **영향**: 데이터셋이 불균형하다는 이유만으로 모델 종합 점수가 깎이고 판정이 조건부 합격으로 내려간다.

---

# D축 — 데이터 파이프라인 견고성

**소견**: 결함의 대부분이 "같은 데이터를 두 번, 서로 다른 규칙으로 판단"하는 구조에서 나온다. Step6 검증과 평가 전처리는 결측 기준이 다르고, 그 결과 성적서 6절에 인쇄되는 "평가에 사용될 행 수"가 실제와 다르다. 게다가 Step6은 **잘못 축소된 데이터 위에서** 나머지 검사를 수행해 허위 경고까지 생산한다. 두 번째 축은 "표시된 처리방침이 구현되지 않은 약속"이고, 세 번째는 헬퍼 단위의 조용한 값 왜곡이다.

### [D-01] Step6 검증과 평가의 결측 기준이 달라 성적서 6절 표본 수가 실제와 어긋남 — High / 확인됨
- **근거**
  - `Capstone_Back/app/analysis/validation_service.py:113` — `df_clean = df_work.dropna()` (전 컬럼, latency 제외 없음, multilabel `''` 대체 없음)
  - `Capstone_Back/app/evaluation/preprocessor.py:50-54` — latency 제외 · `:38-44` — multilabel 결측을 `''`로 채워 유실 방지
  - `validation_checks.py:55-56` — `check_missing_values`는 latency를 제외 → **같은 응답에 "Missing value: None (pass)"와 "Excluded samples: 2 rows (warning)"가 동시 출력**(재현 확인)
  - 이 값이 `mapValidationResultToReport.ts:76-80` → `DataValidationSection.tsx:101-103`으로 **성적서 6절에 인쇄**
  - 같은 성적서의 진단 문구는 평가측 `result.dropped_rows`를 쓴다(`useReportData.ts:312`) → **한 문서에 두 기준 공존**
- **영향**: 발급된 공식 성적서의 표본 수가 실제 지표 계산에 쓰인 수와 불일치한다. latency 결측이 있거나 multilabel 라벨 셀이 빈(=해당 레이블 없음) 흔한 데이터셋에서 **항상** 발생.

### [D-02] Step6이 과다 축소된 데이터 위에서 클래스 검사를 수행해 허위 경고 생성 — Medium / 확인됨
- **근거**: `validation_service.py:113-119` — 축소된 `df_clean`을 그대로 이후 검사에 전달 · `validation_checks.py:192-201` — 재현 시 "Expected 2 classes, found 1" · `:108-119` — "Pred has unknown classes: 1"
- **영향**: 정상 이진 데이터셋에 latency 결측이 있으면 데이터에 없는 문제를 고치라는 안내를 받고, 그 허위 경고가 성적서 6절에 '경고'로 인쇄된다. `n_classes > 2` 조건이면 `status='error'`가 되어 진행 자체가 막힐 수 있다.

### [D-03] Step6 표의 `handling` 문구가 평가 파이프라인에 구현되어 있지 않음 — Medium / 확인됨
- **근거**: `validation_checks.py:83·116·131·330·338` — "Keep the first row and exclude later duplicates" / "Exclude affected rows from evaluation" vs `preprocessor.py:164-187` 단계 목록에 중복 제거·클래스 필터 **없음**. app/ 전체 grep: `drop_duplicates` 0건, `isin(` 0건
- **영향**: 중복 제출된 데이터셋에서 지표가 중복 가중치로 왜곡되는데, 사용자는 "첫 행만 남는다"는 안내를 읽고 문제없다고 판단한다.

### [D-04] 멀티레이블 파서가 같은 컬럼에서 str/int를 혼재 생성 — High / 확인됨
- **근거**: `preprocessor.py:77-91` — `'[1, 2]'`→`[1,2]`(int), `'3'`→`['3']`(str) → **한 컬럼에 타입 혼재** · `multilabel.py:46-50` — `MultiLabelBinarizer.fit`이 정렬 시 `TypeError` (재현: M15/M16 = `{'error': "'<' not supported between instances of 'str' and 'int'"}`) · `preprocessor.py:145-158` — class_distribution도 `{1:2, 2:1, '3':1}`로 분리
- **부수**: `multilabel.py:17-32`의 두 번째 파서는 `'|'` 분기가 없어 `'A|B'`→`['A|B']`로 깨지지만, `engine.py:80`이 항상 전처리를 먼저 하므로 현재 실행 경로에는 없음(잠재 드리프트).
- **영향**: 숫자 라벨 + 일부만 대괄호 형식인 파일에서 M15~M18이 전부 실패하고, 성적서에 영문 sklearn 예외 문자열이 그대로 노출된다.

### [D-05] `_coerce_label_types`가 y_pred를 무검증 캐스팅해 확률이 정수로 절단 — High / 확인됨
- **근거**: `preprocessor.py:64-74` — `df[y_pred_col].astype(true_type)`, 변환 전후 값 변화 검사 없음 (재현: `[0.6,0.4,0.9,0.2]` → `[0,0,0,0]`, **M1=0.5**) · `:169-172` — `logs['warnings']`에 아무 기록 없음(재현: `warnings=[]`)
- **상류 신호**: `validation_checks.py:103-133`이 "Pred has unknown classes: 0.2, 0.4, ..."를 warning으로 출력하나 차단하지 않음
- **영향**: 확률 컬럼이 y_pred로 잘못 매핑되면(LLM 자동 매핑에서 충분히 발생 가능) 오류 없이 전부 0으로 절단된 예측으로 지표가 계산되어, **겉보기에 정상인 성적서에 완전히 틀린 숫자**가 실린다.

### [D-06] 결측 제거 대상이 선택 지표와 무관하게 '매핑된 모든 비-ignore 컬럼' — Medium / 확인됨
- **근거**: `preprocessor.py:175` — `required_cols`가 역할·선택 지표 무관 · `:50-54` — dropna subset이 latency만 제외 (재현: id/score 결측 2행 → M1만 선택해도 `dropped_rows=2`) · `engine.py:94-103` — `selected_metric_ids`는 전처리 이후에만 참조
- **영향**: 확률 컬럼이 일부만 채워진 데이터에서 라벨 기반 지표의 표본 수가 이유 없이 줄고 클래스 분포가 편향된다.

### [D-07] multiclass argmax 검사가 컬럼명을 `prob_<클래스>`로 가정 — Medium / 확인됨
- **근거**: `validation_checks.py:290-294` — `c.replace('prob_','')` 후 y_pred와 직접 비교 · `:284-286` — 명명 규칙과 무관하게 항상 실행 (재현: `p_cat/p_dog/p_bird` → 3 rows warning, `prob_*`로 rename → 0 rows pass)
- **영향**: 명명 규칙을 따르지 않은 사용자(대다수)의 성적서에 "전 행 argmax 불일치"라는 허위 결함이 공식 기록으로 남는다. 반대로 진짜 불일치도 이름만 맞으면 우연히 통과 → **검사 신뢰도 없음**.

### [D-08] `mapping_dict`가 역할당 1컬럼만 남겨 `score_per_label` 다중 컬럼 중 마지막만 범위 검사 — Medium / 확인됨
- **근거**: `preprocessor.py:170` — `{m['role']: m['column']}` (동일 role은 마지막 값으로 덮어씀) · `:105-107` — 리스트로 모으는 것은 `prob_per_class`뿐 (재현: 매핑 순서에 따라 통과/400으로 갈림) · `validation_checks.py:344-376` — `check_multilabel`은 `prob_cols` 인자를 받고도 **사용하지 않음**
- **영향**: 멀티레이블 확률 컬럼의 로짓·음수가 전 계층에서 검출되지 않는다. 임계값 기반 지표(A-01) 도입 시 그대로 잘못된 값이 계산된다.

### [D-09] 'Score range error'의 안내는 '행 제외'지만 실제로는 평가 전체 중단 — Medium / 확인됨
- **근거**: `validation_checks.py:159-165` — `status='error'`, handling="Exclude affected rows" vs `preprocessor.py:116-121` — 하나라도 있으면 `raise ValueError` → `service.py:52-53` → HTTP 400
- **범위**: binary는 Step6에서 이미 차단되므로(`DataValidation.tsx:20·57`), 400 노출은 **멀티레이블 `score_per_label`·latency 결측 행 경로**에서만 발생. 같은 모순이 `Binary class system error`·`Label format mismatch`에도 있다.

### [D-10] 멀티레이블 'Label format mismatch'가 **단일 라벨 값**을 형식 오류로 오탐 — Medium / 확인됨
- **근거**: `validation_checks.py:357-359` — `if '|' not in val and ',' not in val: format_errors += 1` vs `preprocessor.py:88-90` — 같은 값을 `['A']`로 정상 처리
- **영향**: 단일 라벨 샘플이 섞인(=거의 모든) 멀티레이블 데이터셋에서 "레이블 형식 오류 N건" 경고가 **항상** 뜨고 성적서 6절에 인쇄된다.

### [D-11] 확률 범위 오류 메시지가 0-based 인덱스를 '{n}번째 행'으로 출력 — Low / 확인됨
- **근거**: `preprocessor.py:119-121` — `invalid.index[0]`을 그대로 출력 (재현: 데이터 4번째 행의 1.7 → "3번째 행"). 헤더 오프셋도 미보정
- **영향**: 안내받은 위치를 열면 정상 값이 들어 있다. 이 메시지는 HTTP 400 detail로 노출되는 **유일한 수정 단서**다.

### [D-12] 빈 데이터셋(헤더만 있는 파일)이 Step6를 통과한 뒤 리포트에서 400 — Medium / 확인됨
- **근거**: `validation_service.py:91·113-115` — `total_rows=0`이어도 정상 응답(행 수 하한 검사 없음) · `preprocessor.py:166-167` — `if df.empty: raise` · `parsing.py:58-59` — 헤더만 있는 CSV는 0행 DataFrame으로 정상 파싱
- **영향**: 업로드 실수를 6단계 내내 아무도 지적하지 않다가 마지막에 실패한다. 사용자는 어느 단계로 돌아가야 하는지 알 수 없다.

### [D-13] CSV 인코딩 폴백의 마지막 단계 `latin-1`은 실패할 수 없음 — Low / 확인됨
- **근거**: `parsing.py:20-26` — `('utf-8','utf-8-sig','cp949','latin-1')` 순회, latin-1은 모든 바이트열을 디코딩 (재현: UTF-16 CSV → 컬럼명 `['ÿþ\x15Èõ²','Unnamed: 1']`) · `:23` — 디코딩은 됐지만 깨진 경우를 판별할 수단 없음
- **완화**: 깨진 컬럼명은 Step4/5 UI에 노출되어 육안 확인은 가능(`ColumnMapping.tsx:62-63`).

### [D-14] JSON 정규화의 단일 키 언랩이 형식 구분 없이 키 개수만 확인 — Low / 확인됨
- **근거**: `parsing.py:33-36` — 키 개수만으로 '열 기반 dict'와 'samples 래핑' 구분 · `:40-44` — 2키 이상 dict는 그대로 `pd.DataFrame(raw)` (재현: `{'model':'x','samples':[...]}` → columns `['model','samples']`인 쓰레기 DataFrame)
- **영향**: 문서화된 3가지 지원 형태(`parsing.py:51-54`) 중 '열 기반 dict'가 1컬럼일 때 깨지고, 실무에서 흔한 '메타 + samples' 래핑이 조용히 오파싱된다.

### [D-15] 업로드 UI가 'up to 100MB'를 표기하지만 크기 검사가 어디에도 없고 같은 파일을 3회 전송 — Low / 추정
- **근거**: `DataUpload.tsx:315` — `description="CSV or JSON, up to 100MB"` (src 전체에 `file.size` 비교·`maxSize` 상수 없음) · 세 라우터 모두 `await file.read()` 전 크기 검사 없음(`evaluation/router.py:35`, `validation_router.py:37`, `analysis/router.py:49`) · `main.py:62-67` — 미들웨어는 CORS뿐 · 동일 `rawFile` 3회 전송(`useColumnAnalysis.ts:30`, `useDataValidation.ts:87`, `useReportData.ts:114`)
- **영향**: 안내문(100MB)이 지켜질 수 없는 약속이다. OOM 영향은 G-04 참조(미재현).

### [D-16] 전처리가 생성한 `warnings`가 프론트에서 전혀 사용되지 않음 — Medium / 확인됨
> B축 동일 발견 병합.

- **근거**: `preprocessor.py:132·136·145` — latency 비숫자·음수·multiclass 확률합 경고 적재 · `service.py:56·64-66` — `EvaluateResponse.warnings`로 반환 vs `useReportData.ts:145-147` — `result.warnings` 참조 **0건**
- **영향**: "확률합이 1이 아니어서 결과 신뢰도가 낮을 수 있습니다" 같은 성적서 신뢰도 직결 경고가 사용자에게도 성적서에도 전혀 표시되지 않는다. Step6 검증표가 일부를 별도 경로로 보여주지만 그것은 dry-run 결과이고, **실제 평가 실행 중 경고는 어디에도 기록되지 않아 추적성이 끊긴다.**

### [D-17] `required_cols`를 `set()`으로 만들어 순서가 비결정적 + 죽은 역할명 분기 — Low / 확인됨
- **근거**: `preprocessor.py:175`·`validation_service.py:94` — `list(set([...]))` · `preprocessor.py:20·66-67`, `validation_checks.py:105-106·150·216-217` — `'true_class'`/`'predicted_class'` 분기가 있으나 `ColumnRole` enum에 없어 **절대 매칭되지 않음**(pydantic이 enum 오류로 거절함을 실행 확인)
- **영향**: 죽은 분기가 "이 역할도 지원한다"는 오해를 남겨 이후 수정 시 잘못된 곳을 고치게 만든다.

---

# E축 — 상태·흐름

**소견**: 하나의 구조적 결정에서 파생된다 — **"워크플로우 입력은 휘발성 메모리, 평가 결과는 localStorage"**라는 비대칭. 입력측에는 `rawFile`(File 객체)이 있어 애초에 직렬화가 불가능한데 이를 보완하는 재개·경고·가드가 없다. 그 결과 새로고침·탭 재진입·과거 run 재오픈·task_type 변경이 전부 **"입력은 사라졌는데 화면은 멀쩡하고 다음 버튼은 활성"**으로 수렴한다. 두 번째 축은 **최종 산출물(발급·PDF)이 워크스페이스 존재 여부에 암묵적으로 의존**한다는 점이다.

### [E-01] 워크플로우 입력이 영속되지 않아 새로고침 한 번으로 1~5단계가 전부 소실 — High / 확인됨
- **근거**: `useWorkflowStore.ts:149` — persist 미들웨어 없음 · `:131-147` — `INITIAL_STATE`가 매 로드마다 적용 · `:65` — `rawFile: File | null` (JSON 직렬화 불가 → persist를 붙여도 복원 불가) · 대조군 `useWorkspaceStore.ts:38-39` — 이쪽만 persist
- **오인 강화**: `BasicInfo.tsx:28` — `Save draft` 버튼에 **onClick이 없음(무동작)** · `StepTabs.tsx:33` — 새로고침 직후에도 1~currentStep 탭이 활성으로 보임
- **영향**: 수십 분간 입력한 기업정보·모델정보·임계값을 새로고침 한 번으로 전부 잃는다. 파일은 File 객체라 어떤 경우에도 복원 불가능해 **'중간부터 재개'가 원리적으로 막혀 있다.** 소실을 알리는 유일한 신호는 6단계의 "업로드된 파일이 없습니다" 문구다.

### [E-02] 랜딩의 'Start Evaluation' 진입 시 워크스페이스가 없어 발급·저장·재조회가 모두 불가능 — High / 확인됨
- **근거**: `LandingPage.tsx:57-63` — primary는 `Create Workspace`, 보조가 `Start Evaluation`(→`/app/basic-info`) · `useWorkspaceStore.ts:43` — `activeWorkspaceId` 초기값 null · `DataValidation.tsx:28-42` — activeWorkspaceId가 있을 때만 run 생성, 없으면 `stepToPath(7)` · `useWorkflowStore.ts:36` — `stepToPath(7)`은 항상 `/report/preview` · `useIssuance.ts:73` — `canIssue = id !== "preview" && ...` · `ReportLayout.tsx:84` — preview에서는 발급 버튼 **미렌더**
- **워크플로우 내 워크스페이스 선택 UI 없음** (grep 확인)
- **영향**: 서비스의 존재 이유인 '공식 성적서 발급'이 이 진입로에서 불가능하다. 결과는 화면으로만 보이고, 새로고침하면 백지가 되며, 목록에도 남지 않는다. 반대로 과거에 워크스페이스를 만든 적 있는 사용자는 무관한 평가가 **선택 UI 없이 예전 워크스페이스에 조용히 귀속**된다.

### [E-03] 리포트 새로고침 시 미평가 draft가 안내·재실행 수단 없이 성적서로 렌더 — High / 확인됨
- **근거**: `useReportData.ts:53-56` — `if (id !== "preview" && !workflowState.rawFile) { setData(run?.reportData || null); return; }` — **평가 완료 여부 미검사** (같은 파일 `:36-41`의 캐시 판정은 `isEvaluated`를 요구 → 자기모순) · draft 실체는 `mapWorkflowToFinalReport.ts:92-96` — `kpiResults: []`, `charts: {null,null,null}`, `dataValidation: []` · `Report.tsx:38` — `if (!data) return null;`뿐이라 전 섹션 렌더 · `:385-393` — `isEvaluated=true`는 **LLM 서술 병합 완료 후에만** 기록
- **영향**: LLM 서술은 최대 160초까지 걸리는데(`fetchNarrative.ts:41`) 그 사이 새로고침하면 이 경로로 떨어진다. 사용자는 "지표가 전부 사라진 성적서"를 보고, 원인 안내도 재실행 버튼도 없으며, rawFile이 없으므로 **영구히 복구되지 않는다.**
- **방어되는 부분**: 미평가 draft는 '초안·미발급' 배지 고정 + 발급 버튼 미렌더(`useIssuance.ts:71-73`).

### [E-04] 검증 실패/미수행(`validationData=null`)이 '오류 0건'으로 해석되어 진행이 허용됨 — High / 확인됨
- **근거**: `DataValidation.tsx:20` — `const hasBlockingError = (validationData?.error_count ?? 0) > 0;` — **null → 0건으로 해석** · `:57` — `nextDisabled={hasBlockingError || isLoading}` (error 상태 미반영) · `useDataValidation.ts:50-53` — rawFile 없으면 `setError`만 하고 isLoading도 false
- **성적서 결과**: `mapWorkflowToFinalReport.ts:72-74` — `dataValidation: []`, `validationSummary: undefined` → `DataValidationSection.tsx:100-107` — totalRows가 **사용자 입력 값**으로 폴백, excludedRows 0 → `:93-94` — "**오류 0건 / 경고 0건**" 출력
- **영향**: KS X ISO/IEC TS 4213 성적서의 '데이터 검증' 절이 통째로 비어 있는 문서가 만들어진다. rawFile이 남아 있으면 검증을 건너뛴 채 평가가 실행되어 지표만 있는 성적서가 **발급 가능 상태까지 도달**한다. 검증 단계가 사실상 선택 사항이 된다.

### [E-05] `?showcase=1` 시드가 실제 store에 가짜 기업정보·완료표시를 주입 — Low / 확인됨
- **근거**: `showcaseSeed.ts:13-33·78-92·104` — 실제 store에 `companyName`/`businessNumber` 주입 + `markStepCompleted(1~4)` · `WorkflowShell.tsx:38·45-47` — `location.search`로만 판정 · `StepTabs.tsx:20-23` — `navigate`가 쿼리 미보존 → showcase 해제되지만 **주입된 가짜 상태는 잔존** · `dataValidationShowcase.ts:32-33` — `error_count: 0`
- **완화**: 랜딩 iframe은 `pointer-events: none`(`landing.css:9-12`)이라 그 경로로는 오염되지 않음.
- **영향**: 가짜 사업자등록번호·회사명·조작된 검증 결과표가 실제 성적서 run으로 영속될 수 있다.

### [E-06] `/report/preview`에서 PDF를 누르면 새 탭이 빈 성적서를 만들어 내용 검증 없이 자동 인쇄 — Medium / 확인됨
- **근거**: `usePdfDownload.ts:25` — `window.open('/report/{id}/print')` (별도 JS 컨텍스트) · `useWorkflowStore.ts:149` — 비영속이라 새 탭은 `INITIAL_STATE` · `useReportData.ts:53·59-78` — `id==='preview'`는 조기 반환을 통과, 빈 상태로 baseReport 조립 후 setData · `usePrintOnReady.ts:14-21` — **data 유효성 미검사**, 300ms 뒤 `window.print()`
- **완화**: 평가 완료된 run은 persist 캐시로 새 탭에서도 정상 렌더.
- **영향**: 워크스페이스 없이 진행한 사용자(=E-02 경로)가 PDF를 누르면 신청기관 '—', 샘플수 0, 지표 없음인 껍데기 문서가 곧바로 인쇄 다이얼로그로 뜬다.

### [E-07] PDF 다운로드가 존재하지 않는 엔드포인트를 await한 뒤 catch에서 `window.open` — Medium / 추정
> B축·H축 동일 발견 병합.

- **근거**: `usePdfDownload.ts:13` — `await fetch(apiUrl('/api/reports/${id}/pdf'))` (id는 run-uuid, 성적서 번호도 아님) · `:23-26` — catch 안에서 `window.open` → **사용자 클릭 태스크가 아니라 네트워크 왕복 이후 실행** · `Capstone_Back/app/issuance/router.py` — `pdf` grep 0건(영구 404) · catch 블록에 오류 표시 없음
- **영향**: Render 콜드스타트 시 404 응답까지 수십 초가 걸리고, 그 사이 브라우저의 일시적 사용자 활성화(약 5초)가 만료되어 **팝업이 차단**된다. 사용자는 버튼을 눌러도 아무 일도 안 일어나고 오류 메시지도 없는 상태를 겪는다.

### [E-08] `setTaskType`이 `completedSteps`·`datasetInfo`를 초기화하지 않고, `resetWorkflow`는 호출부가 없음 — Medium / 확인됨
- **근거**: `useWorkflowStore.ts:167-180` — 초기화 대상에 `completedSteps`·`datasetInfo`·`basicInfo` 없음 · `:127·234` — `resetWorkflow` 정의, grep 결과 **호출부 0곳** · `WorkspaceDetail.tsx:36-39` — 'Start Evaluation'이 초기화 없이 이동 · `mapWorkflowToFinalReport.ts:173·208` — 성적서 sampleCount가 초기화되지 않는 `datasetInfo.validationSampleCount`에서 산출 · `workflow.types.ts:20` — `basicInfo.taskType`과 `store.taskType` 이중 보유, setTaskType은 후자만 갱신
- **영향**: 두 번째 평가를 시작할 때 **이전 평가의 데이터셋 정보가 새 모델의 성적서에 인쇄**될 수 있다. 완료 표시가 남아 있어 빈 상태로 뒤 단계 점프도 가능하다.

### [E-09] `loadWorkflowSnapshot`이 rawFile을 null로 두면서 `completedSteps`만 1~6으로 채움 — Medium / 확인됨
- **근거**: `useWorkflowStore.ts:236-253` — `rawFile: null`(243), `validationResult: null`(250), `completedSteps: [1..6]`(252) · `WorkspaceDetail.tsx:41-47` — 파일 재업로드 필요를 고지하지 않음 · `StepTabs.tsx:33` — 4·5·6 자유 이동 · E-04와 결합해 빈 run 생성 가능
- **영향**: "과거 평가를 편집해서 다시 돌린다"는 동선이 성립하지 않고, 워크스페이스 목록에 빈 run이 하나 더 쌓인다.

### [E-10] 워크스페이스 persist에 크로스탭 동기화가 없어 나중 쓰기가 상대 탭의 run을 덮음 — Medium / 확인됨
- **근거**: `useWorkspaceStore.ts:90-115` — persist 옵션에 storage 이벤트 구독·병합 없음 · zustand `middleware.mjs:358-368` — `setItem()`이 현재 메모리 상태 **전체**를 저장, `addEventListener` 0건 · `issuanceApi.ts:128` — `getIssuance` 정의만 있고 호출부 0곳
- **영향**: 성적서 결과의 유일한 저장소가 localStorage이고 탭 간 경합에 무방비다. 발급까지 마친 성적서라도 로컬 기록이 덮이면 **UI 상 되찾을 방법이 없다**(F-04와 결합).

### [E-11] run 하나당 20만 바이트대 metadata가 localStorage에 쌓여 quota 초과 시 조용히 실패 — Medium / 추정
- **근거**: `Capstone_Back/app/analysis/metadata.py:76-97` — 모든 컬럼의 고유값 전량 수집(상한 없음). **실측: 10,000행 이진 데이터 → metadata JSON 228,663 bytes**, `column_unique_values['id']` 10,000개 · `useDataValidation.ts:137` — 전량이 스냅샷에 포함 · zustand `middleware.mjs:358-373` — `setItem`에 try/catch 없음 → `QuotaExceededError`가 액션 밖으로 전파
- 대조군: ROC/PR 곡선은 60점으로 다운샘플링되어 용량 기여가 작다(`binary.py:100-112`). **용량의 주범은 metadata다.**
- **영향**: 5MB 한도 기준 20여 개 run이면 한계에 닿는다. 초과 시 'Run evaluation' 클릭이 아무 반응 없이 실패하고(이벤트 핸들러 예외는 React가 잡지 않음), 리포트 저장 시점이면 **LLM 서술만 조용히 유실**된다.

### [E-12] catch-all 라우트가 없어 미정의 URL이 백지 + 단계 진입 가드 없음 — Low / 확인됨
- **근거**: `routes.ts:20-40` — `'*'` 없음 · `App.tsx:7-11` — fallback 없음 → 미매칭 시 null 렌더 · `WorkflowShell.tsx:40-48` — 선행 단계 완료 여부 미검사 · `ColumnMapping.tsx:150` — 직접 진입 시 빈 상태가 `isValid=true`로 판정
- **영향**: 오타·오래된 북마크로 들어온 사용자는 안내 없는 백지를 만나고 되돌아갈 링크조차 없다. **ErrorBoundary가 없어** 렌더 중 예외 시에도 같은 백지가 되며, 이때 비영속 워크플로우 상태까지 함께 날아간다.

### [E-13] Step5 새로고침 시 매핑 행이 0개인데 프론트가 '유효'로 판정 — Medium / 확인됨
- **근거**: `ColumnMapping.tsx:150` — `isValid`에 **'매핑 행이 하나라도 있는가' 검사가 없음** · `:55·70` — 빈 taskType이 `'multiclass'`로 둔갑해 binary 전용 검사도 건너뜀 · 실제 차단은 전적으로 백엔드(`validator.py:126` → `is_valid=False`) · `pages/ColumnMapping.tsx:27-31` — 실패 처리가 `alert()`뿐
- **영향**: 세션이 날아간 사용자가 네트워크 왕복 후 raw alert 창을 받는다. 무엇을 해야 하는지 안내가 없어 막다른 길에 갇힌다.

### [E-14] `/report/preview`는 마운트할 때마다 평가와 LLM 서술을 다시 실행 — Medium / 확인됨
- **근거**: `useReportData.ts:46-51` — 캐시 히트 조건이 run 존재 + `isEvaluated` · `:386-396` — preview는 스토어 저장을 건너뜀 · `:117·366` — 매 실행마다 `/api/evaluate` + `/api/generate-narrative` · `ReportLayout.tsx:53` — 헤더 뒤로가기가 `navigate(-1)`이라 자연스러운 왕복 동선
- **영향**: LLM 호출이 이동할 때마다 반복되어 비용과 대기(최대 160초)가 발생하고, **같은 데이터의 성적서가 볼 때마다 다른 문장을 갖는다.** E-02 경로 사용자는 항상 여기에 있다.

### [E-15] 평가·검증 요청에 타임아웃·취소·재시도 수단이 없음 — Medium / 확인됨
- **근거**: `useReportData.ts:117` — `fetch(...)`에 `signal` 없음, `:415-417` cleanup은 `active=false`만 · `useDataValidation.ts:90·120-122` — 동일 · 대조군 `fetchNarrative.ts:41-47` — **서술 호출만** AbortController + 160초 타임아웃 · `ReportLoadingState.tsx:14-18` — 진행 단계·경과 시간·취소 수단 없음 · `ReportErrorState.tsx:23-28` — 유일한 액션이 `window.history.back()`, 재시도 없음
- **영향**: 콜드스타트 시 첫 평가는 수십 초 무반응이며 실패인지 대기인지 구분할 수 없다. 재시도하려면 6단계로 돌아가 run을 다시 만들어야 하고(중복 run 누적), 그 사이 새로고침하면 E-01/E-03으로 연쇄된다.

### [E-16] 스텝탭 7번이 영구 비활성이고 `stepToPath(7)`이 실제 run이 아닌 preview를 가리킴 — Low / 확인됨
- **근거**: 코드 전체에 `markStepCompleted(7)` 호출 없음(1~6뿐) · `useWorkflowStore.ts:36` — `if (step === 7) return "/report/preview"` · `WorkflowShell.tsx:41-43` — 6단계 재진입 시 currentStep을 6으로 되돌림
- **영향**: 리포트를 벗어난 사용자가 UI가 제공하는 유일한 복귀 경로로는 성적서로 돌아갈 수 없다.

### [E-17] 인쇄본(PDF)에 화면 성적서의 검증 요약이 전달되지 않음 — Low / 확인됨
- **근거**: `Report.tsx:72-77` — `validationSummary={data.validationSummary}` 전달 vs `ReportPrint.tsx:52-56` — 같은 컴포넌트에 **그 prop 없이** 3개만 전달
- **영향**: 최종 제출물(PDF)이 화면에서 검토한 내용과 다르다.

### [E-18] 컬럼 자동 매핑 요청이 최대 4분 넘게 누적될 수 있고 프론트에 시간 제한이 없음 — Medium / 확인됨
> LLM 사용 지도 작성 중 발견. 상세는 [LLM_BRIEFING.md](LLM_BRIEFING.md) §2-4.

- **증상**: 4단계에서 파일을 올린 뒤 LLM이 응답하지 않으면, 사용자는 취소 수단 없이 수 분간 대기 화면에 갇힌다.
- **근거**
  - `Capstone_Back/app/main.py:47-48` — `timeout=45s`, `max_retries=2` → **한 번의 `create()` 호출이 최대 3회 시도 ≈ 135초+**
  - `Capstone_Back/app/analysis/llm_mapper.py:82-90` — `except Exception:` 이 **스키마 거부뿐 아니라 타임아웃까지** 잡아 두 번째 `create()`를 실행 → 다시 135초+ → **누적 ~270초** 후에야 `analysis_service.py:55-57`의 규칙 폴백으로 강등
  - `Capstone_Front/src/hooks/useColumnAnalysis.ts:32` — `fetch`에 `signal` 없음(AbortController 미사용). 타임아웃·취소·재시도 수단 전무
  - 대조군 `Capstone_Front/src/lib/report/fetchNarrative.ts:41-47` — 서술 호출에는 160초 제한과 abort가 있다. **같은 종류의 방어가 매핑에만 없다**
- **영향**: Render 콜드스타트나 OpenAI 지연이 겹치면 4단계에서 몇 분간 응답이 없고, 사용자는 실패인지 대기인지 알 수 없다. 두 번째 `create()`는 스키마 문제가 아닌 경우 성공 가능성이 거의 없는데도 동일한 대기를 한 번 더 반복한다. (E-15의 자매 항목 — 그쪽은 평가·검증 호출)

---

# F축 — 발급 무결성 · 감사추적

**소견**: 이 서비스의 발급 계층은 **"성적서"를 저장하지 않는다.** 남는 것은 번호·연도·순번·모델명·발급자·시각·비고뿐이고, 성적서의 실체는 전적으로 브라우저 localStorage에 있으며 최종 산출물 PDF도 클라이언트가 그것을 렌더해 인쇄한 것이다. 여기에 두 신뢰 경계가 더 뚫려 있다 — 평가와 발급이 서버에서 연결되지 않고(평가 없이도 정식 번호 발급 확인), 최종 판정이 프론트가 보낸 자유 문자열이다. **번호·판정·내용 셋 중 어느 것도 서버가 책임지지 않는다.**

### [F-01] 발급 DB가 성적서 내용을 하나도 저장하지 않는다 — Critical / 확인됨
- **근거**: `Capstone_Back/app/issuance/models.py:33` — Report 컬럼은 `id/report_no/year/seq/run_id/model_name/model_version/org_id/current_version/created_at`이 전부 · `:62` — Issuance는 `version/issuer/issued_at/note/status`뿐 · `serializers.py:37`·`schemas.py:54` — 응답에도 내용 필드 전무 · 대조군 `Capstone_Front/src/types/finalReport.types.ts:1` — 성적서 실체(FinalReportData)는 수십 필드인데 **서버로 넘어가 저장되는 것은 0개**
- **영향**: 발급된 시험성적서의 진위를 서버가 확인할 수 없다. "RPT-2026-0001의 M1 값이 0.944였는가"에 답할 수 없고, 위조 PDF와 진본을 구분할 수단이 없다. **재현성과 재오픈 복원이 원리적으로 불가능하다.**

### [F-02] 평가와 발급이 결속되지 않음 — 평가 없이도 정식 번호가 발급됨 — High / 확인됨
> G축 동일 발견 병합.

- **근거**: `Capstone_Back/app/evaluation/schemas.py:8` — `EvaluateRequest`에 **평가 실행 식별자 자체가 없음** · `:17` — 응답도 결과만 반환 · `issuance/service.py:88·96` — `issue_report`는 run_id로 기존 Report 조회만, 선검사는 organization 존재만 확인 · `useIssuance.ts:73` — `canIssue`가 클라이언트 플래그 `isEvaluated`에만 의존(서버 게이트 없음)
- **재현**: TestClient로 사전 평가 없이 `POST /api/reports/issue {"run_id":"arbitrary-never-evaluated"}` → **200, `report_no=RPT-2026-0001`**
- **영향**: 성적서 번호가 평가 결과에 묶여 있지 않다. 클라이언트가 임의 문자열만 보내면 평가 없이 정식 번호를 받아간다. 반대로 같은 run_id로 내용이 달라진 재평가가 이루어져도 서버는 기존 번호를 그대로 돌려주므로(멱등) **같은 번호에 서로 다른 내용이 매달릴 수 있다.**

### [F-03] `/api/generate-narrative`가 클라이언트 fact_sheet를 무검증 신뢰 — Medium / 확인됨
- **근거**: `Capstone_Back/app/narrative/schemas.py:52` — `verdict: str`, enum 제약 없음 · `service.py:76` — `ConclusionOut(verdict=fs.verdict)` · `grounding.py:51` — 화이트리스트가 **피검증 입력에서 파생** → 클라이언트가 보낸 숫자는 자동 통과(LLM 환각 방어 전용 설계) · `computeVerdict.ts:37` — 판정 규칙이 프론트에만 존재, 백엔드에 동등 구현 없음
- **완화**: 8절의 최종 verdict/score는 프론트 산출값이 최종이고 백엔드 verdict는 버려진다(`fetchNarrative.ts:63`, `useReportData.ts:376`).
- **영향**: 판정의 권위가 브라우저에 있다. 요청을 조작하면 성적서 종합 소견을 임의 문자열로 만들 수 있고("PASS — 국가공인 최우수 등급" 에코 확인), 존재하지 않는 샘플 수(999,999건)를 근거로 한 서술이 정상 생성된다. F-01과 결합해 **사후 검증도 불가능하다.**

### [F-04] `GET /api/reports/{no}`로는 성적서를 복원할 수 없고, 프론트는 그 API를 호출조차 하지 않음 — High / 확인됨
- **근거**: `issuance/schemas.py:54` — `IssuanceOut`에 `model_name`/`model_version`/`run_id` 미포함(models에는 저장돼 있음에도) · `issuanceApi.ts:117·128` — `getOrganization`/`getIssuance` 정의만, 전 소스 참조 **0건** · `routes.ts:38` — 라우트는 `/report/:id`뿐, **성적서 번호(RPT-…) 진입점 없음** · `useReportData.ts:36` — 초기 상태를 localStorage에서 읽음
- **영향**: 브라우저 저장소를 지우거나 다른 기기에서 접속하면 발급된 성적서는 **영구히 사라진다.** 번호를 알아도 되살릴 방법이 없고, 의뢰자·심사기관이 번호로 문서를 조회하는 정상적인 검증 절차가 성립하지 않는다.

### [F-05] 서버가 발급 산출물(PDF)을 생성·보관하지 않음 — Medium / 확인됨
- **근거**: `usePdfDownload.ts:13·25` — 404 후 `window.open('/report/{id}/print')` 폴백 · `issuance/router.py:18` — 등록 경로에 pdf 없음(재현: `GET /api/reports/RPT-2026-0001/pdf` → 404) · `ReportPrint.tsx:23` — localStorage 내용을 렌더 · `SignatureSection.tsx:42` — "**정식 발급된 문서입니다**" 문면
- **영향**: 같은 번호에 대해 서로 다른 PDF가 얼마든지 생성될 수 있고 어느 것이 진본인지 판별할 기준 문서가 없다. 서명란 문면과 실제 산출 방식이 어긋난다.

### [F-06] 재발급이 무엇이 바뀌었는지 기록하지 않고, `note` 공란도 API로 통과 — Medium / 확인됨
- **근거**: `issuance/service.py:164` — 내용 비교 없이 무조건 버전 bump + 이전 차수 superseded (비교 대상 내용이 서버에 없음 = F-01) · `issuance/schemas.py:43` — `note`에 `min_length` 없음 (재현: `{"note":""}` → 200, history에 공란 비고 기록) · `SignatureSection.tsx:56` — history가 발급 이력 표로 그대로 인쇄
- **완화**: UI는 `note.trim()`으로 공백 차단(`ReportLayout.tsx:42`) → 정상 경로에서는 미발생.
- **영향**: 정정 이력이 "언제·누가·무슨 문구로"만 남고 "무엇이 바뀌었다"가 없다. 수치가 정정됐는지 오탈자가 고쳐졌는지 제3자가 구별할 수 없다.

### [F-07] 채번 연도(UTC)와 성적서에 표기되는 발급일(KST)이 연 경계에서 어긋남 — Medium / 확인됨
- **근거**: `issuance/service.py:99·113` — `year = now.year` (UTC naive), `report_no=f"RPT-{year}-{seq:04d}"` · `serializers.py:34` — `+00:00`으로 방출 · `issuanceApi.ts:54` — `timeZone:'Asia/Seoul'`로 표기 변환
- **영향**: 매년 12/31 15:00~24:00 UTC(= 1/1 00:00~09:00 KST)에 발급하면 **번호는 전년도, 인쇄된 발급일은 새해**가 된다. 연도별 채번 대장 대조 시 문서를 찾지 못한다.

### [F-08] 성적서 4절·서명란의 '평가 엔진 버전'에 사용자가 입력한 **대상 모델 버전**이 인쇄됨 — Medium / 확인됨
- **근거**: `mapWorkflowToFinalReport.ts:163` — `version: basicInfo.versionName` (같은 함수 162행 `targetModel: basicInfo.modelName`과 짝을 이루는 **모델** 정보) · `BasicInfo.tsx:156` — Model information 카드 안의 Version 필드 · `EvalEnvSection.tsx:23`·`SignatureSection.tsx:32` — 둘 다 "**평가 엔진 버전**" 라벨로 출력 · 대조 `Capstone_Front/docs/시험성적서_예시본.md:107` — 예시본은 평가 플랫폼 버전으로 기재
- **영향**: 성적서가 "이 결과는 평가 엔진 vX로 산출되었다"고 주장하는데 그 값이 의뢰자가 자기 모델에 붙인 버전이다. **서명란(공식 증빙 영역)에 사실과 다른 항목이 인쇄된다.**

### [F-09] 평가 수행 환경(라이브러리 버전·평가 일시)이 실제와 다른 하드코딩 값 — Medium / 확인됨
- **근거**: `reportConstants.ts:26` — `["Python 3.11", "scikit-learn 1.4.0", "pandas 2.2.0", "numpy 1.26.0"]` 고정 vs 실제 `requirements.txt:4,8,9` — pandas 2.2.3 / scikit-learn **1.9.0** / numpy 2.5.1, `render.yaml:16` PYTHON_VERSION 3.12.13 · `EvalEnvSection.tsx:32-33` — 평가 일시가 날짜에 `09:00 KST`/`18:00 KST`를 문자열로 덧붙인 값 · `mapWorkflowToFinalReport.ts:122` — 실제 평가 시각 미기록
- **영향**: 지표 값은 scikit-learn 버전에 따라 달라질 수 있는데 성적서는 **실제로 쓰이지 않은 버전**을 산출 환경으로 명시한다. 재현 시도자는 명시된 환경으로 같은 숫자를 얻지 못한다.

### [F-10] 수행기관 기본값이 프론트 상수와 DB 시드에 이중 정의 — Low / 확인됨
> B축 동일 발견 병합.

- **근거**: `reportConstants.ts:11` `DEFAULT_PERFORMER` 하드코딩 → `mapWorkflowToFinalReport.ts:79` · `issuanceApi.ts:117` `getOrganization()` 참조 0건 · `issuance/bootstrap.py:15` — DB 시드가 프론트 상수와 동일 값(주석도 인정)
- **완화**: 발급 완료 시 서버 organization으로 교체되므로 상수는 '초안 — 미발급' 문서에만 노출.

### [F-11] 마이그레이션 도구 부재 — 스키마 변경 시 `create_all`로는 기존 Neon 테이블을 갱신할 수 없음 — Low / 추정
- **근거**: `app/core/database.py:96` — `Base.metadata.create_all`이 스키마 관리의 전부 · `docs/ISSUANCE_DB_DESIGN.md:223·244` — "마이그레이션 도구 없이 시작", "현재는 과함"으로 의식적 선택 기록 · alembic 관련 파일 0건
- **영향**: **F-01을 고치려면 report 테이블에 컬럼을 추가해야 하는데**, 이미 Neon에 테이블이 있으므로 배포해도 스키마가 바뀌지 않는다. 앱은 정상 기동한 뒤 첫 쿼리에서 죽는다. 즉 **무결성 결함 수정 자체가 배포 사고를 동반한다.**

### [F-12] 동시 채번 직렬화가 프로덕션(PostgreSQL)에서는 미적용 — Low / 추정
- **근거**: `app/core/database.py:66` — `if _IS_SQLITE: configure_sqlite(engine)` → Postgres에서는 BEGIN IMMEDIATE/busy_timeout **미등록** · `issuance/service.py:62` — `_next_seq`가 잠금·시퀀스 없이 `MAX(seq)+1` · `:103` — 재시도 5회, 백오프 없음 · `service.py:4` — docstring이 SQLite 기준 동시성만 서술
- **검증 공백**: `tests/test_issuance.py:251·286`의 동시성 테스트는 SQLite 파일 엔진 경로만 검증(H-06).
- **영향**: 동시 발급이 몰리면 UNIQUE 충돌 재시도가 반복되고, 5회 내 수렴하지 못하면 정상 사용자가 409로 발급에 실패한다.

---

# G축 — 보안 · 운영

**소견**: "공인 성적서를 발급하는 기관"의 외형을 갖추고 공개 인터넷에 배포되어 있지만, **인증·인가·레이트리밋·입력 크기 경계가 코드 전 계층에 단 한 줄도 없다.** 뿌리는 "브라우저 하나 = 신뢰할 수 있는 사용자 하나"라는 암묵 가정이다. 무인증 자체는 설계 문서가 이미 인지·수용한 리스크(`ISSUANCE_DB_DESIGN.md:245`)이므로, 아래는 그 위에서 **미인지 상태로 남아 있는 결과들**을 중심으로 정리했다.

> 기각된 항목: CORS `allow_origins=["*"]` — `allow_credentials` 미설정(기본 False)이고 이 API에 세션·쿠키가 없어, CORS가 새로운 권한을 주지 않는다. 공격자는 브라우저를 경유할 이유 없이 curl로 동일 호출이 가능하다.

### [G-01] 무인증 `PUT /api/organization` 한 번으로 이미 발급된 **모든** 성적서의 기관 표기가 소급 변경 — High / 확인됨
> F축 '발급 시점 스냅샷 부재'와 병합.

- **근거**: `issuance/serializers.py:45` — `issuance_out()`이 매 조회마다 **현재 singleton 행**을 조립(발급 시점 스냅샷 없음). 반면 `signature.issuer`는 `models.py:71`에 스냅샷됨 → **한 문서 안에서 두 값이 다른 시점을 가리킴** · `service.py:198-209` — 호출자 신원 개념 없음 · `router.py:31-35` — 인가 검사 0줄
- **재현**: 발급 → `PUT /api/organization {"org_name":"HACKED","evaluator":"attacker"}` 200 → `GET /api/reports/RPT-2026-0001`의 organization이 HACKED/attacker로 변경(issuer는 원래 값 유지)
- **영향**: `curl` 한 줄로 발급기관명을 바꿀 수 있고 그 순간 **이미 발급된 전체 성적서의 발급기관 표기가 함께 바뀐다.** 재오픈·재인쇄 시 1절 수행기관과 서명란 발급기관이 서로 다른 기관명을 표시해 문서가 모순된 상태로 출력된다.

### [G-02] 순차 채번된 번호만 알면 무인증으로 남의 성적서에 강제 재발급 이력을 남길 수 있음 — High / 확인됨
- **근거**: `issuance/service.py:113` — `RPT-{year}-{seq:04d}` (랜덤성 0, **전수 열거 가능**). 반면 멱등 키 `run_id`는 `crypto.randomUUID`라 추측 불가 → **외부 노출 식별자만 취약** · `router.py:55-65·68-76` — 소유권/인가 검증 없음, GET도 동일해 열거로 issuer·issued_at·전체 note 이력 노출 · `service.py:172-183` — 이전 차수 `superseded` 후 공격자 note를 담은 행 append
- **재현**: reissue 200, version v1.0→**v1.1**, history에 `'attacker forced reissue'` 기록
- **영향**: 정상 사용자가 재오픈한 성적서에 자신이 요청한 적 없는 정정 이력(공격자가 쓴 사유 문구 포함)이 `SignatureSection.tsx:56-70`을 통해 표시된다. 원래 발급본은 무효(superseded)로 표시된다.

### [G-03] OpenAI 과금 엔드포인트 2개가 무인증·무제한 — High / 확인됨
- **근거**: `analysis/router.py:49-51` — `await file.read()` 앞뒤 크기 검사 없음(빈 파일 검사가 유일) · `prompt_builder.py:49-55` — **모든 컬럼**에 대해 값 5개를 절단 없이 연결(컬럼 수 상한 없음, 샘플 행만 `df.head(30)` 제한) · `narrative/schemas.py:48-49` — `FactSheet.metrics`/`per_class`가 상한 없는 list, `prompt.py:46` — 전체 `json.dumps` · `narrative/router.py:26-32` — **파일 업로드조차 불필요한 순수 JSON 경로** · `analysis_service.py:55-57`·`narrative/service.py:53-54` — LLM 실패 시 예외 없이 규칙 폴백 200 → **남용이 사용자에게도 서버 로그에도 드러나지 않는다**
- **영향**: 제3자가 인증 없이 프로젝트 OpenAI 계정에 과금을 발생시킬 수 있고, 스크립트 하나로 지속 가능하다. 키 소진 시 정상 사용자는 규칙 폴백으로 조용히 강등되어 성적서 품질이 저하되지만 그 사실이 기록되지도 않는다(G-07).

### [G-04] 업로드 크기 상한 없음 + CPU 바운드 작업이 async 핸들러에서 스레드풀 오프로드 없이 실행 — High / 확인됨
- **근거**: `evaluation/router.py:30·57` — `async def` 안에서 동기 CPU 함수 `run_evaluation_pipeline`을 `run_in_threadpool` 없이 직접 호출. 같은 패턴이 `validation_router.py:32·54`, `analysis/router.py:34·55` · 세 라우터 모두 Content-Length/행수/컬럼수 검사 없이 빈 파일 검사만 · 단일 워커 근거는 uvicorn 기본값(`--workers` 미지정 시 1) + free 플랜(0.1 CPU)
- **정정**: 핸들러가 `async`인 것 자체는 정당(`await file.read()`, `await` LLM). 결함은 **CPU 구간 오프로드 부재**이지 async 선언 실수가 아니다.
- **영향**: 사용자 A의 평가가 도는 동안 사용자 B는 화면 전체가 멈추고, **Render 헬스체크도 같은 이유로 타임아웃되어 인스턴스가 재시작될 수 있다.** 30~40MB CSV만으로 512MB 한도를 넘겨 OOM kill이 나면 진행 중 모든 요청이 유실된다. 인증이 없으므로 둘 다 익명 요청으로 유발 가능.

### [G-05] grounding이 숫자 토큰만 대조해 수치 없는 정성 서술은 무조건 통과 — Medium / 확인됨
- **근거**: `narrative/grounding.py:24·110-127` — `_NUMBER_RE`로 뽑은 숫자만 화이트리스트와 대조. 숫자 없는 텍스트는 `checked=0, passed=True` · `service.py:68` — `if not grounding.passed`가 유일한 출력 게이트 · `prompt_builder.py:54`·`prompt.py:46` — 컬럼명·셀값·fact_sheet 문자열이 절단·이스케이프 없이 프롬프트에 삽입
- **완화**: strict json_schema로 출력 구조 고정, verdict 서버 강제, 과장 금지 규칙 명시(`prompt.py:19-24`). 프론트에 `dangerouslySetInnerHTML`이 없어 XSS로 번지지 않고, 서버에 저장되는 본문이 없어 타인 산출물 오염 경로도 없다.
- **영향**: "국내 최고 수준", "즉시 상용 배포 가능" 같은 **수치 없는 허위 단정은 위반 0건으로 통과**한다. 지표는 fail인데 서술은 극찬하는 성적서를 만들 수 있고, `meta.source`는 여전히 `"llm"`로 표기된다.

### [G-06] 실패 경로가 구조화 로그를 남기지 않아 사후 원인 추적 불가 — Low / 확인됨
- **근거**: `narrative/service.py:53-54` — LLM 실패 시 **로그 없이** 폴백 · `:68-71` — grounding 위반 시에도 로그 없이 폴백(추적성은 응답 body의 `meta.grounding`에만) · `evaluation/router.py:58-60` — 예외 원인 미기록 · app/ 전체에 `print(` 6건, `logging` 사용은 `narrative/service.py:87` 한 지점
- **영향**: Render 무료 티어의 stdout은 휘발성이고 검색·알림이 없다. "성적서 숫자가 이상하다"는 제보가 와도 언제 어떤 요청에서 LLM이 폴백됐는지 재구성할 수 없다. **위의 과금 남용·기관 변조·강제 재발급이 실제로 발생해도 탐지 자체가 불가능하다.**

### [G-07] `DATABASE_URL`이 없으면 예외 없이 휘발성 SQLite로 강등되고 기동을 계속 — Medium / 확인됨
- **근거**: `app/core/database.py:19` — 환경변수 부재 시 오류 없이 로컬 파일 DB로 폴백 · `app/main.py:30-32` — backend 종류를 print만 하고 기동 계속, **프로덕션 가드 없음** · `docs/DEPLOYMENT_PLAN.md:316` — "3중 방어: sync:false + 기동 로그 + Neon 테이블 확인"인데 1번 방어의 근거인 `render.yaml` envVars는 이 서비스가 대시보드 수동 생성이라 적용 여부가 불확실(`render.yaml:12-13`이 최소한 startCommand는 미적용임을 자인)
- **영향**: 환경변수가 지워지면 서버는 **오류 없이** 기동해 휘발성 SQLite로 동작한다. 채번 시퀀스가 초기화되어 `RPT-2026-0001`이 서로 다른 사용자에게 중복 발급되고, 재시작마다 전체 발급 이력이 소실된다.

### [G-08] 같은 잘못된 업로드가 라우터마다 다른 상태코드·문구로 거절됨 — Low / 확인됨
> D축 동일 발견 병합.

- **근거**: `analysis/router.py:22·42-46` — `ALLOWED_EXTENSIONS` 사전 검사 → 400 + 한국어 안내 vs `evaluation/router.py:40-44`·`validation_router.py:41-45` — 검사 없이 파일 전량을 읽은 뒤 파싱 예외를 422로, **내부 예외 문자열을 그대로 노출** · 빈 파일 검사만 세 라우터에 복제되고 확장자 규칙은 전파되지 않음
- **영향**: 안내가 일관되지 않고, 후자는 거대한 파일을 메모리에 다 올린 뒤에야 거절한다.

---

# H축 — 테스트 커버리지 · 문서 정합성

**소견**: 이 프로젝트의 "81 passed / 8 passed / 녹색 CI"는 **성적서 숫자에 대해 아무것도 보증하지 않는다.** 지표 테스트는 결과가 float이고 [0,1]인지만 단정하고, 픽스처는 전부 무작위 노이즈이며, golden 스냅샷은 오라클이 아니라 현행 출력의 복사본이라 A축이 찾은 오류가 오히려 "정답"으로 고정되어 있다. 프론트는 성적서 숫자를 만드는 1,100여 줄에 테스트가 0이다. 문서 쪽은 "완료된 것을 미완이라 적은 설계문서"와 "실제와 다른 배포 URL·방식", SSoT 자체의 단계 번호 혼선이 겹쳐, 다음 사람이 문서를 믿고 시작하면 **틀린 지도를 들고 출발한다.**

### [H-01] 지표 M1~M23 중 값의 정확성이 검증되는 지표가 **0개** — Critical / 확인됨
- **근거**
  - `Capstone_Back/tests/test_evaluator.py:32` — `assert_valid_results()`의 단정 전부: `val is not None`, `not math.isnan(val)`, `0.0 <= val <= 1.0`. **기대값 비교가 한 줄도 없다**
  - `:130` — binary/multiclass/multilabel 3개 엔진 테스트가 모두 이 함수만 호출
  - `tests/data/binary/binary_test_data_200.csv` — 실행 확인: `(y_true==y_pred).mean()=0.505`, `corr(score, y_true)=0.0244` → **점수와 정답이 무상관인 동전던지기 데이터**
  - `tests/data/multiclass/multiclass_200.csv` — accuracy 0.335 (3클래스 우연 수준)
  - `tests/golden/evaluate_binary_csv.json` — 고정된 골든이 M1=0.505, M9=0.5112, M2=0.4815… **전부 무작위 기준선**. 계산이 뒤바뀌어도 이 범위를 벗어나지 않는다
- **영향**: 23개 지표 중 어느 하나라도 공식이 틀렸을 때 이를 잡아낼 자동 검사가 존재하지 않는다. **A축·C축이 찾은 결함들이 왜 배포까지 살아남았는지에 대한 답이다.**

### [H-02] golden 스냅샷에 A-08의 오류값이 기대값으로 고정되어 있음 — Medium / 확인됨
- **근거**: `tests/golden/evaluate_multilabel_csv.json` — M2=`0.4906396261785457`이 같은 파일의 M22 `"macro avg".precision`과 **16자리 일치**, `"samples avg".precision`(0.495)과 불일치 → **A-08(multilabel sample 평균 미사용)이 기대값으로 승격** · `golden_utils.py:41` — 파일이 없으면 현재 응답을 그대로 써서 통과시키는 부트스트랩 · `:51-54` — 불일치 시 메시지가 **최상위 키 목록만** 출력, 어떤 지표가 얼마나 달라졌는지 미표시
- **영향**: 지표 계산을 수정하면 골든이 "회귀"라며 실패한다 — **버그를 고치는 쪽이 CI를 깨는 구조다.** 반대로 `UPDATE_GOLDEN=1`로 갱신하면 어떤 변화든 무비판적으로 승인된다.
- **참고**: 도구 목적이 characterization(동작 불변 보증)으로 명시돼 있어 문서상 오해 소지는 없다.

### [H-03] 프론트 성적서 변환 계층 약 1,100줄에 단위 테스트 0 — Medium / 확인됨
- **근거**: 실행 확인 — vitest 3파일 8테스트(smoke 1 + computeVerdict 5 + evaluateStatus 2) · 무테스트 대상: `useReportData`(421줄), `mapWorkflowToFinalReport`(382줄), `buildFactSheet`(176줄), `mapValidationResultToReport`(85줄), `buildDatasetDiagnosis`(70줄), `translateRoleToBackend/Frontend`(47줄) · `docs/FRONTEND_DEVELOPMENT_GUIDELINE.md:48` — "`src/lib/`은 관련 단위 테스트를 코로케이션합니다" 규칙, **lib 모듈 13개 중 2개만 준수**
- **참고**: 합불 판정 자체(`computeVerdict`)는 D4 unavailable 처리·핵심지표 미달까지 5건으로 검증됨.
- **영향**: 백엔드가 정확한 값을 줘도 프론트 변환에서 값이 뒤바뀌면 아무 검사도 걸리지 않는다. **B-01·B-02·C-06·C-08이 정확히 이 공백에서 나왔다.**

### [H-04] API 계약 검증이 OpenAPI 경로 집합 비교 1줄뿐 — Medium / 확인됨
- **근거**: `tests/test_route_contract.py:24` — `assert set(app.openapi()["paths"].keys()) == EXPECTED_PATHS`가 전부(파일 총 24줄). **메서드·request body·response model 미비교** · `useReportData.ts:128` — `await response.json()` (암묵 any) → `:145` `result.results.success_metrics` 무검증 접근 · `useColumnAnalysis.ts:44` 동일 · `package.json:7-13` — e2e/playwright/cypress 없음
- **참고**: `issuanceApi.ts:121·132·152·167`은 `mapOrganization`/`mapIssuance`로 키를 명시 매핑하고 기본값 방어까지 한다(모범 사례).
- **영향**: 백엔드가 응답 키를 바꾸면 **양쪽 CI가 모두 초록인 채 배포**되고, 사용자 화면에서 KPI가 전부 0/undefined로 렌더된다.

### [H-05] 로컬 pytest가 프로젝트 venv 없이 전역 anaconda에서 실행됨 — Medium / 확인됨
- **근거**: `requirements.txt` 핀 fastapi 0.115.12 / pandas 2.2.3 / scikit-learn **1.9.0** / numpy 2.5.1 vs 실행 확인 — **1.5.1 / 1.26.4 / 2.2.2 / 0.138.0**, 인터프리터 `/opt/anaconda3/bin/python3`(3.12.7), `Capstone_Back`에 `.venv` 없음 · `golden_utils.py:25` — `round(o, 6)` 비교라 버전 차이에 민감 · `requirements-dev.txt:4-5` — pytest 미핀, lock 파일 없음
- **참고**: CI는 `requirements-dev.txt`(핀 포함) 설치 후 실행하므로 **배포 조합 자체는 CI가 검증한다.**
- **영향**: 개발자가 로컬에서 본 초록은 배포 조합에 대한 증거가 아니다. sklearn 1.5→1.9 사이 동작 차이가 있으면 CI에서만 골든이 깨지거나 프로덕션 숫자가 로컬과 달라진다.

### [H-06] PostgreSQL 경로가 테스트·CI 어디서도 실행되지 않음 — Low / 확인됨
- **근거**: `tests/test_issuance.py:28-33` — `create_engine("sqlite://")` + `configure_sqlite`, `:251·288` 동시성 테스트도 SQLite 파일 엔진. **tests/ 전체에 `postgresql` 문자열 0회** · `ci.yml:33` — 부팅 스모크도 `sqlite:///./ci-boot.db` → `pool_pre_ping`/`pool_recycle`·psycopg2 경로 미실행
- **참고**: 멱등 재확인 + 재시도 루프와 UNIQUE 제약은 DB 비종속이므로 Postgres에서도 중복 채번은 막힌다.
- **영향**: F-12의 동시성 문제가 **프로덕션에서만 나타날 수 있고 로컬·CI 어디서도 미리 드러나지 않는다.**

### [H-07] `/api/confirm-mapping`과 `available_metric_ids` 산출 로직에 단정이 하나도 없음 — Medium / 확인됨
- **근거**: `tests/test_route_contract.py:11` — tests/ 전체에서 `"/api/confirm-mapping"`이 등장하는 유일한 위치(경로 집합 비교용). **TestClient로 호출하는 테스트 없음** · `validator.py:192` — `available_metric_ids` 계산부, 이 변수명으로 tests/ grep 시 **0건** · `tests/test_validator.py:66` — 2개 테스트는 컬럼 충돌만 확인하고 반환 목록은 보지 않음 · `PUT /api/organization`도 미검증
- **영향**: Step5에서 사용자를 통과시킬지 막을지, 어떤 지표를 계산 가능하다고 알려줄지 결정하는 로직이 **무검증 상태**다. A-02·A-12가 여기서 나왔다.

### [H-08] 배포 게이트가 "Deploy Hook 호출 성공"에서 끝남 — Medium / 확인됨
- **근거**: `Capstone_Back/.github/workflows/ci.yml:67-68` — deploy 잡 마지막이 `curl -fsS -X POST "$RENDER_DEPLOY_HOOK"`, **이후 검증 스텝 없음** · `:31-44` — 유일한 기동 스모크는 배포 전 CI 러너 내부 uvicorn 대상 · `Capstone_Front/.github/workflows/ci.yml:49-55` — 포크 푸시로 종료, **Vercel 빌드 결과 미확인** · 실서비스 URL에 대한 배포 후 확인 없음
- **영향**: 핀 불일치나 requirements 해석 차이로 Render 빌드가 깨져도 팀은 **CI 초록만 보고 배포됐다고 판단한다.** 실제로는 이전 버전이 떠 있거나 서비스가 내려간다.

### [H-09] 백엔드 설계 3문서의 '상태' 헤더가 구현·배포 이전에서 멈춰 있음 — Low / 확인됨
- **근거**: `docs/ISSUANCE_DB_DESIGN.md:7` — "상태: **설계 계획(구현 전)**" vs 3테이블·5엔드포인트·18건 테스트 통과 · `docs/DEPLOYMENT_PLAN.md:5` — "계획 확정, 구현 착수 전" vs render.yaml 실재 + deploy 잡 운영 · `docs/REPORT_NARRATIVE_DESIGN.md:5·350` — "잔여: P2-11 조직/발급 메타 DB … 🔜 예정" (이미 완료)
- **영향**: `PROJECT_OVERVIEW §5`가 이 3문서를 "해당 작업 시 읽을 문서"로 지정하고 있어, 새 개발자가 **이미 존재하는 테이블·엔드포인트를 다시 만들거나 "DB 없음" 전제로 설계**하게 된다.

### [H-10] 배포 URL과 배포 방식 서술이 실제와 다름 (9곳) — Medium / 확인됨
- **근거**: `docs/DEPLOYMENT_PLAN.md:73·211·230·277·278·280·307` + `Capstone_Front/src/lib/apiBase.ts:3` + `src/vite-env.d.ts:4` — 모두 `https://capstone-back.onrender.com` (**실제는 `capstone-back-59z8.onrender.com`**) · `DEPLOYMENT_PLAN.md:33·75` — "main 푸시마다 자동 배포되는 표준 구성" vs 실제 `autoDeploy: false` + 포크 미러 + Deploy Hook. **문서 전문에 '포크'·'Deploy Hook' 언급 0회**
- **영향**: 문서 체크리스트를 그대로 따르면 존재하지 않는 호스트로 헬스체크·CORS 확인·uptime 모니터를 걸게 된다. 배포가 안 될 때 원인을 엉뚱한 곳에서 찾는다.

### [H-11] 성적서 데이터 경로 3개 파일의 헤더 주석이 존재하지 않는 MOCK을 설명 — Low / 확인됨
- **근거**: `useReportData.ts:5` "현재는 MOCK_FINAL_REPORT fallback" (실제 `:54`는 `setData(run?.reportData || null)`) · `mapWorkflowToFinalReport.ts:5`, `mapValidationResultToReport.ts:6` 동일 · grep 결과 해당 심볼 정의 0건, `mockReport.ts` 파일 없음
- **영향**: 성적서에 가짜 수치가 남아 있다고 오인하게 만들어 **이미 해결된 문제를 다시 파고들게** 한다.

### [H-12] SSoT인 SPEC.md의 단계 번호가 실제와 어긋나고 `latency` 역할이 §0 표에서 누락 — Low / 확인됨
- **근거**: `SPEC.md:128·203·210` — 컬럼 매핑을 "Step 4", 데이터 검증을 "Step 5(기존 Step 7)"로 표기 vs 실제 5·6단계(`README.md:29-30`, `routes.ts:29-30`). **한 문서에 최소 세 가지 번호 체계** · `SPEC.md:15-23` — 표준 역할 표에 `latency` 없음 vs `core/schemas.py:36` 3개 task 모두 유효 역할 + `translateRoleToBackend.ts:12` 변환 지원 + `validation_checks.py:379` 전용 검증
- **영향**: "지표/컬럼/검증 관련이면 반드시 SPEC.md 먼저"라는 규칙을 따르는 사람이 **잘못된 단계에 검증 로직을 넣거나, `latency`를 미승인 확장으로 오해해 제거하려 들 수 있다.**

### [H-13] `PROJECT_OVERVIEW.md`(새 세션 최우선 문서)의 경고 3건이 스스로 stale — Low / 확인됨
- **근거**: `:56·124` "백엔드 README는 2줄 stub" → 실제 42줄 온보딩 문서(커밋 `e2a42d3`) · `:130` "프론트 README 구조 설명은 stale" → 실제 디렉토리와 일치(커밋 `67f3d0c`) · `:20` "`validator._TC_REQUIREMENTS` 등 옛 TC 표기 흔적" → grep 결과 **0건**, 현재는 `METRIC_REQUIREMENTS`
- **영향**: 진입 지도가 "이 문서는 믿지 말라"고 잘못 표시해 정확한 README를 건너뛰게 만들고, 존재하지 않는 심볼을 찾게 한다. **지도 문서의 신뢰도 자체를 떨어뜨린다.**

### [H-14] 프로덕션 경로에 남은 미완 표식·죽은 코드 — Low / 확인됨
- **근거**: `usePdfDownload.ts:12-13` — `// TODO: replace with actual API call` 바로 아래 영구 404 엔드포인트 호출 · `evaluationData.ts:190` — `getMetricDisplayId`가 **입력을 그대로 반환하는 항등 함수**인데 8곳에서 호출(TC→M 이름 변경의 잔재) · `:219·248` — `getUploadColumnGuide`(36줄)·`getProbabilityColumnLabel` 참조 0건, **게다가 여기에도 "id, y_true는 항상 필수"라는 컬럼 규칙 사본이 들어 있다(A-03의 5번째 사본)** · `useWorkflowStore.ts:22` — `STEP_PATHS` export되었으나 외부 소비자 없음
- **영향**: 죽은 규칙 사본이 남아 있어 지표→필수컬럼 규칙 수정 시 놓치기 쉽다.

### [H-15] 라이선스 표기 불일치 및 생성기 기본 문구 잔존 — Low / 확인됨
- **근거**: `LICENSE:1-3`(양쪽) — MIT, Copyright **hwanginyong02** vs `README.md:125`·`Capstone_Back/README.md:42` — "© 2026 **서울과학기술대학교**" · `Capstone_Front/ATTRIBUTIONS.md:1-3` — "This **Figma Make** file includes … photos from Unsplash" (grep 결과 unsplash 사용 0건). `Capstone_Back/ATTRIBUTIONS.md`는 없음(scikit-learn/FastAPI 등 고지 없음)
- **참고**: `.DS_Store`·`dist`·`.env`는 git 추적되지 않아 문제없음.
