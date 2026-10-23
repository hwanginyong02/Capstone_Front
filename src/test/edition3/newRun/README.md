# 판 3 새 성적서 생성 경로 정답 (판 4 라운드 S0, 계획 2.5-2)

플래그를 끈(기본값) 상태에서 **새 성적서를 만들 때** 앱이 저장하는 데이터와 서술 작업 요청 본문을 글자 그대로 고정한다.
판 4 코드가 들어와도 판 3 새 성적서는 한 글자도 바뀌지 않아야 한다.

> **정답을 다시 뜨는 것은 붉은 신호다. 이 시험이 실패하면 코드를 고친다.**
> 정답을 다시 떠야 통과한다면, 그 변경이 판 3 성적서를 바꿨다는 뜻이다.

## 무엇을 보나

`newRunFlagOff.test.tsx` 가 세 입력(이진 `bc_strong`, 다중 `digits_strong`, 멀티레이블 `yeast_strong`)마다:

1. 워크플로우 스토어를 입력으로 채우고, 검증 화면 "다음"(`pages/DataValidation.tsx` `handleNext`)과 같은 운영 함수로 run 을 만든다
   (생성 전 안내 확인 기록 → `buildReportInput` → `mapWorkflowToFinalReport(…, 검증 응답)` → `ensureActiveWorkspace` →
   `addEvaluationRun` + `buildEvaluationRequestSnapshot`).
   1층 빈칸 검사는 하지 않는다 — 입력은 판 3 발급본을 만든 픽스처 그대로라 목표값 없는 정보 제공 지표(M2·M10·M23 등)가 있다.
2. 실제 `<Report />` 를 `/report/:id` 에 그린다. 앱이 스스로 `POST /api/evaluate`, `POST /api/narrative/jobs`, 작업 조회(GET)를
   부른다. fetch 만 가짜다(`newRun.harness.tsx`).
3. 세 가지를 정답과 `toBe` 로 비교한다.
   - `golden/<tag>.stage1.json` — 서술 대기 중 저장된 1단계 성적서(`storedRun().reportData`, 키 정렬 직렬화).
   - `golden/<tag>.narrativeRequest.json` — `POST /api/narrative/jobs` 본문 **원문**(앱이 보낸 글자 그대로, 줄바꿈 없음).
   - `golden/<tag>.final.json` — 서술 완료(센티널 글)를 병합한 뒤 저장된 성적서(키 정렬 직렬화).
4. 덧붙여: 앱이 보낸 평가 요청이 실측 `payload.json` 과 같다(입력 재구성 확인), 저장한 다시 만들기 요청 = 보낸 본문,
   요청에 `report_edition` 이 없고 `contentSchema` 는 3이다, `golden/` 의 파일 목록·sha256 이 `golden/SHA256SUMS` 와 같다.

시각은 `vi.useFakeTimers({ toFake: ["Date"] })` + `vi.setSystemTime(new Date(2026, 9, 22, 18, 45))`(로컬 시각 생성자)로 멈춘다.
Date 만 멈추므로 조회 setTimeout 은 진짜로 돈다. 시간대는 시험 동안 `Asia/Seoul` 로 고정한다 — 생성 전 안내 확인 기록
(`materialCheck.acknowledgement.at`)이 ISO(UTC) 글이라 기계 시간대(CI 는 UTC)에 따라 달라지기 때문이다. `TZ=UTC` 로 돌려도 같다.

## 입력(`inputs/`)과 출처

