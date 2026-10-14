import { useParams } from "react-router";
import { WorkflowShell } from "../../layout/WorkflowShell";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { BasicInfo as BasicInfoContent, isBasicInfoValid } from "../../components/basic-info/BasicInfo";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { useStepFlow } from "../../hooks/useStepFlow";
import { getSelectedMetrics } from "../../data/evaluationData";
import { getTargetValueRule, metricNeedsTargetValue, parseNumericValue } from "../../utils/domain/validation";
import { resolveCoreMetricIds } from "../../lib/report/computeVerdict";

/**
 * Details — 검증 바로 다음, 성적서 입력의 첫 화면.
 *
 * 여기 모인 것은 **평가 계산에 쓰이지 않는다**. `/api/evaluate` 페이로드는
 * task_type·column_mappings·selected_metric_ids·metadata·beta·decision_threshold 뿐이고,
 * 기관 정보·목표값은 하나도 들어가지 않는다. 성적서 문서와 판정을 그릴 때만
 * 쓰인다 — 그래서 검증(run 저장) 뒤에 둔다.
 *
 * 순서는 구성 화면의 카드 순서를 따른다 — ③ 의뢰자 정보가 ⑥ ~ ⑨ 선택 카드보다 앞이다
 * (docs/WORKFLOW_REDESIGN.md §11). 평가 API 는 이 뒤의 입력까지 모두 마친 성적서 화면에서
 * 처음 불리므로 여기 적은 값이 성적서와 AI 서술에 그대로 들어간다.
 *
 * 두 기능을 한 화면의 두 카드로 묶었다. 각각을 별도 단계로 두면 성적서까지 가는 길이
 * 더 길어지는데, 둘 다 단순 입력 폼이라 나눌 이유가 없다.
 *
 * 학습 데이터셋 폼은 여기서 빠졌다. 이름·건수·클래스 분포가 ⑥ 학습 데이터 카드와 겹쳐 같은 값을
 * 두 번 적어야 했다 — ⑥ 하나로 합쳤다(Data info, persist v10).
 *
 * 종전에는 이 화면만 `AppShell` 을 써서 **단계 화면 중 혼자 달랐다** — 여기서만 상단 탭이
 * 사라지고, 하단 고정 바 대신 본문 안에 버튼이 있고, 다음 목적지를 경로로 직접 적었다.
 * 나머지 화면과 같은 `WorkflowShell` + `useStepFlow` 로 맞췄다.
 */
export function ReportInfo() {
  const { id = "" } = useParams();
  const store = useWorkflowStore();
  const flow = useStepFlow("clientInfo");

  const selectedMetrics = getSelectedMetrics(
    store.taskType || "multiclass",
    store.selectedMetricIds,
  );
  const targetMetrics = selectedMetrics.filter((m) => metricNeedsTargetValue(m.id));

  const updateTarget = (metricId: string, name: string, value: string) => {
    store.setMetricDetails((prev) => {
      const existing = prev[metricId] ?? {
        id: metricId,
        name,
        description: "",
        beta: "",
        positiveClass: "",
        completed: false,
        targetValue: "",
      };
      return { ...prev, [metricId]: { ...existing, targetValue: value } };
    });
  };

  /**
   * 핵심 지표 — 미달하면 최종 불합격이 된다. 고르지 않았으면 유형별 기본값이 체크돼 보인다
   * (`resolveCoreMetricIds`). 하나를 바꾸는 순간 지금 보이는 목록 전체를 사용자의 선택으로
   * 저장한다 — 기본값과 사용자 선택이 섞여 어느 쪽인지 모르게 되지 않게 한다.
   */
  const coreMetricIds = resolveCoreMetricIds(
    store.taskType || "multiclass",
    store.selectedMetricIds,
    store.composerMetrics,
  );
  const toggleCore = (metricId: string, on: boolean) => {
    const next = on
      ? [...new Set([...coreMetricIds, metricId])]
      : coreMetricIds.filter((id) => id !== metricId);
    store.setComposerMetrics((prev) => ({ ...prev, coreMetrics: { choices: next } }));
  };

  const targetsValid = targetMetrics.every((metric) => {
    const raw = store.metricDetails[metric.id]?.targetValue ?? "";
    if (raw.trim() === "") return false;
    const parsed = parseNumericValue(raw);
    if (parsed === null) return false;
    return getTargetValueRule(metric.id).validate(parsed) === null;
  });

  // 목표값이 있는 지표가 있으면 핵심 지표를 1개 이상 골라야 한다(재료 목록 7절). 없으면 판정 규칙의
  // 첫 줄("핵심 지표가 하나라도 미달하면 불합격")이 성립하지 않는다.
  const coreValid = targetMetrics.length === 0 || coreMetricIds.length > 0;

  const canContinue = isBasicInfoValid(store.basicInfo) && targetsValid && coreValid;

  return (
    <WorkflowShell
      showActionBar
      showPrevious
      showNext
      onPrevious={() => flow.goPrevious({ runId: id })}
      onNext={() => flow.goNext({ runId: id })}
      nextDisabled={!canContinue}
      nextLabel={flow.next === "report" ? "View report" : "Next step"}
    >
      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pt-12 pb-24">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Details</h1>
          <p className="text-sm text-muted-foreground">
            Who the report is for, and the target each metric must reach. These details appear on the
            test report and do not change the measured results.
          </p>
        </div>

        <BasicInfoContent formData={store.basicInfo} onFormDataChange={store.setBasicInfo} />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Pass criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set the target each metric must reach for the report to mark it as passing. These values
              do not change the measured results. Choose at least one core metric: if a core metric
              misses its target the verdict is FAIL, and any other miss makes it a conditional pass.
            </p>

            {targetMetrics.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                None of the selected metrics take a pass target.
              </div>
            ) : (
              <div className="space-y-4">
                {targetMetrics.map((metric) => {
                  const raw = store.metricDetails[metric.id]?.targetValue ?? "";
                  const parsed = parseNumericValue(raw);
                  const rule = getTargetValueRule(metric.id);
                  const error =
                    raw.trim() === ""
                      ? "Target value is required."
                      : parsed === null
                        ? "Target value must be a valid number."
                        : rule.validate(parsed);

                  return (
                    <div
                      key={metric.id}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 md:grid-cols-[1fr_200px_auto] md:items-start"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{metric.id}</span>
                          <span className="text-sm font-semibold">{metric.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{rule.summary}</p>
                      </div>
                      <div className="space-y-1">
                        <Input
                          className="font-mono tabular-nums"
                          inputMode="decimal"
                          value={raw}
                          onChange={(event) => updateTarget(metric.id, metric.name, event.target.value)}
                          aria-invalid={Boolean(error)}
                          aria-label={`${metric.id} target value`}
                        />
                        {error && <p className="text-xs text-destructive">{error}</p>}
                      </div>
                      <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={coreMetricIds.includes(metric.id)}
                          onCheckedChange={(next) => toggleCore(metric.id, next === true)}
                          aria-label={`${metric.id} core metric`}
                        />
                        Core
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            {!coreValid && (
              <p className="text-sm text-destructive">Choose at least one core metric.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </WorkflowShell>
  );
}
