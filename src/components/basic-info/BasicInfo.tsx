/**
 * ③ 의뢰자 정보와 ④ 평가 대상 모델의 입력 폼. 값은 `basicInfo` 에 담긴다 — 카드가 생기기 전부터
 * 성적서가 이 저장소를 읽어 왔다.
 *
 * 종전에는 한 화면(Details)에 회사 정보·용도·모델 정보·시험 환경이 함께 있었다. 이제 카드마다
 * 자기 단계가 있다(docs/MATERIAL_PICKER.md §5): 의뢰자 정보는 ③ 만, 평가 대상 모델은 ④ 만 받는다.
 * 시험 환경은 ⑨ 모델 설정과 실행 환경 카드가 받는다(성적서는 그 값을 `basicInfo.env*` 로 옮겨
 * 읽는다 — `buildReportInput`).
 *
 * ③ 의 선택 항목(홈페이지·팩스·과제 번호·평가 의뢰일)은 재료 고르기에서 체크한 것만 보인다
 * (`picks`). 평가 의뢰일을 고르지 않으면 오늘 날짜가 그대로 들어간다.
 */
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "../../utils/styling/styles";
import type { BasicInfoFormData } from "../../types/workflow.types";
import { fromIsoDate, toIsoDate } from "../../utils/domain/isoDate";
import { getCard, isFieldPicked, isPartPicked } from "../../data/reportComposer";
import { TEXTAREA_CLASS } from "../data-upload/shared";

type FormDataSetter = (
  value: BasicInfoFormData | ((prev: BasicInfoFormData) => BasicInfoFormData),
) => void;

/** ③ 의뢰자 정보 — 회사·성적서 용도·과제. */
export function isClientInfoValid(formData: BasicInfoFormData): boolean {
  const baseValid = Boolean(
    formData.companyName &&
      formData.representative &&
      formData.businessNumber &&
      formData.phone &&
      formData.address &&
      formData.contractDate &&
      formData.reportPurpose,
  );
  if (formData.reportPurpose === "project") {
    return baseValid && Boolean(formData.projectName && formData.projectAgency);
  }
  return baseValid;
}

/** ④ 평가 대상 모델 — 이름·버전·용도·분류. 이름·버전은 run 을 식별하는 이름표이기도 하다. */
export function isModelInfoValid(formData: BasicInfoFormData): boolean {
  return Boolean(
    formData.modelName.trim() &&
      formData.versionName.trim() &&
      formData.modelPurpose.trim() &&
      formData.modelCategory.trim(),
  );
}

/** ③ 의 선택 항목을 재료 고르기에서 받기로 했는지. */
function clientPicks(picks: readonly string[] | undefined) {
  const card = getCard("clientInfo");
  const field = (id: string) => card.fields.find((item) => item.id === id)!;
  return {
    website: isPartPicked(field("contactExtra"), "website", picks),
    fax: isPartPicked(field("contactExtra"), "fax", picks),
    projectNumber: isFieldPicked(card, field("projectNumber"), picks),
    requestDate: isFieldPicked(card, field("requestDate"), picks),
  };
}

interface ClientInfoFormProps {
  formData: BasicInfoFormData;
  onFormDataChange: FormDataSetter;
  /** 재료 고르기에서 ③ 에 저장한 체크. 없으면 선택 항목을 모두 보인다. */
  picks?: readonly string[];
}

export function ClientInfoForm({ formData, onFormDataChange, picks }: ClientInfoFormProps) {
  const update = <K extends keyof BasicInfoFormData>(field: K, value: BasicInfoFormData[K]) => {
    onFormDataChange((prev) => ({ ...prev, [field]: value }));
  };
  const show = clientPicks(picks);

  return (
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
            <Field label="사업자등록번호" required>
              <Input value={formData.businessNumber} onChange={(e) => update("businessNumber", e.target.value)} />
            </Field>
            <Field label="전화번호" required>
              <Input value={formData.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            {show.website && (
              <Field label="홈페이지">
                <Input value={formData.website} onChange={(e) => update("website", e.target.value)} />
              </Field>
            )}
            {show.fax && (
              <Field label="팩스">
                <Input value={formData.fax} onChange={(e) => update("fax", e.target.value)} />
              </Field>
            )}
          </div>

          <Field label="주소" required>
            <Input value={formData.address} onChange={(e) => update("address", e.target.value)} />
          </Field>

          {show.requestDate && (
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
          )}
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
              <ChoiceCard id="project" title="과제 산출물" description="지원 과제의 증빙으로 냅니다" selected={formData.reportPurpose === "project"} />
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
              </div>
            </div>
          )}

          {/* 과제 번호는 용도와 무관한 선택 항목이다(재료 목록 1절 — 점검 밖, 1절 인쇄). 재료 고르기에서
              골랐을 때만 받는다. */}
          {show.projectNumber && (
            <Field label="과제 번호">
              <Input value={formData.projectNumber} onChange={(e) => update("projectNumber", e.target.value)} />
            </Field>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ModelInfoFormProps {
  formData: BasicInfoFormData;
  onFormDataChange: FormDataSetter;
}

/**
 * ④ 평가 대상 모델. 종전에는 이름·버전을 업로드 화면에서, 용도를 Details 에서 따로 받았다
 * (docs/MATERIAL_PICKER.md §5 "한 화면으로 모은다").
 */
export function ModelInfoForm({ formData, onFormDataChange }: ModelInfoFormProps) {
  const update = <K extends keyof BasicInfoFormData>(field: K, value: BasicInfoFormData[K]) => {
    onFormDataChange((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">모델</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          모델 이름과 버전은 워크스페이스에서 이 평가를 가리키는 이름이고, 성적서에도 적힙니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="모델 이름" required>
            <Input
              value={formData.modelName}
              onChange={(e) => update("modelName", e.target.value)}
              placeholder="예: 표면 결함 검출기"
            />
          </Field>
          <Field label="버전" required>
            <Input
              className="font-mono"
              value={formData.versionName}
              onChange={(e) => update("versionName", e.target.value)}
              placeholder="예: v1.0.0"
            />
          </Field>
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
      </CardContent>
    </Card>
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
