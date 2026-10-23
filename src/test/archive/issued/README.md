# 판 2·3 보관본 정답 글 (판 4 라운드 S0)

**한 줄 요약**: 이 폴더의 정답 글은 지금 운영 중인 main 코드가 판 2·3 성적서를 그린 글이다. 판 4 작업이 판 2·3 화면을 한 글자라도 바꾸면 `issuedArchives.test.tsx` 가 실패한다.

> **정답을 다시 뜨는 것은 위험 신호다.** 이 테스트가 실패하면 코드를 고친다. 정답 파일이나 `golden/SHA256SUMS` 를 고쳐서 통과시키지 않는다. 정답 생성기는 운영 main 사본에서만 돌린다(아래). 이 저장소의 지금 코드로 정답을 뜨면 "지금 코드 = 정답"이 되어 아무것도 지키지 못한다.

## 무엇이 들어 있나

| 파일 | 내용 |
|---|---|
| `RPT-2026-000{1..6}.content.json` | 실제로 발급된 판 3 성적서 6건의 서버 보관본(`report_snapshot.content_json`) **바이트 그대로**. 줄바꿈도 붙이지 않았다. sha256 이 발급 때 서버가 적은 `content_hash` 와 같다(테스트가 단정). |
| `RPT-2026-000{1..6}.issuance.json` | 같은 발급의 발급 기록. `issuance` 행과 발급 시점 기관 스냅샷(`org_snapshot_json`)을 앱이 `GET /api/reports/{번호}` 로 받는 모양(`IssuanceResult`)으로 옮겼다. 시각은 서버 직렬화와 같이 `+00:00` 이 붙은 ISO 다. |
| `syn_*.json` | 실제 6건이 지나가지 않는 판 3 갈래를 담은 합성 픽스처(아래 표). 운영 main 코드의 `/report/:id` 흐름이 만든 run 저장 데이터(`reportData`)다. 손으로 고친 곳은 없다. |
| `syn_*.narrative.json` | 같은 run 의 서술 상태(`run.narrative`). 서술 대기·실패 페이지를 그릴 때 쓴다. |
| `golden/<이름>.sections.txt` | 화면 본문(`ReportSections`). |
| `golden/<이름>.print.txt` | 인쇄(`ReportPrint`, `print:hidden` 뺌). 발급본 6건은 발급 기록을 `applyIssuance` 로 덧입힌 데이터. |
| `golden/<이름>.byNumber.txt` | 번호로 연 페이지(`ReportByNumber`) **전체** — 화면 전용 머리 상자(발급 차수·검증 코드)와 "작성 기록" 상자 포함. 발급본은 실제 발급 기록·실제 content_hash 로, 나머지는 발급 기록 없음(null)·가짜 해시로 연다. |
| `golden/<이름>.page.txt` | `/report/:id` 페이지(`Report`) 전체. 발급본 6건은 발급 뒤 완료 상태, `syn_narrative_pending`·`syn_narrative_failed` 는 서술 대기(진행 단계 "생성 중")·실패 상태. |
| `golden/SHA256SUMS` | 이 폴더의 픽스처·정답·생성기 파일과 위 폴더의 손 픽스처 4개의 sha256. `issuedChecksums.test.ts` 가 다시 계산해 대조한다 — 정답을 몰래 다시 뜨면 이 목록도 바꿔야 해서 diff 에 드러난다. |
| `generator/` | 정답과 합성 픽스처를 만든 생성기와 그 입력(아래). 테스트가 아니다(확장자 `.txt`). |

정답이 있는 픽스처는 발급본 6건, 위 폴더의 손 픽스처 4개(`schema3_binary`, `schema3_binary_pass`, `schema2_binary`, `schema2_multiclass_noproblems`), 합성 6건이다. 경로마다 정답이 하나씩이고 페이지 정답은 8개다(모두 56개).

글은 `archiveLayout.test.tsx` 와 같은 규칙으로 뜬다 — 블록 요소마다 한 줄, 칸 안의 공백은 하나로, 표 칸은 ` | ` 로 잇는다. 시각은 `Date` 만 2026-10-22 18:45 KST 로 고정한다. 정답은 시간대와 무관하다(생성 때 `TZ=UTC` 와 KST 결과가 같음을 확인했다).

## 합성 픽스처

