import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type {
  KpiResult,
  MaterialCheckResult,
  ValidationResult,
  ValidationSummary,
} from "../../../types/finalReport.types";
import type { ValidationGroup } from "../../../types/validation.types";
import { SectionTitle } from "../shared/SectionTitle";
import { cn } from "../../../utils/styling/styles";
import { isLegacyTaskTypeLabel, TASK_TYPE_LABELS_KO } from "../../../data/evaluationData";
import { SubsectionTitle } from "../shared/SubsectionTitle";

const STATUS_CONFIG = {
  pass:    { icon: CheckCircle2,  color: "text-emerald-500", label: "통과" },
  warning: { icon: AlertTriangle, color: "text-amber-500",   label: "경고" },
  fail:    { icon: XCircle,       color: "text-red-500",     label: "오류" },
} as const;

type GroupMeta = Record<ValidationGroup, { label: string; description: string }>;

const GROUP_META: GroupMeta = {
  common:     { label: "공통 검증 항목",        description: "모든 분류 유형에 공통 적용" },
  // 유형 이름은 화면·성적서와 같은 한국어 표(W9). 종전에는 영문(Multiclass 등)이었다.
  multiclass: { label: `${TASK_TYPE_LABELS_KO.multiclass} 검증 항목`, description: `분류 유형이 ${TASK_TYPE_LABELS_KO.multiclass}인 경우 적용` },
  binary:     { label: `${TASK_TYPE_LABELS_KO.binary} 검증 항목`,     description: `분류 유형이 ${TASK_TYPE_LABELS_KO.binary}인 경우 적용` },
  multilabel: { label: `${TASK_TYPE_LABELS_KO.multilabel} 검증 항목`, description: `분류 유형이 ${TASK_TYPE_LABELS_KO.multilabel}인 경우 적용` },
  latency:    { label: "응답시간 검증 항목",    description: "응답시간(latency) 컬럼이 있는 경우 적용" },
};

/**
 * W9 이전의 묶음 이름·설명(6392c78 시점 글자 그대로). 옛 발급본(저장된 유형 이름이 영문)은 이 표로
 * 그린다 — 사용자 결정 "발급본은 그대로". 묶음 이름은 저장하지 않고 그릴 때 정하기 때문이다.
 */
const LEGACY_GROUP_META: GroupMeta = {
  common:     { label: "공통 검증 항목",        description: "모든 태스크 유형에 공통 적용" },
  multiclass: { label: "다중 분류 검증 항목",   description: "태스크 유형이 Multiclass인 경우 적용" },
  binary:     { label: "이진 분류 검증 항목",   description: "태스크 유형이 Binary인 경우 적용" },
  multilabel: { label: "다중 레이블 검증 항목", description: "태스크 유형이 Multilabel인 경우 적용" },
  latency:    { label: "응답시간 검증 항목",    description: "응답시간(latency) 컬럼이 있는 경우 적용" },
};

const GROUP_ORDER: ValidationGroup[] = ["common", "multiclass", "binary", "multilabel", "latency"];

interface DataValidationSectionProps {
  dataValidation: ValidationResult[];
  kpiResults: KpiResult[];
  totalSamples: number;
  validationSummary?: ValidationSummary;
  /** 재료 선택 점검 결과. 있으면 6.0 에 세 줄(보고 항목·목적별 점검·생성 전 안내 확인)을 더한다. */
  materialCheck?: MaterialCheckResult;
  /** 저장된 유형 이름(`meta.taskTypeLabel`). 옛 영문 이름이면 묶음 이름을 그때 글자로 그린다(W9 발급본). */
  taskTypeLabel: string;
  /** 판 3 성적서인가(`usesSchema3`) — 소절 번호 등 판 3 모양을 이 판에만 그린다. 판 1·2 보관본은 발급 당시 모양. */
  schema3?: boolean;
}

