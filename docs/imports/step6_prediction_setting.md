이제 "6. 예측 설정" 화면을 만들어주세요.

StepTabs 상태: 1~5 completed, 6 active, 나머지 upcoming.

==========================================
화면 내용
==========================================

【페이지 헤더】
- 제목: "예측 설정"
- 서브타이틀: "모델의 예측값을 어떻게 해석할지 설정합니다. 업로드된 데이터에 포함된 정보에 따라 옵션이 달라집니다."

【업로드된 데이터 정보 카드】
제목: "업로드된 데이터 정보"
설명: "Step 4에서 매핑된 결과를 기반으로 사용 가능한 옵션을 표시합니다."

카드 내용 (flex row, space-between):
좌측 섹션 (flex col gap-2):
- y_pred (예측 레이블) 포함: 
  Badge "있음" (variant="secondary", 녹색 톤)
- prob_class_* (확률) 포함: 
  Badge "있음" (variant="secondary", 녹색 톤)

우측 섹션 (flex col gap-2):
- 감지된 클래스: 3개 (cat, dog, bird)
- 총 샘플 수: 200개

【예측값 입력 방식 선택 카드】
제목: "예측값 입력 방식"
설명: "모델의 예측 결과를 어떤 방식으로 해석할지 선택하세요."

RadioCard 패턴 (overview-components.md의 Radio Card 패턴 준수):
세로로 쌓인 2개의 큰 카드, gap-3:

카드 1: "y_pred 직접 사용"
- 좌측: 라디오 인디케이터 (●)
- 우측 내용:
  · 제목 (font-semibold): "y_pred 컬럼을 그대로 사용"
  · 설명 (text-body-small text-muted): 
    "데이터에 이미 포함된 예측 레이블(y_pred)을 그대로 사용합니다. 
    threshold 설정이 필요 없습니다."
  · 하단에 작은 코드 스니펫 (font-mono, text-mono-small, text-muted):
    "예: y_pred=cat → 예측: cat"

카드 2: "확률(prob) 기반 자동 판정" (선택됨 상태로 표시)
- 좌측: 라디오 인디케이터 (●, 선택됨)
- 우측 내용:
  · 제목 (font-semibold): "확률값 기반으로 자동 판정"
  · 설명: "각 클래스의 확률 중 가장 높은 값을 예측으로 사용합니다 (argmax)."
  · 하단 코드 스니펫:
    "예: prob_cat=0.92, prob_dog=0.05, prob_bird=0.03 → 예측: cat"
- 선택됨 스타일: border-primary (2px), bg-primary-subtle

【조건부 설정 카드 (방식 2 선택 시만 나타남)】
카드 제목: "판정 임계값 (Threshold) 설정"
설명: "확률 기반 판정에 적용할 임계값을 설정하세요. multiclass에서는 argmax가 기본이지만, 최소 확신도 임계값을 설정할 수 있습니다."

내용:
- 토글 스위치: "최소 임계값 사용"
  · 기본 OFF
  · 라벨 우측에 작은 Badge "선택사항" (variant="outline")
  
토글 ON일 때 추가 표시:
- Input (type=number, min=0, max=1, step=0.05, 기본값 0.5)
- 슬라이더 (0 ~ 1, step=0.05)
- Helper text: "가장 높은 확률이 이 값보다 낮으면 '판정 불가'로 처리됩니다."

이 디자인에서는 토글 OFF 기본 상태와 ON일 때 상태 둘 다 보여주세요 
(화면 아래에 "Threshold 사용 시 예시" 섹션으로).

【TC별 추가 입력 카드 (조건부)】
Step 2에서 선택한 TC 중 추가 입력이 필요한 것들만 표시.

예시:
제목: "시험항목 추가 설정"
설명: "선택한 시험항목 중 일부는 추가 입력이 필요합니다."

TC5가 Step 2에서 선택되었다고 가정:

서브 카드 (Card 내부에 또 다른 작은 Card):
- 좌측: TC ID Badge "TC5" (font-mono)
- 중앙: 
  · 메트릭명 "Fβ Score" (font-semibold)
  · 설명 "β값에 따라 Precision/Recall 중요도가 달라집니다"
- 우측:
  · Label "β값"
  · Input type=number, placeholder="1.0", 기본값 1.0
  · Helper text (text-body-small text-muted): "β=1: F1 동일 / β>1: Recall 중시 / β<1: Precision 중시"

만약 Step 2에서 추가 입력이 필요한 TC가 하나도 없으면:
이 카드 자체를 렌더링하지 않거나, 
"추가 설정이 필요한 시험항목이 없습니다." 문구만 간단히 표시.

【미리보기 카드】
제목: "예측 판정 미리보기"
설명: "설정한 방식으로 상위 3개 샘플에 대한 판정 결과를 미리 확인하세요."

shadcn Table:
| id   | prob_cat | prob_dog | prob_bird | 판정 결과 |
|------|----------|----------|-----------|-----------|
| S001 | 0.92     | 0.05     | 0.03      | cat       |
| S002 | 0.10     | 0.62     | 0.28      | dog       |
| S003 | 0.08     | 0.86     | 0.06      | dog       |

- 숫자는 font-mono, tabular-nums, 오른쪽 정렬
- "판정 결과" 컬럼은 font-medium, Badge(variant="secondary")로 감싸기
- 판정된 클래스(argmax에 해당)의 확률 셀은 bg-primary-subtle로 강조

【Action Bar】
- 왼쪽: [← 이전]
- 오른쪽: [다음 단계 →]

==========================================
스타일 규칙
==========================================
- guidelines/ 폴더의 모든 파일 먼저 읽기
- 1~5번 화면과 완전히 일관된 톤
- 모든 확률 숫자는 font-mono + tabular-nums 필수
- RadioCard는 overview-components.md 패턴 정확히 준수
