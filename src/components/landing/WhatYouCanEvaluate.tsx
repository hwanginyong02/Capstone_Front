import { Database, Gauge, Layers3 } from "lucide-react";

/**
 * 랜딩 "What you can evaluate" 섹션. 지원하는 분류 유형(이진/다중클래스/다중레이블) 카드를 렌더한다.
 */
export function WhatYouCanEvaluate() {
  const items = [
    {
      title: "Binary classification",
      description: "Evaluate models that choose between two classes, such as pass/fail, positive/negative, or normal/abnormal.",
      icon: Gauge,
    },
    {
      title: "Multiclass classification",
      description: "Evaluate models that assign one class from many possible categories, such as product type or document topic.",
      icon: Layers3,
    },
    {
      title: "Multilabel classification",
      description: "Evaluate models that can assign multiple labels to one sample, such as tags, attributes, or detected issues.",
      icon: Database,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-lg border bg-card p-6">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <item.icon className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}
