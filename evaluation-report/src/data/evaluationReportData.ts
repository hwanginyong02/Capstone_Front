// ============================================================================
// evaluationReportData.ts
// KS X ISO/IEC TS 4213 기반 머신러닝 모델 시험성적서 Mock 데이터
// 대상: 뿌리업종 표면결함 분류 모델 (5-class CNN)
// ============================================================================

// ─── Type Definitions ──────────────────────────────────────────────────────

export interface ReportMeta {
  reportId: string;
  issueDate: string;
  testPeriod: { from: string; to: string };
  client: { name: string; representative: string; businessNo: string };
  testAgency: { name: string; division: string; tester: string };
  modelInfo: {
    name: string;
    version: string;
    architecture: string;
    framework: string;
    parameters: string;
    inputShape: string;
    outputClasses: number;
  };
  isoStandard: string;
  evaluationType: '분류(Classification)' | '회귀(Regression)' | '검출(Detection)';
}

export interface ClassDistribution {
  classId: string;
  className: string;
  trainCount: number;
  validationCount: number;
  testCount: number;
  totalCount: number;
}

export interface DatasetInfo {
  source: string;
  collectionPeriod: string;
  totalSamples: number;
  trainSamples: number;
  validationSamples: number;
  testSamples: number;
  imageResolution: string;
  preprocessingNote: string;
  classes: ClassDistribution[];
}

export interface TestItem {
  id: string;
  name: string;
  symbol: string;
  formula: string;
  description: string;
  threshold: number;
  unit: string;
}

export interface ConfusionMatrix {
  labels: string[];
  matrix: number[][];
  totalSamples: number;
}

export interface PerClassMetric {
  className: string;
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
  pass: boolean;
}

export interface MetricResult {
  metricId: string;
  metricName: string;
  overallValue: number;
  threshold: number;
  pass: boolean;
  perClass: PerClassMetric[];
}

export interface DiagnosticInsight {
  className: string;
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
  topConfusion: { confusedWith: string; rate: number; count: number };
  severity: 'good' | 'warning' | 'critical';
  observation: string;
}

export interface LLMSummary {
  verdict: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  fullText: string;
}

export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  action: string;
  expectedImpact: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────

export const reportMeta: ReportMeta = {
  reportId: 'TTA-AI-2026-0042',
  issueDate: '2026-04-28',
  testPeriod: { from: '2026-03-15', to: '2026-04-20' },
  client: {
    name: '주식회사 메탈테크코리아',
    representative: '김상호',
    businessNo: '124-86-00917',
  },
  testAgency: {
    name: '한국정보통신기술협회 (TTA)',
    division: 'AI품질평가단',
    tester: '박지원 책임연구원',
  },
  modelInfo: {
    name: 'SurfaceDefectNet',
    version: 'v2.3.1',
    architecture: 'ResNet-50 + FPN (Feature Pyramid Network)',
    framework: 'PyTorch 2.1.0',
    parameters: '25.6M',
    inputShape: '224 × 224 × 3 (RGB)',
    outputClasses: 5,
  },
  isoStandard: 'KS X ISO/IEC TS 4213:2023',
  evaluationType: '분류(Classification)',
};

export const datasetInfo: DatasetInfo = {
  source: '뿌리업종 특화 제조데이터 공동활용 플랫폼',
  collectionPeriod: '2025-08 ~ 2026-02',
  totalSamples: 12450,
  trainSamples: 8715,
  validationSamples: 1867,
  testSamples: 1868,
  imageResolution: '1024 × 1024 (원본) → 224 × 224 (리사이즈)',
  preprocessingNote: 'ImageNet 평균/표준편차 정규화, 좌우반전 증강 적용',
  classes: [
    { classId: 'C0', className: 'Scratch',   trainCount: 1843, validationCount: 395, testCount: 396, totalCount: 2634 },
    { classId: 'C1', className: 'Pitting',   trainCount: 1721, validationCount: 369, testCount: 370, totalCount: 2460 },
    { classId: 'C2', className: 'Inclusion', trainCount: 1652, validationCount: 354, testCount: 354, totalCount: 2360 },
    { classId: 'C3', className: 'Crazing',   trainCount: 1798, validationCount: 386, testCount: 386, totalCount: 2570 },
    { classId: 'C4', className: 'Patches',   trainCount: 1701, validationCount: 363, testCount: 362, totalCount: 2426 },
  ],
};

