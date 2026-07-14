import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header as instructed
const getGeminiClient = (userApiKey?: string) => {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Warning: GEMINI_API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API routes FIRST
app.post("/api/gemini/feedback", async (req, res) => {
  try {
    const { projectData, currentAlternative, userMessage } = req.body;
    
    if (!projectData) {
      return res.status(400).json({ error: "No project data provided" });
    }

    const userApiKey = req.headers["x-gemini-api-key"] as string | undefined;
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "GEMINI_API_KEY가 입력되지 않았습니다. 화면 상단에 본인의 Gemini API Key를 입력한 뒤 다시 시도해 주세요. (무료 발급: https://aistudio.google.com/)"
      });
    }

    const ai = getGeminiClient(apiKey);
    
    const targetFar = currentAlternative.targetFloorAreaRatio ?? 0;
    const calcFar = currentAlternative.calculatedFloorAreaRatioValue !== undefined 
      ? (currentAlternative.calculatedFloorAreaRatioValue as number).toFixed(2) 
      : (currentAlternative.aboveGroundFloorArea / Math.max(1, (projectData.lotArea - (projectData.roadArea ?? 0))) * 100).toFixed(2);

    const targetBcr = currentAlternative.targetBuildingCoverageRatio ?? 0;
    const calcBcr = currentAlternative.calculatedBuildingCoverageRatioValue !== undefined 
      ? (currentAlternative.calculatedBuildingCoverageRatioValue as number).toFixed(2) 
      : (currentAlternative.buildingArea / Math.max(1, (projectData.lotArea - (projectData.roadArea ?? 0))) * 100).toFixed(2);

    const plannedParking = currentAlternative.plannedParkingCount ?? 0;
    const legalParking = currentAlternative.legalParkingCount !== undefined 
      ? (currentAlternative.legalParkingCount as number).toFixed(2) 
      : "1.00계획대비 산정필요";

    const systemPrompt = `당신은 대한민국 건축 법규 및 공동주택 규모검토 전문 AI 건축사 보좌관입니다.
건축 실무자가 제공하는 공동주택 개요 정보와 현재 검토 중인 대안(안) 데이터를 바탕으로, 다음과 같은 설계 및 법규 피드백을 제공해야 합니다.

현행 대한민국 건축법, 국토의 계획 및 이용에 관한 법률, 주택법, 주차장법 고유 기준을 기반으로 답변하되, 구체적인 수치가 비정상적이거나 법적 제한을 초과하는지 찾아보세요.
예:
- 대지면적 대비 건폐율 및 용적률이 한계치(예: 제3종일반주거지역 건폐율 50%, 용적률 250% 등)에 적정한지 점검. (사용자가 입력한 한계값 규제와 실제 계산값을 비교하여 분석해 줌)
- 주차대수 산정 기준: 세대당 주차대수가 적절한지(최소 1.0대 이상 권장, 전용면적당 대수 등 법적 한계) 가이드 제공.
- 세대 구성별 주거 편의성 조언 및 주민공동시설 면적 규정 (300세대 이상: 300 + 세대당 1.2㎡ 등 간략 가이드) 피드백 제공.
- 향후 일조권, 사선제한, 동간 거리 검토 시 주의사항 언급.

[현재 프로젝트 기본 정보]
- 프로젝트명: ${projectData.projectName || "미정"}
- 대지위치/용도지역: ${projectData.location || "미정"} / ${projectData.zoneType || "미정"}
- 대지면적: ${projectData.lotArea} ㎡

[선택된 검토 대안 정보: ${currentAlternative.name}]
- 동수 / 최고층수: ${currentAlternative.buildingCount}개동 / 최고 ${currentAlternative.maxFloors}층
- 용적률 제한: ${targetFar}% (계산된 계획 용적률: ${calcFar}%)
- 건폐율 제한: ${targetBcr}% (계산된 계획 건폐율: ${calcBcr}%)
- 지상 연면적: ${(currentAlternative.aboveGroundFloorArea || 0).toLocaleString()} ㎡
- 지하 연면적: ${(currentAlternative.undergroundFloorArea || 0).toLocaleString()} ㎡
- 전체 세대수: ${currentAlternative.totalGenerationCount || 0} 세대
- 계획 주차대수: ${plannedParking} 대 (법정 주차대수: ${legalParking}대)
- 주민공동시설 계획면적: ${currentAlternative.communityFacilityArea || 0} ㎡

[타입 구성]
${(currentAlternative.types || []).map((t: any) => `- ${t.name}타입: 전용면적 ${t.exclArea}㎡, 세대수 ${t.count}세대`).join('\n')}

사용자의 요청에 대해 친절하고 전문적인 건축 실무 용어(용적률, 건폐율, 연면적, 세대당 주차, 주민공동시설 등)를 사용하여 상세히 한글로 피드백을 작성해 주세요. 또한 어조는 정중하고 실용적으로 답변해야 합니다.`;

    const modelName = "gemini-2.5-flash"; // Recommended model for text tasks
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        { text: systemPrompt },
        { text: userMessage || "현재 대안에 대한 전체적인 법적/설계 가이드라인 및 타당성 규모검토 피드백을 주세요." }
      ],
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: error.message || "Failed to process AI review" });
  }
});

