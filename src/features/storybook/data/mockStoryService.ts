/**
 * Mock AI 서비스 — 실제 API 연동 전 프로토타입용.
 * fetchMockProposals: 기획서 2개 반환 (1초 딜레이)
 * generateMockStorybook: 10페이지 스토리북 반환 (3초 딜레이)
 */
import type {
  ChildInfo,
  StoryProposal,
  StoryBook,
  StoryBookPage,
  StoryPageOutline,
  ArtStyleId,
  PageLayout,
} from "../model/storybookTypes";
import { STORYBOOK_PAGE_COUNT } from "../model/storybookTypes";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Mock 기획서 생성 ───

const buildMockOutlines = (
  topic: string,
  variant: number,
): StoryPageOutline[] => {
  const scenes =
    variant === 0
      ? [
          { scene: "주인공이 아침에 일어나는 장면", text: `오늘은 ${topic}에 대해 배워볼 거예요.` },
          { scene: "주인공이 친구를 만나는 장면", text: "친구가 다가와 인사를 했어요." },
          { scene: "두 아이가 놀이터에서 노는 장면", text: "함께 놀이터에서 놀기 시작했어요." },
          { scene: "갈등이 생기는 장면", text: "그런데 작은 문제가 생겼어요." },
          { scene: "주인공이 고민하는 장면", text: "어떻게 하면 좋을까 생각했어요." },
          { scene: "도움을 요청하는 장면", text: "선생님께 도움을 요청했어요." },
          { scene: "함께 해결하는 장면", text: "친구와 함께 문제를 해결했어요." },
          { scene: "화해하고 웃는 장면", text: "서로 웃으며 화해했어요." },
          { scene: "함께 간식을 먹는 장면", text: "맛있는 간식을 나눠 먹었어요." },
          { scene: "해가 지는 장면", text: "오늘도 좋은 하루였어요!" },
        ]
      : [
          { scene: "학교 앞에 서 있는 주인공", text: `${topic}, 함께 알아볼까요?` },
          { scene: "교실에 들어가는 장면", text: "교실에 들어가니 친구들이 있었어요." },
          { scene: "선생님이 이야기하는 장면", text: "선생님이 재미있는 이야기를 해주셨어요." },
          { scene: "모둠 활동을 하는 장면", text: "친구들과 함께 활동을 시작했어요." },
          { scene: "실수를 하는 장면", text: "앗, 실수를 하고 말았어요." },
          { scene: "걱정하는 표정의 주인공", text: "조금 걱정이 되었지만..." },
          { scene: "친구가 응원하는 장면", text: "친구가 \"괜찮아!\"라고 말해줬어요." },
          { scene: "다시 도전하는 장면", text: "용기를 내어 다시 해봤어요." },
          { scene: "성공한 장면", text: "드디어 해냈어요!" },
          { scene: "집으로 돌아가는 장면", text: "오늘 배운 것을 잊지 않을 거예요." },
        ];

  return scenes.map((s, i) => ({
    pageNumber: i + 1,
    sceneDescription: s.scene,
    textContent: s.text,
  }));
};

export const fetchMockProposals = async (
  childInfo: ChildInfo,
  topic: string,
): Promise<StoryProposal[]> => {
  await delay(1000);

  return [
    {
      id: crypto.randomUUID(),
      title: `${childInfo.name}의 특별한 하루`,
      summary: `${childInfo.name}(이)가 ${topic}을(를) 배워가는 따뜻한 이야기입니다. 놀이터에서 시작된 작은 갈등을 통해 성장하는 모습을 그립니다.`,
      pages: buildMockOutlines(topic, 0),
    },
    {
      id: crypto.randomUUID(),
      title: `${childInfo.name}의 학교 모험`,
      summary: `${childInfo.name}(이)가 학교에서 ${topic}을(를) 경험하는 이야기입니다. 실수를 극복하고 자신감을 얻어가는 과정을 담았습니다.`,
      pages: buildMockOutlines(topic, 1),
    },
  ];
};

// ─── Mock 스토리북 생성 ───

const PLACEHOLDER_COLORS = [
  "#FFE4E1", "#E8F5E9", "#E3F2FD", "#FFF3E0", "#F3E5F5",
  "#E0F7FA", "#FFF9C4", "#FCE4EC", "#E8EAF6", "#F1F8E9",
];

export const generateMockStorybook = async (
  proposal: StoryProposal,
  artStyle: ArtStyleId,
  layout: PageLayout,
  fontFamily: string,
  childInfo: ChildInfo,
): Promise<StoryBook> => {
  await delay(3000);

  const pages: StoryBookPage[] = proposal.pages
    .slice(0, STORYBOOK_PAGE_COUNT)
    .map((outline, i) => ({
      id: crypto.randomUUID(),
      pageNumber: i + 1,
      imageUrl: "",
      text: outline.textContent,
      sceneDescription: outline.sceneDescription,
      sceneGroup: i + 1,
    }));

  return {
    id: crypto.randomUUID(),
    title: proposal.title,
    childInfo,
    artStyle,
    layout,
    fontFamily,
    pages,
    createdAt: new Date().toISOString(),
  };
};

export { PLACEHOLDER_COLORS };
