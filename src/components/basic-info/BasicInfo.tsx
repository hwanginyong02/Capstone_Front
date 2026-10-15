import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { CalendarIcon, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "../../utils/styling/styles";
import type { BasicInfoFormData } from "../../types/workflow.types";
import { fromIsoDate, toIsoDate } from "../../utils/domain/isoDate";
import { TEXTAREA_CLASS } from "../data-upload/shared";

interface BasicInfoProps {
  formData: BasicInfoFormData;
  onFormDataChange: (value: BasicInfoFormData | ((prev: BasicInfoFormData) => BasicInfoFormData)) => void;
}

export function isBasicInfoValid(formData: BasicInfoFormData) {
  const baseValid =
    formData.companyName &&
    formData.representative &&
    formData.businessNumber &&
    formData.phone &&
    formData.address &&
    formData.contractDate &&
    formData.reportPurpose &&
    formData.versionName &&
    formData.modelName &&
    formData.modelPurpose &&
    formData.modelCategory &&
    formData.taskType;

  if (formData.reportPurpose === "project") {
    return baseValid && formData.projectName && formData.projectAgency;
  }

  return !!baseValid;
}

export function BasicInfo({
  formData,
  onFormDataChange,
}: BasicInfoProps) {
  const update = <K extends keyof BasicInfoFormData>(field: K, value: BasicInfoFormData[K]) => {
    onFormDataChange((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <div>
        <div className="space-y-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">회사 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="회사명" required>
                  <Input value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} />
                </Field>
                <Field label="대표자" required>
                  <Input value={formData.representative} onChange={(e) => update("representative", e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="사업자등록번호" required>
                  <Input value={formData.businessNumber} onChange={(e) => update("businessNumber", e.target.value)} />
                </Field>
                <Field label="홈페이지">
                  <Input value={formData.website} onChange={(e) => update("website", e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="전화번호" required>
                  <Input value={formData.phone} onChange={(e) => update("phone", e.target.value)} />
                </Field>
                <Field label="팩스">
                  <Input value={formData.fax} onChange={(e) => update("fax", e.target.value)} />
                </Field>
              </div>

              <Field label="주소" required>
                <Input value={formData.address} onChange={(e) => update("address", e.target.value)} />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 스토어는 ISO 날짜 문자열을 들고, Date 변환은 이 UI 경계에서만 한다
                    (ISSUES.md E-09 — 상태가 localStorage 를 왕복해도 타입이 붕괴하지 않게). */}
                <DateField
                  label="평가 의뢰일"
                  required
                  value={fromIsoDate(formData.contractDate) ?? new Date()}
                  onChange={(value) => update("contractDate", toIsoDate(value ?? new Date()))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                성적서 용도 <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <RadioGroup value={formData.reportPurpose} onValueChange={(value) => update("reportPurpose", value)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <ChoiceCard id="internal" title="내부 검증" description="사내 품질 확인이나 모델 모니터링에 씁니다" selected={formData.reportPurpose === "internal"} />
                  <ChoiceCard id="external" title="외부 제출" description="고객사나 심사 기관에 냅니다" selected={formData.reportPurpose === "external"} />
                  <ChoiceCard id="project" title="과제 제출" description="지원 과제의 증빙으로 냅니다" selected={formData.reportPurpose === "project"} />
                </div>
              </RadioGroup>

              {/* 덧붙이는 글(서술 설계 D26). 성적서 1.3 개요 칸에 "의뢰자 제공"으로 실린다. */}
              <Field label="용도에 덧붙이는 글">
                <textarea
                  className={TEXTAREA_CLASS}
                  rows={2}
                  value={formData.reportPurposeNote ?? ""}
                  onChange={(e) => update("reportPurposeNote", e.target.value)}
                  placeholder="이 성적서를 왜 발급하는지 읽는 사람이 알아야 할 것 (선택)"
                />
              </Field>

              {formData.reportPurpose === "project" && (
                <div className="space-y-5">
                  <Field label="과제명" required>
                    <Input value={formData.projectName} onChange={(e) => update("projectName", e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="과제 기관" required>
                      <Input value={formData.projectAgency} onChange={(e) => update("projectAgency", e.target.value)} />
                    </Field>
                    <Field label="과제 번호">
                      <Input value={formData.projectNumber} onChange={(e) => update("projectNumber", e.target.value)} />
                    </Field>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">모델 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 모델명·버전은 업로드 단계에서 받는다 — 성적서를 내지 않는 run 도 이름이
                  있어야 워크스페이스에서 모델별로 묶이기 때문이다. 여기서 한 번 더
                  입력받으면 같은 값을 두 화면이 편집하게 되므로 읽기 전용으로만 보여준다. */}
              <ReadOnlyModelIdentity modelName={formData.modelName} versionName={formData.versionName} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="모델 용도" required>
                  <Input
                    value={formData.modelPurpose}
                    onChange={(e) => update("modelPurpose", e.target.value)}
                    placeholder="예: 영상 기반 표면 결함 예측"
                  />
                </Field>
                <Field label="모델 분류" required>
                  <Input
                    value={formData.modelCategory}
                    onChange={(e) => update("modelCategory", e.target.value)}
                    placeholder="예: 분류 모델 (신경망)"
                  />
                </Field>
              </div>

              {/* 분류 유형(Classifier type)은 워크플로우 진입 화면(`/app`)으로 옮겼다
                  (docs/UI_DESIGN.md §1). 앱 전체를 가르는 선택이 필수 입력 12개 중
                  마지막에 놓여 있었다. 현재 유형은 헤더 배지에서 확인·변경한다. */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">시험 환경</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpandableEnvironment
                data={formData}
                onChange={update}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * 업로드 단계에서 정한 모델 이름표를 성적서 구간에서 **확인만** 하게 한다.
 * 고치려면 업로드 화면으로 돌아가야 한다 — 편집 지점이 둘이면 어느 쪽이 참인지
 * 화면만 보고는 알 수 없다.
 */
function ReadOnlyModelIdentity({
  modelName,
  versionName,
}: {
  modelName: string;
  versionName: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">모델 이름</div>
          <div className="mt-1 text-sm font-medium text-foreground">{modelName || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">버전</div>
          <div className="mt-1 text-sm font-medium text-foreground">{versionName || "—"}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        평가 데이터 단계에서 정합니다. 바꾸려면 그 단계로 돌아가세요.
      </p>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function DateField({
  label,
  required = false,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value?: Date;
  onChange: (value?: Date) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "yyyy-MM-dd") : "날짜 선택"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus disabled={(date) => date > new Date()} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ChoiceCard({
  id,
  title,
  description,
  selected,
}: {
  id: string;
  title: string;
  description: string;
  selected: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex flex-col p-5 rounded-lg border-2 cursor-pointer transition-colors",
        selected ? "border-primary bg-primary-subtle" : "border-border bg-card hover:border-border-strong",
      )}
    >
      <div className="flex items-start gap-2">
        <RadioGroupItem value={id} id={id} />
        <div className="flex-1">
          <div className="text-sm font-semibold mb-1">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
    </label>
  );
}

function ExpandableEnvironment({
  data,
  onChange,
}: {
  data: BasicInfoFormData;
  onChange: <K extends keyof BasicInfoFormData>(field: K, value: BasicInfoFormData[K]) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-0"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {expanded ? "환경 항목 접기" : "환경 항목 추가"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="운영체제">
              <Input value={data.envOS} onChange={(e) => onChange("envOS", e.target.value)} />
            </Field>
            <Field label="CPU">
              <Input value={data.envCPU} onChange={(e) => onChange("envCPU", e.target.value)} />
            </Field>
            <Field label="GPU">
              <Input value={data.envGPU} onChange={(e) => onChange("envGPU", e.target.value)} />
            </Field>
            <Field label="메모리">
              <Input value={data.envMemory} onChange={(e) => onChange("envMemory", e.target.value)} />
            </Field>
          </div>
          <Field label="소프트웨어">
            <Input value={data.envSoftware} onChange={(e) => onChange("envSoftware", e.target.value)} />
          </Field>
        </div>
      )}
    </>
  );
}

