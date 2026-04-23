이제 "8. 결과 미리보기" 화면을 만들어주세요.
이 화면은 전체 워크플로우의 마지막이자 가장 중요한 화면입니다. 
사용자가 시험성적서를 생성하기 전에 모든 평가 결과를 확인하는 대시보드입니다.

StepTabs 상태: 1~7 completed, 8 active.

==========================================
화면 내용
==========================================

【페이지 헤더】
- 제목: "평가 결과 미리보기"
- 서브타이틀: "실제 데이터 기반으로 계산된 평가 결과입니다. 검토 후 시험성적서를 생성하세요."
- 우측에 실행 정보 Badge들 (text-body-small):
  · "Transformer · v.2026" (font-mono)
  · "200 samples" (font-mono, tabular-nums)
  · "2026-04-22 15:34" (font-mono)

【상단 요약 Metric Blocks 카드 (가장 중요, 크게)】
제목 없는 단일 카드, 내부 패딩 넉넉하게 (space-6 이상).
4열 그리드, 각 셀 사이 수직 divider (border-border).
각 셀 내부 구조는 overview-components.md의 Metric Block 패턴 정확히 준수.

셀 1: ACCURACY (TC1)
- 값: 0.8000 (text-metric-large, font-mono, tabular-nums)
- 라벨 아래 보조: "전체 정확도 · 160/200"

셀 2: MACRO PRECISION (TC11)
- 값: 0.8024
- 보조: "클래스 평균 Precision"

셀 3: MACRO RECALL (TC11)
- 값: 0.8000
- 보조: "클래스 평균 Recall"

셀 4: MACRO F1 (TC11)
- 값: 0.8006
- 보조: "클래스 평균 F1"

각 값 위 라벨: text-mono-small uppercase text-muted tracking-wide

【보조 메트릭 카드 (2열 그리드)】
같은 구조로 별도 카드, 2열:

셀 1: Fβ SCORE (TC5, β=1.0)
- 값: 0.8006
- 보조: "F-베타 점수"

셀 2: LOG LOSS (TC19) - 또는 KL DIVERGENCE (TC6)
- 값: 0.3187
- 보조: "예측 확률 손실 (낮을수록 좋음)"

【집계 메트릭 테이블 카드】
제목: "집계 메트릭 (TC11 / TC12 / TC13)"
설명: "Macro, Micro, Weighted 세 가지 평균 방식의 결과를 비교합니다."

shadcn Table:
| 평균 방법           | Precision | Recall  | F1 Score |
|---------------------|-----------|---------|----------|
| Macro Average (TC11)| 0.8024    | 0.8000  | 0.8006   |
| Micro Average (TC12)| 0.8000    | 0.8000  | 0.8000   |
| Weighted Avg (TC13) | 0.8024    | 0.8000  | 0.8006   |

- 숫자는 모두 font-mono, tabular-nums, 오른쪽 정렬
- 평균 방법명은 font-medium
- TC ID 부분은 text-body-small text-muted font-mono

【혼동 행렬 카드 (TC21)】
제목: "혼동 행렬 (TC21)"
설명: "실제 클래스와 예측 클래스의 교차표입니다. 대각선이 정확한 예측입니다."

내용 좌우 분할:

좌측 (60%): 3x3 혼동 행렬 표
- 왼쪽 상단에 작은 라벨 "↓ 실제 / 예측 →"
- 열 헤더: [cat, dog, bird] (font-mono, 중앙 정렬)
- 행 헤더: cat, dog, bird (font-mono, 오른쪽 정렬)
- 각 셀: 숫자 (font-mono, tabular-nums, 중앙 정렬)
- 대각선 셀(정답)은 bg-success-subtle, text-success, font-semibold
  · [cat,cat]: 59
  · [dog,dog]: 55
  · [bird,bird]: 46
- 비대각선(오분류)은 bg-muted:
  · [cat,dog]: 10 / [cat,bird]: 5
  · [dog,cat]: 8 / [dog,bird]: 6  
  · [bird,cat]: 7 / [bird,dog]: 4

셀 크기: 최소 64px × 48px, 패딩 넉넉하게.

우측 (40%): "주요 오분류 패턴 Top 5"
제목 (text-heading-small): "주요 오분류 Top 5"
리스트 (각 행):
- 좌측: 화살표로 연결 "실제 cat → 예측 dog" (font-medium)
- 우측: 건수 "10건" (font-mono tabular-nums font-semibold)
- 각 행 bg-muted/50, radius-md, padding 12px
- 행 사이 gap-2
- 총 5개 항목

【클래스별 상세 메트릭 카드 (TC22)】
제목: "클래스별 상세 메트릭 (TC22)"
설명: "각 클래스별 Precision, Recall, F1, Specificity 및 Support를 확인하세요."