// AI 대안 브레인스토밍 및 상세 조합 산출용 엔드포인트
app.post("/api/gemini/generate-alternative", async (req, res) => {
  try {
    const { projectData, currentAlternative, objective } = req.body;
    
    if (!projectData) {
      return res.status(400).json({ error: "No project data provided" });
    }

    const userApiKey = req.headers["x-gemini-api-key"] as string | undefined;
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "GEMINI_API_KEY가 입력되지 않았습니다. 화면 상단에 본인의 Gemini API Key를 입력한 뒤 다시 시도해 주세요. (무료 발급: https://aistudio.google.com/)"
      });
    }

    const ai = getGeminiClient(apiKey);
    
    const targetFar = currentAlternative.targetFloorAreaRatio ?? 250;
    const targetBcr = currentAlternative.targetBuildingCoverageRatio ?? 50;
    const netArea = Math.max(100, projectData.lotArea - (projectData.roadArea ?? 0));
    
    const maxBcrPlanArea = netArea * (targetBcr / 100);
    const maxFarPlanArea = netArea * (targetFar / 100);

    const prompt = `당신은 대한민국 공동주택 규모검토 전문가이자 AI 아키텍트입니다.
주어진 대지 정보와 지침을 완벽히 준수하는 창의적이고 사업 타당성이 뛰어난 기획 대안(Alternative)을 기획하여 지정된 JSON 스키마 형식으로 출력해 주세요.

이번 기획안의 핵심 설계 주안점(objective)은 다음과 같습니다: [${objective || "balanced"}]
- "maximize_revenue" (수익가치 극대화형): 84㎡, 114㎡ 등 대형 평형대 비율을 최대화하고, 주민커뮤니티 시설과 사업 가치를 타점하여 분양 연면적을 높임.
- "maximize_units" (밀집효율 극대화형): 59㎡ 중심의 중소형 위주로 다세대 공급을 극대화하여 밀도를 높임.
- "balanced" (조화로운 실무형): 59-84-114타입을 안정적으로 배치하고 용적률 마진을 준수.
- "premium_parking" (고급주차 쾌적형): 주거 쾌적성을 위해 세대당 주차 1.5대 근접 확보를 설계하고 지하층을 꼼꼼하게 배치.

[현재 대지 조건 정보]
- 프로젝트명: ${projectData.projectName || "미정"}
- 용도지역: ${projectData.zoneType || "미정"}
- 대지면적: ${projectData.lotArea} ㎡ (도로제척: ${projectData.roadArea ?? 0}㎡, 실사용대면적: ${netArea}㎡)
- 건폐율 한계 규제: ${targetBcr}% (최대 계획건축면적: ${maxBcrPlanArea}㎡)
- 용적률 한계 규제: ${targetFar}% (최대 지상연면적 한계: ${maxFarPlanArea}㎡)

[기존 검토안 수치 참고용]
- 기존 동수 및 최고층수: ${currentAlternative.buildingCount}개동 / ${currentAlternative.maxFloors}층
- 기존 건축면적: ${currentAlternative.buildingArea}㎡
- 기존 지상연면적: ${currentAlternative.aboveGroundFloorArea}㎡

설계 엔지니어링 룰:
1. 'buildingCount'(동수)는 3~6동 범위로 설계해 조화롭게 배치하세요.
2. 'maxFloors'(최고층수)는 10~30층 범위로 하세요.
3. 'buildingArea'는 최대 계획건축면적(${maxBcrPlanArea}㎡) 이하로 규제를 초과하지 않도록 70%~95% 선에서 대입하세요.
4. 'podiumFloors', 'refugeFloors' 등은 타겟 구성을 바탕으로 0 또는 1로 적절히 설계하세요. (기본값 설정 권장)
5. 'types' 배열에는 세대 구성을 지정하세요. 각 타입 아이템은 name(예: "59A", "84A", "114A"), exclArea(전용면적, 대표 59.9, 84.9, 114.8 등), commArea(공용면적, 각각 18㎡, 24㎡, 32㎡ 수준), count(배정세대수), unitsPerFloor(동별 층당 호수, 소수점 절대 금지 및 무조건 1, 2, 3, 4 등의 정수 형태로 입력)를 대입하십시오.
6. 전체 주동의 연면적총합(types의 (exclArea+commArea)*count 합산)은 용적률 상한 연면적(${maxFarPlanArea}㎡) 이하를 정밀 준수하면서도 85%~98% 성능을 확보해야 합니다.
7. 'aiRationale' 란에는 이 대안을 설계한 동기와 핵심 설계 의사 결정(예: '주차 조례 완벽 충족 및 84㎡ 중심의 조화형 단지 배치안')을 고급스럽고 읽기 좋은 한글로 요약하여 출력해 주세요.`;

    const modelName = "gemini-2.5-flash"; 
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "새로운 대안의 한글 명칭 (예: 'AI 기획 완벽 대칭형')" },
            buildingCount: { type: Type.INTEGER, description: "동수 (3~6 사이)" },
            maxFloors: { type: Type.INTEGER, description: "최고층수 (10~30 사이)" },
            buildingArea: { type: Type.NUMBER, description: "계획 건축면적 (㎡)" },
            podiumFloors: { type: Type.INTEGER, description: "지상 포디움 층수 (0 또는 1)" },
            refugeFloors: { type: Type.INTEGER, description: "지상 피난 층수 (0 또는 1)" },
            unitSelectionMode: { type: Type.STRING, description: "항상 'layout' 입력" },
            types: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "타입 이름 (예: '59A', '84A')" },
                  exclArea: { type: Type.NUMBER, description: "전용면적 (㎡)" },
                  commArea: { type: Type.NUMBER, description: "주거공용면적 (㎡)" },
                  count: { type: Type.INTEGER, description: "배정할 세대수" },
                  unitsPerFloor: { type: Type.INTEGER, description: "동별 층당 호수 (소수점 절대 불가, 1, 2, 3 등의 정수만 가능)" }
                },
                required: ["name", "exclArea", "commArea", "count", "unitsPerFloor"]
              }
            },
            aiRationale: { type: Type.STRING, description: "AI 설계 동기와 타당성 한글 총평" }
          },
          required: ["name", "buildingCount", "maxFloors", "buildingArea", "types", "aiRationale"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Error generating AI alternative:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI alternative" });
  }
});

// Vite middleware for development or serving static files for production
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
