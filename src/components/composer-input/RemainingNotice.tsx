/**
 * Action Bar 에 띄우는 "무엇이 남았는지" 한 줄.
 *
 * 다음 버튼을 잠그는 것만으로는 **어느 칸 때문에 막혔는지** 알 수 없다. 긴 폼에서는 그게
 * 곧 막다른 길이 된다. 그렇다고 빈 칸을 빨갛게 칠하면 아직 입력하지 않은 사용자를 꾸짖는
 * 꼴이라, 대신 여기서 남은 개수와 첫 항목 이름을 말한다.
 *
 * 문구는 무엇이 잘못됐는지부터 적는다(docs/imports/Guidelines.md "Writing Voice").
 */
import type { FieldIssue } from "../../utils/domain/composerFieldGate";

export function RemainingNotice({ issues }: { issues: FieldIssue[] }) {
  if (issues.length === 0) return null;

  const exclusive = issues.find((issue) => issue.reason === "exclusive");
  if (exclusive) {
    return (
      <p className="text-body-small text-muted-foreground">
        {exclusive.label}의 선택을 고쳐 주세요.
      </p>
    );
  }

  const [first] = issues;
  // "모름" 이 없는 필드뿐이라면 그 길을 알려주지 않는다 — ⑤ 평가 관점이 그렇다.
  const canSayUnknown = issues.some((issue) => issue.allowsUnknown);

  return (
    <p className="text-body-small text-muted-foreground">
      {first.label}
      {issues.length > 1 && (
        <>
          {" 외 "}
          <span className="font-mono tabular-nums">{issues.length - 1}</span>
          개
        </>
      )}
      가 비어 있습니다.{canSayUnknown && " 모르면 모름을 고르세요."}
    </p>
  );
}
