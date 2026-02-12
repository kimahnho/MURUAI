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
