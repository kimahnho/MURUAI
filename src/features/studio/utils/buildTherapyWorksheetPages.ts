/**
 * 워크시트 세트 → Page[] 변환.
 * workspace에서 완성된 학습지 데이터를 캔버스 에디터용 페이지로 변환한다.
 * 각 장마다 제목 텍스트 + 설명 텍스트 + 빈 이미지 영역을 배치한다.
 */
import type { Page } from "@/features/editor/model/pageTypes";
import type { CanvasElement } from "@/features/editor/model/canvasTypes";
import type { WorkspaceSheet, TherapyDomain } from "../model/therapyTypes";
import { withLogoCanvasElements } from "@/features/editor/utils/logoElement";
import { THERAPY_DOMAIN_LABELS } from "../model/therapyTypes";
import { WORKSHEET_TYPE_LABELS, DIFFICULTY_LABELS } from "../model/therapyConstants";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

// A4 세로 기준
const PAGE_WIDTH = mmToPx(210);
const PAGE_HEIGHT = mmToPx(297);

/**
 * workspace 학습지 세트를 Page[] 배열로 변환한다.
 * 완성된 장만 변환 (status === "completed" 또는 모든 장).
 */
export function buildTherapyWorksheetPages(
  sheets: WorkspaceSheet[],
  domain: TherapyDomain,
): Page[] {
  return sheets.map((sheet, index) => {
    const elements = buildSheetElements(sheet, domain);
    const page: Page = {
      id: crypto.randomUUID(),
      pageNumber: index + 1,
      templateId: null,
      orientation: "vertical",
      elements: withLogoCanvasElements(elements),
      rev: 0,
    };
    return page;
  });
}

function buildSheetElements(sheet: WorkspaceSheet, domain: TherapyDomain): CanvasElement[] {
  const { suggestion, modifiedTitle } = sheet;
  const elements: CanvasElement[] = [];

  // 제목 텍스트
  elements.push({
    id: crypto.randomUUID(),
    type: "text",
    x: mmToPx(15),
    y: mmToPx(20),
    w: PAGE_WIDTH - mmToPx(30),
    h: mmToPx(12),
    text: modifiedTitle ?? suggestion.title,
    style: {
      fontFamily: "Pretendard",
      fontSize: 24,
      fontWeight: 700,
      color: "#111827",
      alignX: "center",
      alignY: "middle",
      lineHeight: 1.4,
    },
    widthMode: "fixed",
  } as CanvasElement);

  // 도메인 + 활동 유형 + 난이도 서브 텍스트
  const subtitle = [
    THERAPY_DOMAIN_LABELS[domain],
    WORKSHEET_TYPE_LABELS[suggestion.worksheetType] ?? suggestion.worksheetType,
    DIFFICULTY_LABELS[suggestion.difficulty] ?? suggestion.difficulty,
    `${suggestion.itemCount}개`,
  ].join(" · ");

  elements.push({
    id: crypto.randomUUID(),
    type: "text",
    x: mmToPx(15),
    y: mmToPx(34),
    w: PAGE_WIDTH - mmToPx(30),
    h: mmToPx(8),
    text: subtitle,
    style: {
      fontFamily: "Pretendard",
      fontSize: 14,
      fontWeight: 400,
      color: "#6B7280",
      alignX: "center",
      alignY: "middle",
      lineHeight: 1.4,
    },
    widthMode: "fixed",
  } as CanvasElement);

  // 설명 텍스트 (있으면)
  if (suggestion.description) {
    elements.push({
      id: crypto.randomUUID(),
      type: "text",
      x: mmToPx(15),
      y: mmToPx(46),
      w: PAGE_WIDTH - mmToPx(30),
      h: mmToPx(10),
      text: suggestion.description,
      style: {
        fontFamily: "Pretendard",
        fontSize: 13,
        fontWeight: 400,
        color: "#9CA3AF",
        alignX: "center",
        alignY: "middle",
        lineHeight: 1.5,
      },
      widthMode: "fixed",
    } as CanvasElement);
  }

  // 메인 콘텐츠 영역 (빈 사각형 — 사용자가 에디터에서 채움)
  const contentY = suggestion.description ? mmToPx(62) : mmToPx(50);
  const contentHeight = PAGE_HEIGHT - contentY - mmToPx(20);

  elements.push({
    id: crypto.randomUUID(),
    type: "roundRect",
    x: mmToPx(15),
    y: contentY,
    w: PAGE_WIDTH - mmToPx(30),
    h: contentHeight,
    fill: "#F9FAFB",
    border: {
      enabled: true,
      color: "#E5E7EB",
      width: 1,
      style: "dashed",
    },
    borderRadius: 12,
  } as CanvasElement);

  return elements;
}
