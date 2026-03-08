/**
 * 하단 페이지 바의 선택 페이지 가시성 유지를 위한 자동 스크롤을 관리하는 훅.
 */
import { useEffect, useRef } from "react";

type UseBottomBarScrollParams = {
  pagesLength: number;
  selectedPageId: string;
  selectedItemIndex: number | null;
  addButtonIndex: number | null;
  itemOffsets: number[];
  itemWidths: number[];
  isSelectedLastPage: boolean;
};

export const useBottomBarScroll = ({
  pagesLength,
  selectedPageId,
  selectedItemIndex,
  addButtonIndex,
  itemOffsets,
  itemWidths,
  isSelectedLastPage,
}: UseBottomBarScrollParams) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevPageCountRef = useRef(pagesLength);
  const lastSelectedPageIdRef = useRef<string | null>(null);

  const scrollToOffset = (
    offset: number,
    behavior: ScrollBehavior = "auto",
  ) => {
    const scroller = listRef.current;
    if (!scroller) return;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollTo({
      left: Math.min(Math.max(offset, 0), maxScroll),
      behavior,
    });
  };

  useEffect(() => {
    const prevCount = prevPageCountRef.current;
    if (pagesLength > prevCount) {
      const scroller = listRef.current;
      if (scroller) {
        if (isSelectedLastPage) {
          // 맨 끝에 추가된 경우: 추가 버튼까지 보이도록 맨 끝으로 스크롤한다.
          scrollToOffset(scroller.scrollWidth, "auto");
        } else if (selectedItemIndex != null) {
          // 중간에 삽입된 경우: 새 페이지가 뷰포트에 들어오도록 최소 이동한다.
          const edgePadding = 16;
          const itemRight =
            (itemOffsets[selectedItemIndex] ?? 0) +
            (itemWidths[selectedItemIndex] ?? 0);
          scrollToOffset(
            itemRight - scroller.clientWidth + edgePadding,
            "auto",
          );
        }
      }
    }
    prevPageCountRef.current = pagesLength;
  }, [
    pagesLength,
    isSelectedLastPage,
    selectedItemIndex,
    addButtonIndex,
    itemOffsets,
    itemWidths,
  ]);

  useEffect(() => {
    if (selectedItemIndex == null) return;
    if (lastSelectedPageIdRef.current === selectedPageId) return;
    lastSelectedPageIdRef.current = selectedPageId;
    const scroller = listRef.current;
    if (!scroller) return;
    const offset = itemOffsets[selectedItemIndex] ?? 0;
    const width = itemWidths[selectedItemIndex] ?? 0;
    const viewportLeft = scroller.scrollLeft;
    const viewportRight = viewportLeft + scroller.clientWidth;
    const itemLeft = offset;
    const itemRight = offset + width;
    const edgePadding = 16;

    // 선택된 항목이 이미 뷰포트에 충분히 보이면 스크롤을 강제하지 않는다.
    if (
      itemLeft >= viewportLeft + edgePadding &&
      itemRight <= viewportRight - edgePadding
    ) {
      return;
    }

    // 필요한 만큼만 이동해 항목을 뷰포트 안으로 가져온다.
    if (itemLeft < viewportLeft + edgePadding) {
      scrollToOffset(itemLeft - edgePadding, "auto");
      return;
    }
    if (itemRight > viewportRight - edgePadding) {
      scrollToOffset(itemRight - scroller.clientWidth + edgePadding, "auto");
    }
  }, [selectedItemIndex, selectedPageId, itemOffsets, itemWidths]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (!container.contains(event.target as Node)) return;
      const scroller = listRef.current;
      if (!scroller) return;
      const delta = event.deltaY || event.deltaX;
      if (Math.abs(delta) < 4) return;
      // 트랙패드/휠의 세로 입력을 가로 스크롤로 변환해 페이지 바 조작성을 높인다.
      event.preventDefault();
      scroller.scrollLeft += delta;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return {
    containerRef,
    listRef,
  };
};
