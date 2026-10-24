# 판 4 그린 글 정답 (판 4 라운드 S6 ⑨)

**한 줄 요약**: 판 4 성적서 세 입력을 세 경로로 그린 **글 전체**를 정적 텍스트로 굳혀 둔 것이다. 판 4 렌더러가 한 글자라도 다르게
그리면 `../renderedText.test.tsx` 가 실패한다.

**한계**: 글자만 고정한다. 태그·class·속성(굵게, 쪽 나눔, 버튼 켜짐 등)과 그림(차트) 안쪽은 글자가 같으면 못 잡는다.

## 무엇이 들어 있나

`<입력>.<상태>.<경로>.txt` 18개 = 입력 3 × 상태 2 × 경로 3.

| 자리 | 값 | 뜻 |
|---|---|---|
| 입력 | `bc_strong`(이진, RPT-2026-0001 입력) · `digits_strong`(다중) · `yeast_strong`(멀티레이블) | `../fixtures/` 의 판 4 run 저장 데이터 |
| 상태 | `final` | 서술 완료·미발급(`<입력>.final.json`) |
| | `issued` | 발급본(`<입력>.issued.json` — 실제 `applyIssuance` 로 같은 입력의 판 3 발급 기록을 덧입힘) |
| 경로 | `screen` | 화면 본문(`ReportSections`) |
| | `print` | 인쇄(`/report/:id/print` 의 `ReportPrint`, 서술 끝남 상태, `print:hidden` 뺌) |
| | `byNumber` | 번호로 연 페이지 전체(`ReportByNumber` — 머리 상자·작성 기록 상자 포함). 서버 보관본은 늘 발급 전 데이터(`final.json`)다. `issued` 는 실제 발급 기록을 서버가 돌려준 경우, `final` 은 발급 기록을 서버가 못 준 경우(404 — 번호는 시험 도구 기본값 `RPT-2026-9999`, 발급 이력 없음). 운영에서는 번호로 열 수 있으면 발급 기록도 있으므로 나오지 않는 상태다 — 서버 오류 때 그려지는 모양을 지키려고 둔 정답이다 |

글 뽑기 규칙은 `../renderEd4.tsx` 의 `blockText` 다(블록 요소마다 한 줄, 표는 한 행이 한 줄 `| 칸1 | 칸2`, 칸 안 공백은 하나로).
시각은 저장 데이터에 이미 찍혀 있어 시간대와 무관하다(`TZ=UTC` 로 다시 그려도 바이트가 같음을 확인했다).

## 다른 시험과의 관계

- `../fixtures/`(저장 데이터)는 `../generate.test.tsx` 가 앱 흐름으로 다시 만들어 바이트 대조한다. 이 폴더는 그 데이터를 **그린 글** 쪽을 고정한다.
- bc_strong 발급본의 글이 예시본과 같은지는 `../../rpt0001/exampleFull.test.tsx`(가림·허용 동치 명시)가, 다중·멀티의 자리는
  `../placesEd4.test.tsx` 가 본다. 이 폴더는 "지금 글이 어제 글과 같은가"만 본다 — 정답이 맞는 글인지는 그 두 시험이 지킨다.
- 판 2·3 보관본 정답은 `src/test/archive/issued/golden/`, 판 3 새 성적서 정답은 `src/test/edition3/newRun/golden/` 이다(이 폴더와 무관, 고치지 않음).

## 다시 뜨는 법

```sh
UPDATE_ED4_TEXT=1 npx vitest run src/test/edition4/render/renderedText.test.tsx   # 18개 파일을 다시 씀
git diff --stat src/test/edition4/render/text                                     # 바뀐 파일과 줄을 사람이 읽는다
TZ=UTC npx vitest run src/test/edition4/render/renderedText.test.tsx              # 시간대가 달라도 같은지
```

- 파일은 `UPDATE_ED4_TEXT=1` 일 때만 쓴다. `-u`(스냅샷 갱신)로는 바뀌지 않는다.
- 평소(CI 포함)에는 다시 그린 글과 파일을 `toBe` 로 견주기만 한다. 파일이 없으면 실패한다.

## 언제 다시 떠도 되나

다시 뜨는 것은 **판 4 성적서 글이 바뀐다는 뜻**이다. 실패하면 먼저 코드를 의심한다.

다시 떠도 되는 경우(커밋 메시지에 이유를 적고, diff 가 그 이유로 설명되는 줄뿐인지 확인한다):

1. 사용자가 승인한 판 4 글 변경 — 고정 문구·예시본·부록 B 글자를 바꿨거나, 질문 답으로 표기 규칙을 바꾼 경우.
2. 렌더 픽스처(`../fixtures/`)를 이유를 적고 `UPDATE_ED4_RENDER=1` 로 다시 뜬 경우 — 그 픽스처 diff 가 만든 글 차이만 있어야 한다.
3. 시험 도구(`../renderEd4.tsx` 의 글 뽑기 규칙)를 바꾼 경우 — 모든 파일이 같은 꼴로 바뀌어야 한다.

다시 뜨면 안 되는 경우:

- 이유 없이 실패할 때, 또는 diff 에 이유와 무관한 줄이 섞여 있을 때.
- 판 3 쪽 변경으로 판 4 글이 바뀐 경우(판 3 과 판 4 를 가르는 입구가 샌 것이다).
- 예시본 대조(`exampleFull.test.tsx`)나 자리 단정(`placesEd4.test.tsx`)이 같이 실패할 때 — 그 시험을 먼저 고칠 일인지 본다.