export const testItems: TestItem[] = [
  {
    id: 'accuracy',
    name: 'Accuracy (정확도)',
    symbol: 'Acc',
    formula: '(TP + TN) / (TP + TN + FP + FN)',
    description: '전체 예측 중 올바르게 분류한 비율',
    threshold: 0.85,
    unit: '%',
  },
  {
    id: 'precision',
    name: 'Precision (정밀도)',
    symbol: 'P',
    formula: 'TP / (TP + FP)',
    description: '양성으로 예측한 것 중 실제 양성인 비율 (Macro-average)',
    threshold: 0.80,
    unit: '%',
  },
  {
    id: 'recall',
    name: 'Recall (재현율)',
    symbol: 'R',
    formula: 'TP / (TP + FN)',
    description: '실제 양성 중 양성으로 예측한 비율 (Macro-average)',
    threshold: 0.80,
    unit: '%',
  },
  {
    id: 'f1',
    name: 'F1-Score',
    symbol: 'F1',
    formula: '2 × (P × R) / (P + R)',
    description: 'Precision과 Recall의 조화평균 (Macro-average)',
    threshold: 0.82,
    unit: '',
  },
];

// 5x5 Confusion Matrix — 행: 실제(Actual), 열: 예측(Predicted)
export const confusionMatrix: ConfusionMatrix = {
  labels: ['Scratch', 'Pitting', 'Inclusion', 'Crazing', 'Patches'],
  matrix: [
    //    Sc   Pi   In   Cr   Pa
    [   378,   4,   8,   3,   3 ], // Scratch (실제)
    [     5, 348,  11,   3,   3 ], // Pitting
    [     7,  14, 312,  10,  11 ], // Inclusion
    [     2,   3,   9, 365,   7 ], // Crazing
    [     4,   2,   6,   8, 342 ], // Patches
  ],
  totalSamples: 1868,
};

export const metricResults: MetricResult[] = [
  {
    metricId: 'accuracy',
    metricName: 'Accuracy',
    overallValue: 0.9443,
    threshold: 0.85,
    pass: true,
    perClass: [
      { className: 'Scratch',   precision: 0.9551, recall: 0.9545, f1Score: 0.9548, support: 396, pass: true },
      { className: 'Pitting',   precision: 0.9379, recall: 0.9405, f1Score: 0.9392, support: 370, pass: true },
      { className: 'Inclusion', precision: 0.9024, recall: 0.8814, f1Score: 0.8918, support: 354, pass: true },
      { className: 'Crazing',   precision: 0.9402, recall: 0.9456, f1Score: 0.9429, support: 386, pass: true },
      { className: 'Patches',   precision: 0.9384, recall: 0.9448, f1Score: 0.9416, support: 362, pass: true },
    ],
  },
  {
    metricId: 'precision',
    metricName: 'Precision (Macro)',
    overallValue: 0.9348,
    threshold: 0.80,
    pass: true,
    perClass: [],
  },
  {
    metricId: 'recall',
    metricName: 'Recall (Macro)',
    overallValue: 0.9334,
    threshold: 0.80,
    pass: true,
    perClass: [],
  },
  {
    metricId: 'f1',
    metricName: 'F1-Score (Macro)',
    overallValue: 0.9341,
    threshold: 0.82,
    pass: true,
    perClass: [],
  },
];

export const diagnostics: DiagnosticInsight[] = [
  {
    className: 'Scratch',
    precision: 0.9551,
    recall: 0.9545,
    f1Score: 0.9548,
    support: 396,
    topConfusion: { confusedWith: 'Inclusion', rate: 0.0202, count: 8 },
    severity: 'good',
    observation:
      'Scratch 클래스는 모든 지표에서 95% 이상의 안정적 성능을 기록함. 선형 패턴이 명확하여 모델이 잘 학습한 것으로 판단됨. 일부 Inclusion(개재물)과의 혼동(2.0%)은 미세 결함 영역에서 발생함.',
  },
  {
    className: 'Pitting',
    precision: 0.9379,
    recall: 0.9405,
    f1Score: 0.9392,
    support: 370,
    topConfusion: { confusedWith: 'Inclusion', rate: 0.0297, count: 11 },
    severity: 'good',
    observation:
      'Pitting(공식)은 양호한 성능을 보이나 Inclusion과의 혼동률(3.0%)이 다소 높음. 두 결함 모두 점 형태의 텍스처 특성을 공유하므로, 텍스처 기반 보조 특징(GLCM 등) 추가가 효과적일 수 있음.',
  },
  {
    className: 'Inclusion',
    precision: 0.9024,
    recall: 0.8814,
    f1Score: 0.8918,
    support: 354,
    topConfusion: { confusedWith: 'Pitting', rate: 0.0395, count: 14 },
    severity: 'warning',
    observation:
      'Inclusion 클래스의 Recall이 88.1%로 5개 클래스 중 가장 낮음. 14건이 Pitting으로, 11건이 Patches로 오분류됨. 이종 결함과 시각적 유사성이 높은 어려운 클래스로, Class-balanced loss 적용 또는 hard-negative mining 권장.',
  },
  {
    className: 'Crazing',
    precision: 0.9402,
    recall: 0.9456,
    f1Score: 0.9429,
    support: 386,
    topConfusion: { confusedWith: 'Inclusion', rate: 0.0259, count: 10 },
    severity: 'good',
    observation:
      'Crazing(균열)은 망상 패턴이 뚜렷하여 안정적으로 분류됨. F1 94.3%로 임계치를 충분히 상회. 추가 최적화 우선순위는 낮음.',
  },
  {
    className: 'Patches',
    precision: 0.9384,
    recall: 0.9448,
    f1Score: 0.9416,
    support: 362,
    topConfusion: { confusedWith: 'Crazing', rate: 0.0221, count: 8 },
    severity: 'good',
    observation:
      'Patches(반점) 클래스는 Recall 94.5%로 우수함. Crazing과의 일부 혼동은 두 결함이 인접하여 동시 발생하는 케이스에서 비롯된 것으로 추정됨.',
  },
];

