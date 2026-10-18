/**
 * 툴팁 — jsdom 에서 열려야 한다(N5). Radix 의 Arrow 는 ResizeObserver 없이 깨지므로 그리지 않는다.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { vi } from "vitest";

// Provider 가 몇 번 렌더되는지 센다(ESM 이라 spyOn 대신 모듈을 감싼다).
vi.mock("@radix-ui/react-tooltip", async (importOriginal) => {
  const original = await importOriginal<typeof import("@radix-ui/react-tooltip")>();
  return { ...original, Provider: vi.fn(original.Provider) };
});

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

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

  it("바깥에 TooltipProvider 가 있으면 그것을 쓰고 따로 감싸지 않는다", () => {
    const spy = vi.mocked(TooltipPrimitive.Provider);
    spy.mockClear();
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>하나</TooltipTrigger>
          <TooltipContent>설명</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>둘</TooltipTrigger>
          <TooltipContent>설명</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
