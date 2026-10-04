import { useParams } from "react-router";
import { WorkflowShell } from "../../layout/WorkflowShell";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { BasicInfo as BasicInfoContent, isBasicInfoValid } from "../../components/basic-info/BasicInfo";
import { TrainingDatasetSection } from "../../components/report-info/TrainingDatasetSection";
import { Field, TEXTAREA_CLASS } from "../../components/data-upload/shared";
import { useWorkflowStore } from "../../utils/stores/useWorkflowStore";
import { useStepFlow } from "../../hooks/useStepFlow";
import { getSelectedMetrics } from "../../data/evaluationData";
import { getTargetValueRule, metricNeedsTargetValue, parseNumericValue } from "../../utils/domain/validation";

/**
 * 성적서 구간 — 평가가 끝난 뒤에만 온다.
 *
 * 여기 모인 셋은 **평가에 전혀 쓰이지 않는다**. `/api/evaluate` 페이로드는
 * task_type·column_mappings·selected_metric_ids·metadata·beta·decision_threshold 뿐이고,
 * 기관 정보·학습 데이터셋 정보·목표값은 하나도 들어가지 않는다. 성적서 문서를 그릴 때만
 * 쓰인다 — 그래서 "정확도가 몇 %인지"만 보려는 사용자의 앞을 막지 않도록 뒤로 뺐다.
 *
 * 세 기능을 한 화면의 세 카드로 묶었다. 각각을 별도 단계로 두면 성적서까지 가는 길이
 * 네 화면 더 길어지는데, 셋 다 단순 입력 폼이라 나눌 이유가 없다.
 *
 * 종전에는 이 화면만 `AppShell` 을 써서 **단계 화면 중 혼자 달랐다** — 여기서만 상단 탭이
 * 사라지고, 하단 고정 바 대신 본문 안에 버튼이 있고, 다음 목적지를 경로로 직접 적었다.
 * 나머지 여섯 화면과 같은 `WorkflowShell` + `useStepFlow` 로 맞췄다.
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

  const targetsValid = targetMetrics.every((metric) => {
    const raw = store.metricDetails[metric.id]?.targetValue ?? "";
    if (raw.trim() === "") return false;
    const parsed = parseNumericValue(raw);
    if (parsed === null) return false;
    return getTargetValueRule(metric.id).validate(parsed) === null;
  });

  const canContinue = isBasicInfoValid(store.basicInfo) && targetsValid;

  return (
    <WorkflowShell
      showActionBar
      showPrevious
      showNext
      onPrevious={() => flow.goPrevious({ runId: id })}
      onNext={() => flow.goNext({ runId: id })}
      nextDisabled={!canContinue}
      nextLabel="Save and view report"
    >
      <main className="mx-auto max-w-[1344px] space-y-6 px-8 pt-12 pb-24">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Details</h1>
          <p className="text-sm text-muted-foreground">
            Your evaluation is already complete. These details are only used to render the official
            test report.
          </p>
        </div>

        <BasicInfoContent formData={store.basicInfo} onFormDataChange={store.setBasicInfo} />

        <TrainingDatasetSection
          datasetInfo={store.datasetInfo}
          onDatasetInfoChange={store.setDatasetInfo}
          trainingExampleFiles={store.trainingExampleFiles}
          onTrainingExampleFilesChange={store.setTrainingExampleFiles}
          trainingUnsuitableExampleFiles={store.trainingUnsuitableExampleFiles}
          onTrainingUnsuitableExampleFilesChange={store.setTrainingUnsuitableExampleFiles}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Pass criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set the target each metric must reach for the report to mark it as passing. These values
              do not change the measured results.
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
                      className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 md:grid-cols-[1fr_200px]"
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
                    </div>
                  );
                })}
              </div>
            )}

            <Field label="Report notes">
              <textarea
                className={TEXTAREA_CLASS}
                rows={3}
                value={store.datasetInfo.trainingDataDescription}
                onChange={(event) =>
                  store.setDatasetInfo((prev) => ({
                    ...prev,
                    trainingDataDescription: event.target.value,
                  }))
                }
                placeholder="Anything the reader should know about this evaluation (optional)"
              />
            </Field>
          </CardContent>
        </Card>
      </main>
    </WorkflowShell>
  );
}
