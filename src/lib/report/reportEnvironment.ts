import { DEFAULT_EVAL_ENV_CONSTANTS } from "./reportConstants";

/** 백엔드 `EvaluateResponse.environment` — 평가를 실제로 수행한 환경(ISSUES.md F-09). */
export interface EvaluationEnvironmentPayload {
  libraries: Record<string, string>;
  evaluated_at: string;
}

export interface ResolvedEvalEnvironment {
  tools: string[];
  evaluatedAt?: string;
}

/** 라이브러리 키의 표시 이름(파이썬만 대문자 관례를 따른다). */
const DISPLAY_NAME: Record<string, string> = { python: "Python" };

/**
 * 성적서 4절의 '주요 라이브러리'·'평가 일시'를 확정한다.
 *
 * 종전에는 프론트 상수(`scikit-learn 1.4.0` 등)를 인쇄했는데 그 값은 실제로 계산에 쓰인
 * 버전과 아무 관계가 없었다(ISSUES.md F-09). 이제 서버가 실측값을 내려보낸다.
 *
 * **구 스냅샷은 종전 상수로 폴백한다.** 이미 발급된 성적서는 데이터만 서버에 보관되고
 * 렌더는 현행 컴포넌트가 하므로(`ReportByNumber` → `ReportSections`), 폴백이 없으면
 * 과거 문서의 4절이 빈 칸이 된다 — 결정 4('이미 발급된 것은 손대지 않는다')에 어긋난다.
 */
export function buildEvalEnvironment(
  environment: EvaluationEnvironmentPayload | undefined | null,
): ResolvedEvalEnvironment {
  const entries = Object.entries(environment?.libraries ?? {});
  if (entries.length === 0) {
    return { tools: DEFAULT_EVAL_ENV_CONSTANTS.tools, evaluatedAt: environment?.evaluated_at };
  }

  return {
    tools: entries.map(([name, version]) => `${DISPLAY_NAME[name] ?? name} ${version}`),
    evaluatedAt: environment?.evaluated_at,
  };
}