| 이름 | 바탕(지난 라운드 현실 픽스처) | 바꾼 것 | 지키는 갈래 |
|---|---|---|---|
| `syn_multiclass_cm_latency` | digits_strong (다중) | 지표에 M21·M22 추가, CSV 에 응답시간 열 `latency_ms` 추가(역할 latency) | 혼동 행렬 차트, 클래스별 표(M22), 응답시간 통계 |
| `syn_binary_shift_cm` | bc_strong (이진, 확률만) | 지표에 M21·M22 추가, 학습 클래스 수를 malignant 40 / benign 358 로 | 이진 혼동 행렬 차트, 9절 "학습↔평가 분포 차이" 문제 |
| `syn_binary_inconclusive` | bc_weak (이진, 예측값) | 핵심 지표를 AUROC(M9)로 지정, 점수 열을 CSV·매핑에서 뺌 | 판정 불가(핵심 지표 산출 안 됨) |
| `syn_multilabel_perlabel` | yeast_strong (멀티레이블, 점수만) | 결정 임계값을 레이블마다 다르게(0.3~0.6) | `derivedPrediction.method = threshold_per_label` + 레이블별 임계값 표기 |
| `syn_narrative_pending` | bc_strong 그대로 | 서술 작업 조회가 계속 "생성 중" | 서술 대기 화면 |
| `syn_narrative_failed` | digits_weak 그대로 | 서술 작업이 실패(`error`) | 서술 실패 화면 |

완료(done) 합성 4건의 서술은 운영 main 백엔드를 AI 키 없이 돌려 받은 **규칙 문장(fallback)** 이다. 실제 발급본 6건은 모두 AI 서술(llm)이라, 두 출처의 표시가 다 정답에 들어간다.

`syn_narrative_pending` 과 같은 입력으로 프론트가 만든 서술 요청 본문은 지난 라운드가 실제 발급 때와 같음을 확인한 bc_strong 요청 본문과 한 글자도 다르지 않았다 — 생성기가 앱과 같은 흐름을 탄다는 증거다.

## 다시 만드는 법 (위험 신호 — 코드를 고치는 것이 먼저다)

정답과 합성 픽스처는 **운영 main** 코드로만 만든다. 이번에 쓴 것: 프론트 `origin/main` = 58d99ea, 백엔드 `origin/main` = a7d3168.

```sh
# 0) 운영 main 사본 (작업 폴더 W 는 저장소 밖)
mkdir -p $W/main_src $W/be_main
git -C <프론트 저장소> archive origin/main | tar -x -C $W/main_src
ln -s <프론트 저장소>/node_modules $W/main_src/node_modules
git -C <백엔드 저장소> archive origin/main | tar -x -C $W/be_main
cp generator/generate.tsx.txt $W/main_src/src/gen_s0.test.tsx

# 1) (합성 픽스처를 다시 만들 때만) 백엔드 평가·검증 응답 — 입력 CSV 폴더는 지난 라운드의 c_데이터
cd $W/be_main && <백엔드 venv>/bin/python -I generator/gen_eval.py.txt 의 사본 <c_데이터 폴더> $W/eval
# 2) 프론트 흐름으로 서술 요청 본문
cd $W/main_src && S0_MODE=requests WORK=$W/eval npx vitest run src/gen_s0.test.tsx
# 3) 백엔드 서술 작업(AI 키 환경변수 없이 → 규칙 문장)
cd $W/be_main && env -u ANTHROPIC_API_KEY DATABASE_URL=sqlite:///$W/jobs.db <venv>/bin/python -I gen_jobs.py 사본 $W/eval
# 4) 합성 픽스처
cd $W/main_src && S0_MODE=fixtures WORK=$W/eval OUT=$W/fixtures npx vitest run src/gen_s0.test.tsx

# 5) 정답 글 (픽스처는 이 폴더의 것을 읽는다)
cd $W/main_src && S0_MODE=golden ISSUED=<이 폴더> ARCHIVE=<이 폴더의 위 폴더> OUT=$W/golden npx vitest run src/gen_s0.test.tsx
```

1~4 의 입력과 중간 결과(`*.csv`, `*.payload.json`, `*.validate.json`, `*.evaluate.json`, `*.narrative_request.json`, `*.job_created.json`, `*.job_view.json`)는 `generator/inputs/` 에 있다. 이 폴더를 `WORK` 로 주면 1·3 을 건너뛰고 4 를 다시 돌릴 수 있다. 생성기 변수 이름이 `MODE` 가 아니라 `S0_MODE` 인 것은 vitest 가 `MODE=test` 를 스스로 넣기 때문이다.

실제 발급본 6건은 다시 만들지 않는다. 서버 보관본 그대로이고, 바꾸면 sha256 단정이 실패한다.

## 발급 직후 브라우저 화면과의 대조 (S0 에서 한 번)

발급 직후 실제 브라우저가 번호로 연 화면에서 뽑은 글(innerText)과 `golden/RPT-2026-000{1..6}.byNumber.txt` 를 공백·대소문자를 없애고 견줬다. 다른 곳은 세 가지뿐이고 모두 jsdom 과 브라우저의 차이다. 셋을 빼면 6건 모두 같다.

1. "작성 기록" 상자는 접힌 `<details>` 라 브라우저 innerText 에는 소절 목록(7.1 … 9 — AI 작성(모델))이 없다. 정답(textContent)에는 있다.
2. ROC·PR 곡선의 축 눈금(0, 0.2 … 1, FPR/TPR, Recall/Precision)은 브라우저에서만 그려진다(jsdom 은 차트 크기가 0).
3. 브라우저 글 맨 끝의 `0` 은 `ReportByNumber` 밖 화면 요소다.
