import { FormEvent, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

/**
 * 워크스페이스 생성 폼. 입력 상태는 자체 관리하고, 제출 시 onCreate 로 값을 올려보낸 뒤 필드를 초기화한다.
 * WorkspaceList 페이지에서 사용한다.
 */
interface WorkspaceCreateFormProps {
  onCreate: (input: { name: string; description: string }) => void;
}

export function WorkspaceCreateForm({ onCreate }: WorkspaceCreateFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, description });
    setName("");
    setDescription("");
  };

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Create Workspace</CardTitle>
        <CardDescription>
          Name the workspace by model group, evaluation goal, or dataset.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Document classification model comparison"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-description">Description</Label>
            <Input
              id="workspace-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Evaluation goal or dataset"
            />
          </div>
          <Button type="submit" disabled={!name.trim()}>
            Create
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
