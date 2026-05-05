import * as React from "react";
import { AppHeader } from "./AppHeader";
import { StepTabs } from "./StepTabs";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { CalendarIcon, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "../ui/utils";
import type { BasicInfoFormData } from "../../types/workflow.types";

interface BasicInfoProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  formData: BasicInfoFormData;
  onFormDataChange: (value: BasicInfoFormData | ((prev: BasicInfoFormData) => BasicInfoFormData)) => void;
  onTaskTypeChange?: (type: string) => void;
}

export function BasicInfo({
  currentStep,
  completedSteps,
  onStepClick,
  onNext,
  onPrevious: _onPrevious,
  formData,
  onFormDataChange,
  onTaskTypeChange,
}: BasicInfoProps) {
  const update = <K extends keyof BasicInfoFormData>(field: K, value: BasicInfoFormData[K]) => {
    onFormDataChange((prev) => ({ ...prev, [field]: value }));
  };

  const handleTaskTypeChange = (value: string) => {
    update("taskType", value as BasicInfoFormData["taskType"]);
    onTaskTypeChange?.(value);
  };

  const isFormValid = () => {
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
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <StepTabs currentStep={currentStep} completedSteps={completedSteps} onStepClick={onStepClick} />

      <main className="px-8 pt-12 pb-32 max-w-[1280px] mx-auto">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">Basic information</h1>
          <p className="text-sm text-muted-foreground">
            Fill in the organization, model, and evaluation request details used throughout the workflow.
          </p>
        </div>

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
                <DateField
                  label="Contract date"
                  required
                  value={formData.contractDate}
                  onChange={(value) => update("contractDate", value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Report purpose</CardTitle>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Model name" required>
                  <Input value={formData.modelName} onChange={(e) => update("modelName", e.target.value)} />
                </Field>
                <Field label="Version" required>
                  <Input value={formData.versionName} onChange={(e) => update("versionName", e.target.value)} />
                </Field>
              </div>

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

              <div className="space-y-3">
                <Label>
                  Classifier type <span className="text-red-600">*</span>
                </Label>
                <RadioGroup value={formData.taskType} onValueChange={handleTaskTypeChange} className="space-y-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <ClassifierCard id="binary" title="Binary" description="One of two classes per sample" selected={formData.taskType === "binary"} />
                    <ClassifierCard id="multiclass" title="Multi-class" description="One of many classes per sample" selected={formData.taskType === "multiclass"} />
                    <ClassifierCard id="multilabel" title="Multi-label" description="Multiple labels can be assigned" selected={formData.taskType === "multilabel"} />
                  </div>
                </RadioGroup>
              </div>
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
      </main>

      <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-card border-t border-border flex items-center justify-between px-8 z-10">
        <Button variant="outline">Save draft</Button>
        <Button onClick={onNext} disabled={!isFormValid()}>
          Next step
        </Button>
      </div>
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
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus />
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

function ClassifierCard({
  id,
  title,
  description,
  selected,
  radioValue,
}: {
  id: string;
  title: string;
  description: string;
  selected: boolean;
  radioValue?: string;
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
        <RadioGroupItem value={radioValue ?? id} id={id} className="mt-0.5" />
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

