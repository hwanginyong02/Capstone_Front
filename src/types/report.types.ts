export interface ConfusionMatrixData {
  labels: string[];
  matrix: number[][];
  totalSamples: number;
  multilabelMatrices?: Array<{ label: string; matrix: number[][]; totalSamples: number }>;
}

export interface ReportRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  action: string;
  expectedImpact: string;
  /**
   * 대응하는 문제 번호("P1", 성적서 데이터의 `problems[].id`). 문제 목록이 생기기 전 서버 응답과 성적서에는
   * 없다.
   */
  problemId?: string;
}
