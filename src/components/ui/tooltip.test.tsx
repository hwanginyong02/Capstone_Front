/**
 * 툴팁 — jsdom 에서 열려야 한다(N5). Radix 의 Arrow 는 ResizeObserver 없이 깨지므로 그리지 않는다.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

describe("Tooltip", () => {
  it("Provider 없이 단독으로 쓰고, 포커스를 받으면 설명이 뜬다", async () => {
    render(
      <Tooltip>
        <TooltipTrigger>분류 유형</TooltipTrigger>
        <TooltipContent>누르면 바꿀 수 있어요</TooltipContent>
      </Tooltip>,
    );

    await userEvent.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("누르면 바꿀 수 있어요");
  });
});
