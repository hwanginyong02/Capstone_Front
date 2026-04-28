이제 "7. 데이터 검증" 화면을 만들어주세요.

StepTabs 상태: 1~6 completed, 7 active, 8 upcoming.

==========================================
화면 내용
==========================================

【페이지 헤더】
- 제목: "데이터 검증"
- 서브타이틀: "업로드된 데이터와 모든 설정을 최종 검증합니다. 문제가 없다면 평가를 진행할 수 있습니다."

【최상단 결과 요약 Alert (큰 상태 표시)】
전체 검증이 통과된 정상 케이스를 기본으로 표시:

Alert variant="default" (success 톤, bg-success-subtle, border-success-border):
- 왼쪽: CheckCircle2 아이콘 (lucide, 24px, text-success)
- 제목 (text-heading-medium, text-success): "검증 성공"
- 내용: "모든 검사를 통과했습니다. 평가를 진행할 수 있습니다."
- 우측에 시간 표시 (text-body-small text-muted): "2026년 4월 22일 15:34 검증 완료"

【검증 항목 요약 카드】
제목: "검증 결과 요약"
설명: "총 6개 항목을 검사하여 모두 통과했습니다."

메트릭 블록 패턴 사용 (overview-components.md 참고).
한 카드 안에 4열 그리드, 각 셀 사이는 수직 divider:

| 총 샘플 수 | 감지된 컬럼 | 통과 항목 | 경고 항목 |
| 200       | 7           | 6/6       | 1         |

각 셀:
- 상단 라벨 (text-mono-small uppercase text-muted)
- 값 (text-metric-medium font-mono tabular-nums)
- 하단 보조 (text-body-small text-muted)

"경고 항목" 셀의 값 "1"은 text-warning 컬러.

【상세 검증 항목 카드】
제목: "상세 검증 결과"
설명: "각 검증 항목의 결과를 확인하세요."

shadcn Table:
| 검증 항목 | 상태 | 상세 내용 |
|----------|------|-----------|

검증 항목들 (행):

1. 행: "필수 컬럼 존재 확인"
   - 상태: Badge "통과" (variant="secondary", 녹색 톤, CheckCircle 아이콘 포함)
   - 상세: "y_true, y_pred, prob_class_* 모두 존재합니다."

2. 행: "ID 중복 검사"
   - 상태: Badge "통과"
   - 상세: "200개 샘플 모두 고유한 ID를 가지고 있습니다."

3. 행: "누락값(NaN) 검사"
   - 상태: Badge "통과"
   - 상세: "모든 필수 컬럼에 누락값이 없습니다."

4. 행: "확률값 범위 검사"
   - 상태: Badge "통과"
   - 상세: "모든 확률값이 0~1 범위 안에 있습니다."

5. 행: "확률 합 검사"
   - 상태: Badge "통과"
   - 상세: "각 샘플의 prob_class_* 합이 1.0 ± 0.001 범위입니다."

6. 행: "클래스 일치성 검사"
   - 상태: Badge "통과"
   - 상세: "y_pred의 모든 클래스가 y_true에 존재합니다."

7. 행: "샘플 수 적정성"
   - 상태: Badge "경고" (variant="outline", 노란 톤, AlertTriangle 아이콘)
   - 상세: "샘플 200개는 최소 권장치입니다. 신뢰성 향상을 위해 500개 이상을 권장합니다."

테이블 스타일:
- 상태 컬럼 너비 고정 (120px)
- 상세 컬럼은 text-body-small
- 경고 행은 bg-warning-subtle/30 배경 옅게

【설정 요약 카드 (사용자가 입력한 모든 정보 총정리)】
제목: "평가 설정 요약"
설명: "진행하기 전 입력한 모든 설정을 최종 확인하세요."

내부를 3개 섹션으로 구분 (각 섹션 사이에 border-border 구분선):

섹션 1: "기본 정보"
- 2열 grid (label: value 쌍):
  · 회사명: 서울과학기술대학교
  · 대상 모델: Transformer (run1, v.2026)
  · 시험결과서 용도: 외부 제출용
  · 평가 유형: multiclass

섹션 2: "시험항목" (10개 TC 선택됨이라고 가정)
- Badge 리스트 (flex-wrap, gap-2):
  [TC1 Accuracy] [TC2 Precision] [TC3 Recall] [TC4 F1] [TC5 Fβ (β=1.0)]
  [TC11 Macro] [TC12 Micro] [TC13 Weighted] [TC21 Confusion] [TC22 Class별]
- Badge variant="secondary", font-mono 부분과 font-sans 부분 혼합

섹션 3: "데이터 및 예측 설정"
- 2열 grid:
  · 업로드 파일: multiclass_200.csv (5.57 KB)
  · 총 샘플 수: 200개
  · 클래스: cat (74), dog (69), bird (57)
  · 예측 방식: 확률값 기반 자동 판정 (argmax)
  · Threshold: 사용 안 함

각 라벨: text-body-small text-muted
각 값: text-body-medium font-medium

【추가 경고/알림 (조건부)】
검증에서 경고가 나왔을 때 추가로 표시:

Alert variant="default" (warning 톤):
- 아이콘: AlertTriangle (text-warning)
- 제목: "진행 전 확인해주세요 (1개 경고)"
- 내용: "샘플 수가 적어 평가 결과의 신뢰도가 제한적일 수 있습니다. 
  그래도 진행하시려면 '시험성적서 생성'을 클릭하세요."
- 하단에 작은 체크박스: "확인했습니다. 경고에도 불구하고 진행합니다."

【에러 케이스 예시 (화면 하단에 별도 섹션으로 추가 표시)】
제목 (작게): "검증 실패 예시 - 참고용"

Alert variant="destructive":
- 아이콘: XCircle
- 제목 (text-heading-medium, text-danger): "검증 실패"
- 내용: "일부 검증 항목이 실패했습니다. 아래 문제를 해결한 후 다시 시도해주세요."

실패 항목 테이블 (위와 동일 구조):
- "확률 합 검사" → Badge "실패" (variant="destructive")
  상세: "12개 샘플의 prob_class_* 합이 1.0 범위를 벗어납니다."
- 하단에 버튼: [데이터 업로드로 돌아가기] (outline variant)

【Action Bar】
- 왼쪽: [← 이전]
- 오른쪽: 2개 버튼 (gap-2):
  [결과 미리보기] outline variant
  [다음 단계 →] default variant
  
경고가 있는 상태에서는 "다음 단계" 버튼 위에 
작은 체크박스 확인이 선행되어야 활성화됨 (disabled 상태로 표시).

==========================================
스타일 규칙
==========================================
- guidelines/ 폴더의 모든 파일 먼저 읽기
- 1~6번 화면과 완전히 일관된 톤
- 이 화면은 "모든 정보가 한눈에" 보여야 하므로 정보 밀도를 높게
- 모든 숫자는 font-mono + tabular-nums
- 긴 리스트는 카드로 분리하여 스캔 가능하게
