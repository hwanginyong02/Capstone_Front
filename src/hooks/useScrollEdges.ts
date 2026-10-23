/**
 * 스크롤 영역의 위·아래에 가려진 내용이 있는지(docs/MATERIAL_PICKER.md §12.3, U1). 넘친 쪽 가장자리의
 * 1px 선과 "아래에 블록 n개가 더 있어요" 알약이 이것을 쓴다.
 *
 * 판정은 순수 함수 `scrollEdges` 다. 훅은 스크롤과 크기 변화(ResizeObserver — 없으면 스크롤만)를
 * 듣고 다시 계산한다.
 */
import { useEffect, useState, type RefObject } from "react";

export interface ScrollEdges {
  /** 위로 가려진 내용이 있다. */
  top: boolean;
  /** 아래로 가려진 내용이 있다. */
  bottom: boolean;
  scrollTop: number;
  clientHeight: number;
}

/** 소수 px 스크롤(확대 배율)에서 끝에 닿았는데도 "더 있음"이 남지 않게 둔 여유. */
const EPSILON = 1;

export function scrollEdges({
  scrollTop,
  scrollHeight,
  clientHeight,
}: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}): ScrollEdges {
  return {
    top: scrollTop > EPSILON,
    bottom: scrollTop + clientHeight < scrollHeight - EPSILON,
    scrollTop,
    clientHeight,
  };
}

const NONE: ScrollEdges = { top: false, bottom: false, scrollTop: 0, clientHeight: 0 };

export function useScrollEdges(ref: RefObject<HTMLElement | null>): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(NONE);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const next = scrollEdges(element);
      setEdges((current) =>
        current.top === next.top &&
        current.bottom === next.bottom &&
        current.scrollTop === next.scrollTop &&
        current.clientHeight === next.clientHeight
          ? current
          : next,
      );
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(element);
      // 내용이 커지거나 줄어도 다시 본다.
      for (const child of element.children) observer.observe(child);
    }
    return () => {
      element.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [ref]);

  return edges;
}
