import { useEffect, useRef, type WheelEvent as ReactWheelEvent } from "react";
import type { Page } from "../../model/pageTypes";

type UseBottomBarScrollParams = {
  pages: Page[];
  selectedPageId: string;
};

export const useBottomBarScroll = ({
  pages,
  selectedPageId,
}: UseBottomBarScrollParams) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pageItemRefs = useRef(new Map<string, HTMLDivElement | null>());
  const prevPageCountRef = useRef(pages.length);

  const registerPageRef = (pageId: string) => (node: HTMLDivElement | null) => {
    if (node) {
      pageItemRefs.current.set(pageId, node);
    } else {
      pageItemRefs.current.delete(pageId);
    }
  };

  useEffect(() => {
    const prevCount = prevPageCountRef.current;
    if (pages.length > prevCount) {
      const lastPageId = pages[pages.length - 1]?.id;
      if (lastPageId && lastPageId === selectedPageId) {
        addButtonRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "end",
        });
      }
    }
    prevPageCountRef.current = pages.length;
  }, [pages, selectedPageId]);

  useEffect(() => {
    const target = pageItemRefs.current.get(selectedPageId);
    if (!target) return;
    target.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedPageId]);

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(event.target as Node)) return;
    const scroller = listRef.current;
    if (!scroller) return;
    const delta = event.deltaY || event.deltaX;
    if (Math.abs(delta) < 4) return;
    event.preventDefault();
    scroller.scrollLeft += delta;
  };

  return {
    containerRef,
    listRef,
    addButtonRef,
    registerPageRef,
    handleWheel,
  };
};
