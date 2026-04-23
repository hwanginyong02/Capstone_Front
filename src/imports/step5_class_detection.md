이제 "5. 클래스 감지" 화면을 만들어주세요.

StepTabs 상태: 1, 2, 3, 4 completed, 5 active, 나머지 upcoming.
총 8단계 탭: 기본 정보 / 시험항목 / 데이터 업로드 / 컬럼 매핑 / 
클래스 감지 / 예측 설정 / 데이터 검증 / 결과 미리보기

==========================================
화면 내용
==========================================

【페이지 헤더】
- 제목: "클래스 감지"
- 서브타이틀: "업로드된 데이터의 y_true 컬럼에서 클래스를 자동으로 감지했습니다. 확인 후 필요시 수정해주세요."

【정보 Alert】
- variant: default (info 톤)
- 아이콘: Info (lucide-react)
- 내용: "감지된 클래스는 y_true 컬럼의 고유값에서 추출되었습니다. 평가 결과는 여기 표시된 클래스 기준으로 계산됩니다."

【감지된 클래스 카드】
제목: "감지된 클래스"
설명: "평가 유형: multiclass · 총 3개 클래스 · 샘플 수: 200개"

카드 내용:
각 클래스가 Badge 형태로 나열. Badge는 shadcn variant="secondary" 사용, 
하지만 크기는 조금 크게 (py-1.5 px-3, text-body-medium).
flex-wrap으로 배치, gap-2.

예시 배치:
[cat  74개 · 37.0%]  [dog  69개 · 34.5%]  [bird  57개 · 28.5%]

각 Badge 내부 구조:
- 클래스명 (font-semibold)
- 가운데 점 구분자 "·"
- 샘플 수 (font-mono, tabular-nums)
- 가운데 점 구분자 "·"
- 비율 (font-mono, tabular-nums)

Badge에 우측 작은 X 아이콘을 hover시 표시 (제거 버튼).

【클래스 분포 시각화 카드】
제목: "클래스 분포"
설명: "데이터셋 내 클래스별 비율을 확인하세요."

카드 내용:
- 가로 막대 그래프 (각 클래스마다 한 줄)
  · 왼쪽: 클래스명 (고정 너비 120px, text-body-medium font-medium)
  · 중앙: 막대 (bg-primary, 비율만큼 너비, 높이 24px, radius-sm)
  · 오른쪽: 샘플 수 + 비율 (font-mono, tabular-nums, text-body-small)
- 막대 3개 (cat, dog, bird), 각각 세로 간격 12px

막대 아래:
- 수평 divider (border-border)
- 요약 통계 (flex row, gap-6):
  · 전체 샘플: 200개
  · 클래스 수: 3개
  · 불균형 비율: 1.30:1 (최다/최소)
  · 균형 상태: Badge "양호" (variant="secondary", 녹색 톤)

각 통계는:
- 라벨 (text-mono-small uppercase text-muted)
- 값 (text-heading-small font-semibold)

【클래스별 상세 카드 (접기 가능)】
shadcn Accordion, 기본 접힘.
제목: "클래스별 상세 정보"

펼치면 shadcn Table:
| 클래스명 | 샘플 수 | 비율   | y_pred에서 사용 | 상태     |
|----------|---------|--------|-----------------|----------|
| cat      | 74      | 37.0%  | ✓               | Badge 정상|
| dog      | 69      | 34.5%  | ✓               | Badge 정상|
| bird     | 57      | 28.5%  | ✓               | Badge 정상|

- 클래스명: font-medium
- 숫자 컬럼: 오른쪽 정렬, font-mono, tabular-nums
- y_pred에서 사용: lucide Check 아이콘 (text-success) 또는 X (text-danger)
- 상태: Badge (variant="secondary")

【경고 상황 표시 (조건부)】
만약 아래 상황이 발생하면 해당 Alert 표시:

1. y_pred에 y_true에 없는 클래스가 있을 때:
   Alert variant="destructive"
   제목: "y_pred에 정의되지 않은 클래스가 있습니다"
   내용: "'unknown' 클래스는 y_true에 존재하지 않습니다. 
          컬럼 매핑을 다시 확인하거나 데이터를 수정해주세요."

2. 특정 클래스의 샘플이 너무 적을 때:
   Alert variant="default" (warning 톤, border-warning-border)
   제목: "일부 클래스의 샘플 수가 적습니다"
   내용: "bird 클래스의 샘플 수(5개)는 신뢰성 있는 평가에 부족합니다. 
          최소 30개 이상을 권장합니다."

이 디자인에서는 정상 케이스로 보여주고, 
경고 Alert 예시는 화면 아래쪽에 "경고 상황 예시 미리보기" 섹션으로 별도 표시.

【Action Bar】
- 왼쪽: [← 이전]
- 오른쪽: [다음 단계 →]

==========================================
스타일 규칙
==========================================
- guidelines/ 폴더의 모든 파일 먼저 읽기
- 기존 1~4번 화면과 완전히 일관된 톤
- 막대 그래프는 외부 라이브러리 없이 div+width%로 구현
- 모든 숫자는 font-mono + tabular-nums 필수
