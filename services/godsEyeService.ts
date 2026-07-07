import { GoogleGenAI, Type } from "@google/genai";
import { GodsEyeAnalysis, LimitingBelief } from "../types";
import { GEMINI_MODEL, GODSEYE_SYSTEM_INSTRUCTION } from "../constants";

// 惰性初始化：避免在缺少 API Key 时于模块加载阶段直接抛错导致整个应用白屏
let ai: GoogleGenAI | null = null;
const getAI = (): GoogleGenAI => (ai ??= new GoogleGenAI({ apiKey: process.env.API_KEY }));

/**
 * 以「俯瞰者」的身份分析使用者的倾诉，
 * 返回盲点、限制性信念、多重视角的结构化报告。
 * previousBeliefs 用于告知模型已经发现过的信念，避免重复挖掘同一颗暗星。
 */
export const analyzeMind = async (
  userText: string,
  previousBeliefs: LimitingBelief[] = []
): Promise<GodsEyeAnalysis> => {
  const knownBeliefs = previousBeliefs.length
    ? `\n\n此前的扫描已经发现过这些信念（避免重复，除非有新的证据角度）：\n${previousBeliefs
        .map((b) => `- ${b.statement}${b.cleared ? '（已清除）' : ''}`)
        .join('\n')}`
    : '';

  const prompt = `以下是使用者的倾诉，请从上帝视角俯瞰并分析：

"""
${userText}
"""
${knownBeliefs}

要求：
- blindSpots：找出 2~4 个思维盲点，每个都要引用原话作为证据。
- limitingBeliefs：挖出 1~3 条最核心的限制性信念（宁缺毋滥，只挖真正藏在文字底下的）。
- perspectives：提供 3 个视角，persona 分别为「十年后的你」「一位完全的局外人」「最懂你的智慧导师」。`;

  const response = await getAI().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: GODSEYE_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coreTheme: { type: Type.STRING, description: "一句话点出这次倾诉的核心议题。" },
          observation: {
            type: Type.STRING,
            description: "第三人称俯瞰描述：像描述星图上的一个星系那样描述「这个人」的处境、情绪与思维运行模式，150~250字。",
          },
          blindSpots: {
            type: Type.ARRAY,
            description: "2~4 个思维盲点。",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "盲点的名字，如「灾难化想象」。" },
                biasType: { type: Type.STRING, description: "所属认知偏误类别，如「确认偏误」「沉没成本谬误」。" },
                explanation: { type: Type.STRING, description: "它如何在这个人的思维中具体运作。" },
                evidence: { type: Type.STRING, description: "引用使用者的原话。" },
                question: { type: Type.STRING, description: "一个用于松动这个盲点的苏格拉底式反问。" },
              },
              required: ["name", "biasType", "explanation", "evidence", "question"],
            },
          },
          limitingBeliefs: {
            type: Type.ARRAY,
            description: "1~3 条限制性信念。",
            items: {
              type: Type.OBJECT,
              properties: {
                statement: { type: Type.STRING, description: "信念本身，第一人称，以「我」开头。" },
                origin: { type: Type.STRING, description: "这个信念可能的来源（成长经历、过往挫败、社会规训等）。" },
                cost: { type: Type.STRING, description: "它正在让使用者付出的具体代价。" },
                evidence: { type: Type.STRING, description: "文字中暴露它的痕迹，引用原话。" },
                counterQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "3 个挑战这条信念的问题。",
                },
                reframed: { type: Type.STRING, description: "一条可信、有力量的替代信念，不是空洞口号。" },
                microAction: { type: Type.STRING, description: "24 小时内可完成的一个具体微行动。" },
              },
              required: ["statement", "origin", "cost", "evidence", "counterQuestions", "reframed", "microAction"],
            },
          },
          perspectives: {
            type: Type.ARRAY,
            description: "3 个视角切换。",
            items: {
              type: Type.OBJECT,
              properties: {
                persona: { type: Type.STRING },
                insight: { type: Type.STRING, description: "这个视角会对使用者说的话，2~3 句。" },
              },
              required: ["persona", "insight"],
            },
          },
          encouragement: { type: Type.STRING, description: "收尾的一段话：不打鸡血，而是让人感到被看见。" },
        },
        required: ["coreTheme", "observation", "blindSpots", "limitingBeliefs", "perspectives", "encouragement"],
      },
    },
  });

  const jsonText = response.text;
  if (!jsonText) {
    throw new Error("俯瞰者没有返回任何内容");
  }

  const data = JSON.parse(jsonText);

  return {
    coreTheme: data.coreTheme,
    observation: data.observation,
    encouragement: data.encouragement,
    blindSpots: (data.blindSpots || []).map((b: Omit<import("../types").BlindSpot, "id">) => ({
      id: crypto.randomUUID(),
      ...b,
    })),
    limitingBeliefs: (data.limitingBeliefs || []).map(
      (b: Omit<LimitingBelief, "id" | "cleared">) => ({
        id: crypto.randomUUID(),
        cleared: false,
        ...b,
      })
    ),
    perspectives: data.perspectives || [],
  };
};
