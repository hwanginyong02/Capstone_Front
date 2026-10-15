import { Info, Tags } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import type { MappingRow } from "../../types/mapping.types";

interface ClassLabelDescriptionCardProps {
  yTrueRow: MappingRow | undefined;
  yTrueValues: string[];
  classLabelDescriptions: Record<string, string>;
  onClassLabelDescriptionsChange: (
    value:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
}

export function ClassLabelDescriptionCard({
  yTrueRow,
  yTrueValues,
  classLabelDescriptions,
  onClassLabelDescriptionsChange,
}: ClassLabelDescriptionCardProps) {
  const handleChange = (classValue: string, description: string) => {
    onClassLabelDescriptionsChange((prev) => ({
      ...prev,
      [classValue]: description,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Tags className="h-5 w-5 text-primary" />
          클래스 레이블 설명
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            클래스마다 무엇을 뜻하는지 적습니다(예: <strong>cat</strong> = 집고양이 사진).
            이 설명은 성적서의 평가 데이터셋 절에 들어갑니다. 적지 않아도 됩니다.
          </p>

          {yTrueRow && yTrueValues.length > 0 ? (
            <div className="space-y-3">
              {yTrueValues.map((value) => (
                <div key={value} className="flex items-center gap-4">
                  <Badge variant="outline" className="w-[140px] shrink-0 justify-start font-mono">
                    {value}
                  </Badge>
                  <Input
                    value={classLabelDescriptions[value] ?? ""}
                    onChange={(event) => handleChange(value, event.target.value)}
                    placeholder="이 클래스 레이블 설명"
                  />
                </div>
              ))}
            </div>
          ) : (
            <Alert className="bg-muted border-border">
              <Info className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-muted-foreground">
                먼저 <strong>y_true</strong> 역할에 컬럼을 지정하면 찾은 클래스 레이블이 나옵니다.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
