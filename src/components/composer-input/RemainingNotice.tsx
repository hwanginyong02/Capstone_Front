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

interface RemainingNoticeProps {
  issues: FieldIssue[];
  /**
   * 화면의 언어. 평가 구간은 영어, 발급 구간의 새 화면은 한국어라 둘 다 필요하다.
   * 앱 전체 문구 정리 전까지의 임시 상태다(docs/WORKFLOW_REDESIGN.md §6.3).
   */
  lang?: "ko" | "en";
}

export function RemainingNotice({ issues, lang = "ko" }: RemainingNoticeProps) {
  if (issues.length === 0) return null;

  const exclusive = issues.find((issue) => issue.reason === "exclusive");
  if (exclusive) {
    return (
      <p className="text-body-small text-muted-foreground">
        {lang === "en"
          ? `Fix the selection for ${exclusive.label}.`
          : `${exclusive.label}의 선택을 고쳐 주세요.`}
      </p>
    );
  }

  const [first] = issues;
  // "모름" 이 없는 필드뿐이라면 그 길을 알려주지 않는다 — ⑤ 평가 관점이 그렇다.
  const canSayUnknown = issues.some((issue) => issue.allowsUnknown);
  const more = issues.length - 1;

  if (lang === "en") {
    return (
      <p className="text-body-small text-muted-foreground">
        {first.label}
        {more > 0 && (
          <>
            {" and "}
            <span className="font-mono tabular-nums">{more}</span>
            {" more"}
          </>
        )}
        {" "}
        {more > 0 ? "are" : "is"} empty.
        {canSayUnknown && " Choose Unknown if you do not know."}
      </p>
    );
  }

  return (
    <p className="text-body-small text-muted-foreground">
      {first.label}
      {more > 0 && (
        <>
          {" 외 "}
          <span className="font-mono tabular-nums">{more}</span>
          개
        </>
      )}
      가 비어 있습니다.{canSayUnknown && " 모르면 모름을 고르세요."}
    </p>
  );
}