| 파일 | 출처 |
|---|---|
| `<tag>.state.json` | 지난 라운드 C 세션 픽스처(`c_build_requests.test.ts` 의 FIXTURES = 판 3 발급본 6건을 만든 입력)를 스토어 상태로 옮긴 것. 매핑은 `<tag>.payload.json` 의 `column_mappings` 를 프론트 역할로 되돌림(sample_id→id, score_positive→score, prob_per_class→prob_class_*, true_labels→y_true, score_per_label→prob_label_*), `metadata`·`selected_metric_ids`·`decision_threshold` 도 payload 값. 목표값은 FIXTURES `targets`(목표 없는 지표는 정보 제공). 신청인·사업자번호·연락처·주소·의뢰일(2026-10-22)은 판 3 발급본 RPT-2026-0001~0006 의 `applicant`·`meta.contractDate`. 파일은 지문만(이름·바이트 수·수정 시각) — 시험은 같은 바이트 수의 빈 바이트 파일을 쓴다(앱은 이 경로에서 파일 내용을 읽지 않는다). |
| `<tag>.payload.json` | 실측 평가 요청(C 세션이 백엔드 엔진으로 평가할 때 쓴 것) 사본. |
| `<tag>.evaluate.json` | 실측 평가 응답(같은 C 세션, 키 없는 백엔드 엔진) 사본. |
| `<tag>.validate.json` | 운영 백엔드 main(a7d3168)을 `git archive` 로 풀어 FastAPI TestClient 로 `POST /api/validate-data` 에 실측 CSV + payload 를 보낸 응답. |
| `<tag>.jobs.json` | 서술 작업 응답(생성·진행·완료). `benchmark_refs` 는 같은 입력의 판 3 발급본(bc_strong=RPT-2026-0001, digits_strong=RPT-2026-0003, yeast_strong=RPT-2026-0005)의 `conclusion.benchmarkRefs` 를 백엔드 모양(snake_case)으로 되돌린 값. 서술 칸은 `[S0 센티널 …]` 글, 칸 출처는 7칸 모두 llm. |

실측 CSV(저장소에 두지 않음): bc_strong.csv 3,727바이트 sha256 `4ead9f2ccc8da32c0c3148f02ea6ff4e030c156d9873eeb99883df73f3a49f9d`,
digits_strong.csv 43,332바이트 `e92372fe028dc722132977c87a56929bc0933c3a28a4e6277bcd2dba8e3d66d4`,
yeast_strong.csv 123,672바이트 `0db2f6db36743028b268e01ad2d75aa8b0b5700e5cb632e56fefaebc53e145b8`.

### 재구성 확인(정답을 뜰 때 한 번 본 것)

- 세 입력 모두 서술 요청 본문(파싱 값)이 지난 라운드에 같은 입력으로 만든 요청 본문(c_요청 `<tag>.request.json`)과 **차이 0**.
- 서술 완료 뒤 저장 데이터를 판 3 발급본과 비교하면 차이는 서술 칸(센티널), `evalEnv.environment.evaluated_at`(평가 응답 값),
  `materialCheck.acknowledgement.at`·인쇄 요약의 확인 시각(멈춘 시각)뿐이다. 그 밖에 digits_strong 은 발급본에만
  `evalScope.projectInfo` 가 있고(브라우저에서 과제 정보를 넣음), yeast_strong 은 레이블 순서가 다르다(발급본은 브라우저의 컬럼 분석
  순서, 여기서는 payload 의 `detected_labels` 순서). 판 4 RPT-0001 대조(계획 6.1)는 이 차이를 따로 맞춘다.

## 정답을 다시 뜨는 법(붉은 신호 — 먼저 코드를 의심한다)

정답은 **운영 main 코드**로 뜬다. 이 저장소의 지금 코드로 뜨지 않는다.

```sh
# <scratch> 는 저장소 밖 빈 폴더
git -C <저장소> archive origin/main | tar -x -C <scratch>/main_src
ln -s <저장소>/node_modules <scratch>/main_src/node_modules
mkdir -p <scratch>/main_src/src/test/edition3/newRun
cp -R <저장소>/src/test/edition3/newRun/{inputs,newRun.harness.tsx,generate.test.tsx} <scratch>/main_src/src/test/edition3/newRun/
cd <scratch>/main_src && GENERATE_S0=1 S0_OUT=<scratch>/out pnpm vitest run src/test/edition3/newRun/generate.test.tsx
# <scratch>/out 의 9개 파일과 SHA256SUMS 를 확인한 뒤 golden/ 으로 옮긴다
```

- 생성기(`generate.test.tsx`)는 `GENERATE_S0=1` 일 때만 돈다(CI 에는 없다). 정답 폴더에 바로 쓰지 않고 `S0_OUT` 에만 쓴다.
- 비교 시험(`newRunFlagOff.test.tsx`)에는 쓰는 코드가 없다. 정답 파일이 없으면 실패한다.
- S0 때 정답은 운영 main(프론트 58d99ea)으로 떴고, 그 시점 저장소 코드(주석만 다름)로 뜬 것과 바이트까지 같았다. `TZ=UTC` 로 뜬 것도 같았다.
