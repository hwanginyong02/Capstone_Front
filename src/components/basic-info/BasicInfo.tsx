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
              <CardTitle className="text-lg font-semibold">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Company name" required>
                  <Input value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} />
                </Field>
                <Field label="Representative" required>
                  <Input value={formData.representative} onChange={(e) => update("representative", e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Business number" required>
                  <Input value={formData.businessNumber} onChange={(e) => update("businessNumber", e.target.value)} />
                </Field>
                <Field label="Website">
                  <Input value={formData.website} onChange={(e) => update("website", e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Phone" required>
                  <Input value={formData.phone} onChange={(e) => update("phone", e.target.value)} />
                </Field>
                <Field label="Fax">
                  <Input value={formData.fax} onChange={(e) => update("fax", e.target.value)} />
                </Field>
              </div>

              <Field label="Address" required>
                <Input value={formData.address} onChange={(e) => update("address", e.target.value)} />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 스토어는 ISO 날짜 문자열을 들고, Date 변환은 이 UI 경계에서만 한다
                    (ISSUES.md E-09 — 상태가 localStorage 를 왕복해도 타입이 붕괴하지 않게). */}
                <DateField
                  label="Evaluation request date"
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
                Report purpose <span className="text-red-600">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <RadioGroup value={formData.reportPurpose} onValueChange={(value) => update("reportPurpose", value)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <ChoiceCard id="internal" title="Internal validation" description="Use for internal QA or model monitoring" selected={formData.reportPurpose === "internal"} />
                  <ChoiceCard id="external" title="External submission" description="Use for customers or review organizations" selected={formData.reportPurpose === "external"} />
                  <ChoiceCard id="project" title="Project deliverable" description="Use for funded project evidence" selected={formData.reportPurpose === "project"} />
                </div>
              </RadioGroup>

              {formData.reportPurpose === "project" && (
                <div className="space-y-5">
                  <Field label="Project name" required>
                    <Input value={formData.projectName} onChange={(e) => update("projectName", e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Project agency" required>
                      <Input value={formData.projectAgency} onChange={(e) => update("projectAgency", e.target.value)} />
                    </Field>
                    <Field label="Project number">
                      <Input value={formData.projectNumber} onChange={(e) => update("projectNumber", e.target.value)} />
                    </Field>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Model information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 모델명·버전은 업로드 단계에서 받는다 — 성적서를 내지 않는 run 도 이름이
                  있어야 워크스페이스에서 모델별로 묶이기 때문이다. 여기서 한 번 더
                  입력받으면 같은 값을 두 화면이 편집하게 되므로 읽기 전용으로만 보여준다. */}
              <ReadOnlyModelIdentity modelName={formData.modelName} versionName={formData.versionName} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Model purpose" required>
                  <Input
                    value={formData.modelPurpose}
                    onChange={(e) => update("modelPurpose", e.target.value)}
                    placeholder="e.g. Vision-based surface defect prediction"
                  />
                </Field>
                <Field label="Model category" required>
                  <Input
                    value={formData.modelCategory}
                    onChange={(e) => update("modelCategory", e.target.value)}
                    placeholder="e.g. Classification model (Neural Network)"
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
              <CardTitle className="text-lg font-semibold">Test environment</CardTitle>
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
          <div className="text-xs text-muted-foreground">Model name</div>
          <div className="mt-1 text-sm font-medium text-foreground">{modelName || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Version</div>
          <div className="mt-1 text-sm font-medium text-foreground">{versionName || "—"}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Set in the evaluation file step. Start a new version from the workspace to change it.
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
        {label} {required && <span className="text-red-600">*</span>}
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
        {label} {required && <span className="text-red-600">*</span>}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "yyyy-MM-dd") : "Select date"}
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
        selected ? "border-primary bg-blue-50" : "border-border bg-card hover:border-gray-400",
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
        {expanded ? "Hide environment fields" : "Add environment fields"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="OS">
              <Input value={data.envOS} onChange={(e) => onChange("envOS", e.target.value)} />
            </Field>
            <Field label="CPU">
              <Input value={data.envCPU} onChange={(e) => onChange("envCPU", e.target.value)} />
            </Field>
            <Field label="GPU">
              <Input value={data.envGPU} onChange={(e) => onChange("envGPU", e.target.value)} />
            </Field>
            <Field label="Memory">
              <Input value={data.envMemory} onChange={(e) => onChange("envMemory", e.target.value)} />
            </Field>
          </div>
          <Field label="Software stack">
            <Input value={data.envSoftware} onChange={(e) => onChange("envSoftware", e.target.value)} />
          </Field>
        </div>
      )}
    </>
  );
}