상단: 가로 막대 그래프 (Precision/Recall/F1 비교)
- 클래스별로 3개의 막대 (가로 그룹)
- 높이 180px, padding 24px
- 범례: Precision (primary), Recall (primary/60), F1 (primary/30)
- 간단한 div 기반 구현 (외부 차트 라이브러리 없이)

하단: shadcn Table:
| 클래스 | Precision | Recall | F1 Score | Specificity | Support |
|--------|-----------|--------|----------|-------------|---------|
| cat    | 0.7973    | 0.7973 | 0.7973   | 0.8810      | 74      |
| dog    | 0.7971    | 0.7971 | 0.7971   | 0.8947      | 69      |
| bird   | 0.8070    | 0.8070 | 0.8070   | 0.9301      | 57      |

- 클래스명: font-medium
- 모든 숫자: font-mono, tabular-nums, 오른쪽 정렬
- Support (샘플 수): 정수 표시

【클래스 분포 비교 카드 (TC14 + TC23)】
제목: "클래스 분포 비교 (TC14 / TC23)"
설명: "실제 분포와 예측 분포를 비교하여 모델의 편향을 확인하세요."

상단에 작은 Badge: 
[불균형 비율 1.30:1] (variant="secondary")
[분포 차이 KL=0.012] (variant="secondary")
"양호" (variant="secondary", 녹색 톤)

중간: 비교 막대 그래프
- 각 클래스마다 2개의 막대 (실제 vs 예측)
- 실제: bg-primary, 예측: bg-primary/50
- 범례 상단에 표시

하단: Table
| 클래스 | 실제 수 | 예측 수 | 실제 비율 | 예측 비율 |
|--------|---------|---------|-----------|-----------|
| cat    | 74      | 74      | 37.00%    | 37.00%    |
| dog    | 69      | 70      | 34.50%    | 35.00%    |
| bird   | 57      | 56      | 28.50%    | 28.00%    |

【자동 인사이트 카드】
제목: "자동 인사이트 및 이상 탐지"
설명: "평가 결과를 자동 분석한 주요 관찰 사항입니다."

Alert 리스트 (gap-3):

Alert 1 (variant="default", info 톤):
- 아이콘: Info (text-primary)
- 내용: "전체 정확도 80%는 무작위 추측 기준선(33.3%) 대비 유의미하게 우수합니다."

Alert 2 (variant="default", warning 톤):
- 아이콘: AlertTriangle (text-warning)
- 내용: "cat 클래스에서 dog로의 오분류가 10건으로 가장 많습니다. 
        특징 간 혼동 가능성을 검토하세요."

Alert 3 (variant="default", info 톤):
- 아이콘: Info (text-primary)
- 내용: "Macro와 Micro 평균이 거의 동일합니다. 
        클래스 간 성능 편차가 적다는 의미입니다."

Alert 4 (variant="default", warning 톤):
- 아이콘: AlertTriangle (text-warning)
- 내용: "샘플 수 200개는 최소 권장치입니다. 
        500개 이상에서 평가 신뢰도가 크게 향상됩니다."

각 Alert는 간결한 한두 문장.

【Action Bar (하단 sticky, 이 화면만 특별 구조)】
기존 Action Bar와 다르게 3분할 구조:

좌측: [← 설정 수정] outline variant
중앙: (빈 공간)
우측: 2개 버튼 (gap-2):
  [결과 내보내기 (JSON)] outline variant
  [시험성적서 생성 (PDF)] default variant, 약간 더 크게 (px-6 py-3)

"시험성적서 생성" 버튼 옆에 작은 lucide Download 아이콘.

==========================================
스타일 규칙
==========================================
- guidelines/ 폴더의 모든 파일 먼저 읽기
- 1~7번 화면과 완전히 일관된 톤
- 이 화면은 데이터 밀도가 가장 높으므로 카드 간 gap을 조금 더 넓게 (--space-10)
- 모든 메트릭 값은 font-mono + tabular-nums 필수 적용
- 혼동 행렬은 최대한 깔끔하게, 대각선 강조가 명확해야 함
- 막대 그래프는 CSS만으로 구현 (recharts 등 없이 div + width%)

==========================================
마지막 주의사항
==========================================
이 화면은 사용자가 시험성적서를 발급받기 직전에 보는 "공식 문서 미리보기"입니다.
모든 숫자와 정보가 실제 시험성적서 PDF에 그대로 들어간다는 점을 고려하여
정확하고 신뢰감 있는 느낌으로 디자인해주세요.
장식은 최소화하고 데이터의 가독성을 최우선으로 하세요.
