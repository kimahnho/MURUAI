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
  totalWidth: number;
  isSelectedLastPage: boolean;
};

export const useBottomBarScroll = ({
  pagesLength,
  selectedPageId,
  selectedItemIndex,
  addButtonIndex,
  itemOffsets,
  itemWidths,
  totalWidth,
  isSelectedLastPage,
}: UseBottomBarScrollParams) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevPageCountRef = useRef(pagesLength);
  const lastSelectedPageIdRef = useRef<string | null>(null);

  const scrollToOffset = (offset: number, behavior: ScrollBehavior = "smooth") => {
    const scroller = listRef.current;
    if (!scroller) return;
    const maxScroll = Math.max(0, totalWidth - scroller.clientWidth);
    scroller.scrollTo({
      left: Math.min(Math.max(offset, 0), maxScroll),
      behavior,
    });
  };

  useEffect(() => {
    const prevCount = prevPageCountRef.current;
    // 페이지가 추가되고 마지막 페이지가 선택된 경우에만 우측 끝까지 이동해 신규 페이지를 즉시 노출한다.
    if (pagesLength > prevCount && isSelectedLastPage) {
      const addOffset =
        addButtonIndex != null ? itemOffsets[addButtonIndex] ?? 0 : 0;
      scrollToOffset(addOffset);
    }
    prevPageCountRef.current = pagesLength;
  }, [
    pagesLength,
    isSelectedLastPage,
    addButtonIndex,
    itemOffsets,
    totalWidth,
  ]);

  useEffect(() => {
    if (selectedItemIndex == null) return;
    if (lastSelectedPageIdRef.current === selectedPageId) return;
    lastSelectedPageIdRef.current = selectedPageId;
    const scroller = listRef.current;
    if (!scroller) return;
    const offset = itemOffsets[selectedItemIndex] ?? 0;
    const width = itemWidths[selectedItemIndex] ?? 0;
    const centerOffset = offset + width / 2 - scroller.clientWidth / 2;
    // 수동 선택 전환 시 선택 페이지를 중앙 근처에 배치해 연속 탐색 시 시선 이동을 줄인다.
    scrollToOffset(centerOffset);
  }, [selectedItemIndex, selectedPageId, itemOffsets, itemWidths, totalWidth]);

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
