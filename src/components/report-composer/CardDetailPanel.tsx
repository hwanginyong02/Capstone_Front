/**
 * 상세 영역 — 지금 보고 있는 카드의 설명과 필드 표.
 *
 * 한 번에 한 카드만 보인다. 카드를 바꿀 때 높이가 크게 출렁이지 않도록 최소 높이 320px 를
 * 두고, 전환 애니메이션은 쓰지 않는다(docs/COMPOSER_DESIGN.md "상세 영역").
 *
 * 카드가 바뀌면 `aria-live` 로 새 카드 이름을 알린다 — 카드를 눌렀을 때 화면 아래가 바뀌는
 * 것은 스크린리더에게 보이지 않는 변화다.
 */
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { FieldTable } from "./FieldTable";
import { CsvExampleViewer } from "./CsvExampleViewer";
import { MetricListViewer } from "./MetricListViewer";
import { countAdvancedFields, getCardFields } from "../../data/reportComposer";
import type { TaskType } from "../../data/evaluationData";
import type { ComposerCard } from "../../types/reportComposer.types";

interface CardDetailPanelProps {
  card: ComposerCard;
  taskType: TaskType;
  /** 성적서에 들어가는지 — 상태 배지에 쓴다. */
  included: boolean;
}

const VIEWER_LABEL = {
  csvExample: "예시 파일 보기",
  metricList: "고를 수 있는 지표 보기",
} as const;

export function CardDetailPanel({ card, taskType, included }: CardDetailPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  // 다른 카드로 바꾸면 펼친 내용은 닫는다(docs/COMPOSER_DESIGN.md "보기 버튼과 펼친 내용").
  useEffect(() => {
    setShowAdvanced(false);
    setShowViewer(false);
  }, [card.id]);

  const fields = getCardFields(card.id, taskType, { includeAdvanced: showAdvanced });
  const advancedCount = countAdvancedFields(card.id, taskType);

  return (
    <Card
      aria-live="polite"
      className="min-h-80 gap-0 rounded-lg border-border bg-card"
    >
      <CardHeader className="grid-cols-[1fr_auto] gap-0 p-6">
        <div>
          <h3 className="text-heading-medium font-semibold text-foreground">
            {card.number} {card.name}
          </h3>
          <p className="mt-2 text-body-small text-muted-foreground">{card.description}</p>
        </div>
        <Badge
          variant={included ? "secondary" : "outline"}
          className="rounded-sm text-body-xs font-medium"
        >
          {card.locked ? "필수" : included ? "선택 · 켜짐" : "선택 · 꺼짐"}
        </Badge>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        <FieldTable
          fields={fields}
          advancedCount={advancedCount}
          expanded={showAdvanced}
          onToggleExpanded={() => setShowAdvanced((prev) => !prev)}
        />

        {card.help && (
          <div className="mt-5 flex gap-2">
            {/* 장식이 아니라 "설명 문구"라는 표시다. */}
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-body-small text-muted-foreground">{card.help}</p>
          </div>
        )}

        {card.viewer && (
          <div className="mt-5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowViewer((prev) => !prev)}
              className="text-body-medium font-medium"
            >
              {VIEWER_LABEL[card.viewer]}
              {showViewer ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showViewer && (
              <div className="mt-4">
                {card.viewer === "csvExample" ? (
                  <CsvExampleViewer taskType={taskType} />
                ) : (
                  <MetricListViewer taskType={taskType} />
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
