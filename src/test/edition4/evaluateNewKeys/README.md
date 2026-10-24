# 새 백엔드 평가 응답 (판 4 라운드 S1)

백엔드가 `/api/evaluate` 응답에 판 4 칸을 더한 뒤(파일 해시·크기 `source_file`, `engine_version`, F1 최대 임계값의
Recall·Precision·원값·표기, 신뢰구간·불균형 원값), 그 응답을 넣어도 **플래그를 끈 새 성적서가 판 3 정답과 같은지** 보는 입력이다.
시험은 `newKeysFlagOff.test.tsx`, 비교 정답은 `../../edition3/newRun/golden/`(고치지 않는다).

| 파일 | 무엇 |
|---|---|
| `<tag>.evaluate.json` | 새 백엔드(판 4 라운드 S1)로 실측 CSV + `edition3/newRun/inputs/<tag>.payload.json` 을 평가한 응답. `environment` 만 옛 입력 값으로 덮었다(평가 시각·라이브러리 버전은 실행마다 다르다). 옛 입력의 키·값은 모두 그대로 들어 있다(시험이 확인). |

다시 만들 때(백엔드 평가 응답 모양이 또 바뀌었을 때): 백엔드 저장소에서 FastAPI TestClient 로 `POST /api/evaluate` 에
실측 CSV(지문은 `edition3/newRun/README.md`)와 payload 를 보내고, 응답의 `environment` 를 옛 입력의 것으로 바꿔
`json.dumps(…, ensure_ascii=False, indent=1)` + 줄바꿈으로 쓴다. 시험 끝의 sha256 도 바뀐 이유와 함께 고친다.