function GroupBlock({ group, items, legacy }: { group: ValidationGroup; items: ValidationResult[]; legacy: boolean }) {
  const meta = (legacy ? LEGACY_GROUP_META : GROUP_META)[group];
  const failCount    = items.filter((i) => i.status === "fail").length;
  const warningCount = items.filter((i) => i.status === "warning").length;
  const passCount    = items.filter((i) => i.status === "pass").length;

  return (
    <div className="overflow-hidden rounded border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold text-slate-700">{meta.label}</p>
          <p className="text-[11px] text-slate-400">{meta.description}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium">
          {failCount > 0 && (
            <span className="text-red-500">{failCount}건 오류</span>
          )}
          {warningCount > 0 && (
            <span className="text-amber-500">{warningCount}건 경고</span>
          )}
          <span className="text-slate-400">{passCount}건 통과</span>
        </div>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-white">
            <th className="py-2 pr-4 pl-4 text-left font-medium text-slate-400 text-xs">검증 항목</th>
            <th className="py-2 pr-4 text-left font-medium text-slate-400 text-xs w-20">결과</th>
            <th className="py-2 pr-4 text-left font-medium text-slate-400 text-xs">상세 내역</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const { icon: Icon, color, label } = STATUS_CONFIG[row.status];
            return (
              <tr key={row.checkName} className="border-b border-slate-100 last:border-b-0">
                <td className="py-2.5 pr-4 pl-4 text-slate-700">{row.checkName}</td>
                <td className="py-2.5 pr-4">
                  <span className={cn("flex items-center gap-1 font-medium whitespace-nowrap", color)}>
                    <Icon className="size-3.5" />
                    {label}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-slate-500 text-xs">{row.detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DataValidationSection({
  dataValidation,
  kpiResults,
  totalSamples,
  validationSummary,
  materialCheck,
  taskTypeLabel,
  schema3,
}: DataValidationSectionProps) {
  const legacyNames = isLegacyTaskTypeLabel(taskTypeLabel);
  const failCount    = dataValidation.filter((r) => r.status === "fail").length;
  const warningCount = dataValidation.filter((r) => r.status === "warning").length;

  // '수행된' 시험항목 = 계산에 성공한 지표만. 측정 불가(unavailable)는 별도 표기(D4).
  const performedKpis   = kpiResults.filter((r) => r.status !== "unavailable");
  const unavailableKpis = kpiResults.filter((r) => r.status === "unavailable");

  // 검증 수행 요약 수치: 실측값(validationSummary)이 있으면 사용, 없으면 totalSamples로 fallback
  const totalRows    = validationSummary?.totalRows ?? totalSamples;
  const validRows    = validationSummary?.validRows ?? totalSamples;
  const excludedRows = validationSummary?.excludedRows ?? 0;

  const hasValidation = dataValidation.length > 0;
  const groupedSections = GROUP_ORDER
    .map((group) => ({ group, items: dataValidation.filter((i) => i.group === group) }))
    .filter(({ items }) => items.length > 0);

  return (
    <section className="space-y-8 border-t border-slate-200 py-10">
      <SectionTitle number={6} title="시험 결과" />

      {/* 6.0 시험 수행 요약 */}
      <div className="space-y-3">
        <SubsectionTitle number="6.0" schema3={schema3} className="text-sm font-semibold text-slate-700">시험 수행 요약</SubsectionTitle>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-2 pr-4 text-left font-medium text-slate-500">항목</th>
              <th className="py-2 pr-4 text-left font-medium text-slate-500">값</th>
              <th className="py-2 text-left font-medium text-slate-500">비고</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 pr-4 font-semibold text-slate-700">총 검증 수행 건수</td>
              <td className="py-2.5 pr-4 font-semibold text-slate-900">{totalRows.toLocaleString()}건</td>
              <td className="py-2.5 text-slate-500 text-xs">업로드 데이터 전체 행(row) 수 = 고유 ID 수</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 pr-4 font-semibold text-slate-700">유효 예측 건수</td>
              <td className="py-2.5 pr-4 font-semibold text-slate-900">{validRows.toLocaleString()}건</td>
              <td className="py-2.5 text-slate-500 text-xs">누락값·오류 제외 후 실제 metric 산출에 사용된 건수</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 pr-4 font-semibold text-slate-700">제외된 샘플 수</td>
              <td className="py-2.5 pr-4 text-slate-900">{excludedRows.toLocaleString()}건</td>
              <td className="py-2.5 text-slate-500 text-xs">누락값/오류로 인해 평가에서 제외된 건수</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 pr-4 font-semibold text-slate-700">수행된 시험항목 수</td>
              <td className="py-2.5 pr-4 font-semibold text-slate-900">
                {performedKpis.length}개
                {unavailableKpis.length > 0 && (
                  <span className="ml-1 font-normal text-slate-400">/ 측정 불가 {unavailableKpis.length}개</span>
                )}
              </td>
              <td className="py-2.5 text-slate-500 text-xs">
                선택된 Metric ID 목록: {performedKpis.map((r) => r.metricId).join(", ")}
                {unavailableKpis.length > 0 && (
                  <> · 측정 불가: {unavailableKpis.map((r) => r.metricId).join(", ")}</>
                )}
              </td>
            </tr>
            {/* 재료 선택 점검(고정 문구 14 · 2.1 "한눈에 보기") — 생성 때 만든 문구를 그대로 찍는다. */}
            {materialCheck?.printed.summary.map((row) => (
              <tr key={row.label} className="border-b border-slate-100">
                <td className="py-2.5 pr-4 font-semibold text-slate-700">{row.label}</td>
                <td className="py-2.5 pr-4 text-slate-900">{row.value}</td>
                <td className="py-2.5 text-slate-500 text-xs">{row.note}</td>
              </tr>
            ))}
            <tr>
              <td className="py-2.5 pr-4 font-semibold text-slate-700">데이터 검증 결과</td>
              <td className="py-2.5 pr-4 text-slate-900">
                오류 {failCount}건 / 경고 {warningCount}건
              </td>
              <td className="py-2.5 text-slate-500 text-xs">상세 내역은 6.0.1 참조</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 6.0.1 데이터 검증 상세 */}
      <div className="space-y-3">
        <SubsectionTitle number="6.0.1" schema3={schema3} className="text-sm font-semibold text-slate-700">데이터 검증 상세 내역</SubsectionTitle>
        {hasValidation ? (
          <div className="space-y-3">
            {groupedSections.map(({ group, items }) => (
              <GroupBlock key={group} group={group} items={items} legacy={legacyNames} />
            ))}
          </div>
        ) : (
          <p className="rounded border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-400">
            데이터 검증 결과가 없습니다. (검증 단계를 수행한 평가에서만 표시됩니다.)
          </p>
        )}
      </div>
    </section>
  );
}
