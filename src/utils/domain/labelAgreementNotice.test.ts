/**
 * ⑧ 라벨 일치도 — 단순 일치율의 % 단위 안내와 1 이하 경고(서술 라운드 S3b, 점검 나-13). 막지 않는다.
 */
import { describe, expect, it } from "vitest";

import { labelAgreementNotice } from "./composerFieldGate";
import { getCardFields } from "../../data/reportComposer";

const field = getCardFields("groundTruth", "binary").find((f) => f.id === "labelAgreementValue")!;
const values = (kind: string, value: string) => ({
  labelAgreementKind: { text: kind },
  labelAgreementValue: { text: value },
}) as any;

describe("labelAgreementNotice", () => {
  it("필드가 있다(카드 정의가 바뀌면 이 테스트가 먼저 알린다)", () => {
    expect(field).toBeDefined();
  });

  it.each(["0.82", "1", "0.5", " 0.07 "])("단순 일치율 %s 는 비율로 넣은 것 같다고 경고한다", (v) => {
    const notice = labelAgreementNotice(field, values("Percent agreement", v));
    expect(notice?.unit).toBe("%");
    expect(notice?.warning).toMatch(/% 숫자로 넣습니다/);
  });

  it("0.82 경고는 82 를 넣으라고 안내한다", () => {
    expect(labelAgreementNotice(field, values("Percent agreement", "0.82"))?.warning).toContain("82 을(를) 넣으세요");
  });

  it.each(["82", "1.5", "100", "", "0", "abc"])("단순 일치율 %s 는 경고하지 않는다(단위 안내만)", (v) => {
    expect(labelAgreementNotice(field, values("Percent agreement", v))).toEqual({ unit: "%", warning: null });
  });

  it("카파·알파면 아무것도 돌려주지 않는다", () => {
    expect(labelAgreementNotice(field, values("Cohen's kappa", "0.71"))).toBeNull();
  });

  it("다른 필드에는 돌려주지 않는다", () => {
    const other = getCardFields("groundTruth", "binary").find((f) => f.id === "labelAgreementKind")!;
    expect(labelAgreementNotice(other, values("Percent agreement", "0.5"))).toBeNull();
  });
});