export const llmSummary: LLMSummary = {
  verdict: 'PASS',
  overallScore: 0.9443,
  strengths: [
    '4개 핵심 지표(Accuracy, Precision, Recall, F1) 모두 합격 임계치를 9%p 이상 상회',
    '5개 클래스 전반에 걸쳐 균형 잡힌 성능 분포 (F1 표준편차 0.024)',
    '학습 데이터와 시험 데이터 간 분포 일치성 양호 (KL divergence < 0.05)',
  ],
  weaknesses: [
    'Inclusion 클래스의 Recall이 88.1%로 타 클래스 대비 5%p 이상 낮음',
    'Pitting ↔ Inclusion 양방향 혼동이 전체 오류의 23%를 차지',
    '실 운영 환경의 조도 변화에 대한 견고성 평가 미수행',
  ],
  fullText:
    '본 시험은 KS X ISO/IEC TS 4213:2023에 따라 SurfaceDefectNet v2.3.1의 분류 성능을 평가하였다. 시험 데이터 1,868건에 대한 평가 결과 전체 정확도 94.43%, Macro F1-Score 0.9341로 모든 합격 임계치를 통과하였다. 다만 Inclusion(개재물) 클래스의 재현율이 88.14%로 타 클래스 대비 상대적으로 저조한 성능을 보였으며, 이는 Pitting(공식)과의 시각적 유사성에 기인한 것으로 분석된다. 전반적으로 본 모델은 뿌리업종 표면결함 자동 검사 용도로 적합한 수준의 성능을 갖추었으며, 후속 개선 시 Inclusion-Pitting 구분 능력 향상에 우선 집중할 것을 권고한다. ISO/IEC TS 4213 5.2절(분류 성능 평가)의 모든 필수 요건을 충족함을 확인하였다.',
};

export const recommendations: Recommendation[] = [
  {
    priority: 'HIGH',
    category: '모델 개선',
    action: 'Inclusion 클래스에 대해 Focal Loss 또는 Class-balanced Cross Entropy 적용으로 재현율 개선',
    expectedImpact: 'Inclusion Recall +3~5%p 개선 예상',
  },
  {
    priority: 'HIGH',
    category: '데이터 증강',
    action: 'Pitting/Inclusion 경계 사례에 대한 hard-negative mining 및 추가 데이터 수집',
    expectedImpact: '양 클래스 간 혼동률 약 50% 감소 예상',
  },
  {
    priority: 'MEDIUM',
    category: '강건성 평가',
    action: '조도·노이즈·블러 등 운영 환경 변동성에 대한 추가 견고성 시험 수행',
    expectedImpact: 'ISO/IEC TS 4213 6.4절(견고성) 적합성 확보',
  },
  {
    priority: 'MEDIUM',
    category: '특징 공학',
    action: 'Texture 기반 보조 특징(GLCM, LBP) 결합 모델 검토',
    expectedImpact: '미세 텍스처 결함 분류 정확도 향상',
  },
  {
    priority: 'LOW',
    category: '운영',
    action: '실운영 단계에서 분류 신뢰도 임계치 0.75 이하인 샘플 별도 검토 큐 운영',
    expectedImpact: '오분류 사례의 인적 검수를 통한 안전망 확보',
  },
];
