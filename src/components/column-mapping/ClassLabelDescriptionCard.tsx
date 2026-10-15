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
          Class label descriptions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Describe what each class means (e.g. <strong>cat</strong> = photos of domestic cats).
            These descriptions appear in the evaluation dataset section of the final report. This is optional.
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
                    placeholder="Describe this class label"
                  />
                </div>
              ))}
            </div>
          ) : (
            <Alert className="bg-muted border-border">
              <Info className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-muted-foreground">
                Assign a column to the <strong>y_true</strong> role first to list the detected class labels.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
