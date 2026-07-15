/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ProjectInfo, Alternative, TypeConfig } from "../types";
import { Sparkles, RefreshCw, Layers, Check, Plus, AlertCircle, Layout, HelpCircle, ArrowUpRight, AlignLeft, Info } from "lucide-react";

interface AiAlternativeGeneratorProps {
  project: ProjectInfo;
  currentAlternative: Alternative;
  onApplyAlternative: (types: TypeConfig[], altParams: Partial<Alternative>) => void;
  onAddAlternativeWithTypes: (name: string, types: TypeConfig[], altParams: Partial<Alternative>) => void;
  onShowNotification?: (message: string, type?: "success" | "error" | "info") => void;
  apiKey?: string;
}

export const AiAlternativeGenerator: React.FC<AiAlternativeGeneratorProps> = ({
  project,
  currentAlternative,
  onApplyAlternative,
  onAddAlternativeWithTypes,
  onShowNotification,
  apiKey,
}) => {
  const [objective, setObjective] = useState<string>("balanced");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [generatedAlt, setGeneratedAlt] = useState<{
    name: string;
    buildingCount: number;
    maxFloors: number;
    buildingArea: number;
    podiumFloors: number;
    refugeFloors: number;
    transferFloors: number;
    types: TypeConfig[];
    aiRationale: string;
  } | null>(null);

  const handleGenerateAlt = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/gemini/generate-alternative", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-gemini-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          projectData: project,
          currentAlternative: currentAlternative,
          objective: objective,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("GitHub Pages 등 정적 호스팅 환경에서는 백엔드 Node.js 서버(server.ts)가 동작하지 않으므로 실시간 Gemini AI 기능을 실행할 수 없습니다. AI 대안을 도출하려면 미리보기용 Cloud Run 링크를 사용하시거나, 로컬 환경에서 실행해 주세요.");
        }
        throw new Error(`AI 서버 오류 (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.name || !data.types) {
        throw new Error("AI가 유효한 대안 규격을 반환하지 않았습니다.");
      }

      setGeneratedAlt(data);
      if (onShowNotification) {
        onShowNotification("✨ 새로운 AI 기획 대안이 성공적으로 도출되었습니다!", "success");
      }
    } catch (err: any) {
      console.error("Backend AI fetch failed, trying client-side fallback:", err);
      
      if (apiKey) {
        try {
          if (onShowNotification) {
            onShowNotification("🔄 백엔드 연결 차단으로 인해 브라우저에서 직접 Gemini API 호출을 시도합니다...", "info");
          }
          
          const targetFar = currentAlternative.targetFloorAreaRatio ?? 250;
          const targetBcr = currentAlternative.targetBuildingCoverageRatio ?? 50;
          const netArea = Math.max(100, project.lotArea - (project.roadArea ?? 0));
          
          const maxBcrPlanArea = netArea * (targetBcr / 100);
          const maxFarPlanArea = netArea * (targetFar / 100);

          const promptText = `당신은 대한민국 공동주택 규모검토 전문가이자 AI 아키텍트입니다.
주어진 대지 정보와 지침을 완벽히 준수하는 창의적이고 사업 타당성이 뛰어난 기획 대안(Alternative)을 기획하여 지정된 JSON 스키마 형식으로 출력해 주세요.

이번 기획안의 핵심 설계 주안점(objective)은 다음과 같습니다: [${objective || "balanced"}]
- "maximize_revenue" (수익가치 극대화형): 84㎡, 114㎡ 등 대형 평형대 비율을 최대화하고, 주민커뮤니티 시설과 사업 가치를 타점하여 분양 연면적을 높임.
- "maximize_units" (밀집효율 극대화형): 59㎡ 중심의 중소형 위주로 다세대 공급을 극대화하여 밀도를 높임.
- "balanced" (조화로운 실무형): 59-84-114타입을 안정적으로 배치하고 용적률 마진을 준수.
- "premium_parking" (고급주차 쾌적형): 주거 쾌적성을 위해 세대당 주차 1.5대 근접 확보를 설계하고 지하층을 꼼꼼하게 배치.

[현재 대지 조건 정보]
- 프로젝트명: ${project.projectName || "미정"}
- 용도지역: ${project.zoneType || "미정"}
- 대지면적: ${project.lotArea} ㎡ (도로제척: ${project.roadArea ?? 0}㎡, 실사용대면적: ${netArea}㎡)
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

          const directResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: promptText,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: "OBJECT",
                    properties: {
                      name: { type: "STRING", description: "새로운 대안의 한글 명칭 (예: 'AI 기획 완벽 대칭형')" },
                      buildingCount: { type: "INTEGER", description: "동수 (3~6 사이)" },
                      maxFloors: { type: "INTEGER", description: "최고층수 (10~30 사이)" },
                      buildingArea: { type: "NUMBER", description: "계획 건축면적 (㎡)" },
                      podiumFloors: { type: "INTEGER", description: "지상 포디움 층수 (0 또는 1)" },
                      refugeFloors: { type: "INTEGER", description: "지상 피난 층수 (0 또는 1)" },
                      unitSelectionMode: { type: "STRING", description: "항상 'layout' 입력" },
                      types: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            name: { type: "STRING", description: "타입 이름 (예: '59A', '84A')" },
                            exclArea: { type: "NUMBER", description: "전용면적 (㎡)" },
                            commArea: { type: "NUMBER", description: "주거공용면적 (㎡)" },
                            count: { type: "INTEGER", description: "배정할 세대수" },
                            unitsPerFloor: { type: "INTEGER", description: "동별 층당 호수" }
                          },
                          required: ["name", "exclArea", "commArea", "count", "unitsPerFloor"]
                        }
                      },
                      aiRationale: { type: "STRING", description: "AI 설계 동기와 타당성 한글 총평" }
                    },
                    required: ["name", "buildingCount", "maxFloors", "buildingArea", "types", "aiRationale"]
                  },
                },
              }),
            }
          );

          if (!directResponse.ok) {
            throw new Error(`Google API 직접 호출 오류 (HTTP ${directResponse.status})`);
          }

          const directData = await directResponse.json();
          const responseText = directData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!responseText) {
            throw new Error("Gemini API가 빈 응답을 반환했습니다.");
          }

          const parsedData = JSON.parse(responseText);
          if (!parsedData.name || !parsedData.types) {
            throw new Error("AI가 유효한 대안 규격을 반환하지 않았습니다.");
          }

          setGeneratedAlt(parsedData);
          if (onShowNotification) {
            onShowNotification("✨ 브라우저 직접 연결을 통해 새로운 AI 기획 대안이 성공적으로 도출되었습니다!", "success");
          }
        } catch (fallbackErr: any) {
          console.error("Fallback failed too:", fallbackErr);
          setErrorMsg(`AI 대안 생성에 실패했습니다.\n- 서버 연결 요류: ${err.message}\n- 직접 API 호출 오류: ${fallbackErr.message}\n\n화면 상단에 올바른 Gemini API Key를 입력했는지 다시 한번 확인해 주세요.`);
          if (onShowNotification) {
            onShowNotification("⚠️ AI 대안 도출에 완전히 실패했습니다. API 키 유효성을 확인해 주세요.", "error");
          }
        }
      } else {
        setErrorMsg(err.message || "AI 대안 생성 중 에러가 발생했습니다.");
        if (onShowNotification) {
          onShowNotification("⚠️ AI 대안 도출에 실패했습니다. API 설정을 확인하세요.", "error");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedAlt) return;
    onApplyAlternative(generatedAlt.types, {
      name: generatedAlt.name,
      buildingCount: generatedAlt.buildingCount,
      maxFloors: generatedAlt.maxFloors,
      buildingArea: generatedAlt.buildingArea,
      podiumFloors: generatedAlt.podiumFloors,
      refugeFloors: generatedAlt.refugeFloors,
      transferFloors: generatedAlt.transferFloors,
    });
  };

  const handleSaveAsNew = () => {
    if (!generatedAlt) return;
    onAddAlternativeWithTypes(generatedAlt.name, generatedAlt.types, {
      buildingCount: generatedAlt.buildingCount,
      maxFloors: generatedAlt.maxFloors,
      buildingArea: generatedAlt.buildingArea,
      podiumFloors: generatedAlt.podiumFloors,
      refugeFloors: generatedAlt.refugeFloors,
      transferFloors: generatedAlt.transferFloors,
      targetBuildingCoverageRatio: currentAlternative.targetBuildingCoverageRatio,
      targetFloorAreaRatio: currentAlternative.targetFloorAreaRatio,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-4 text-[12px] flex flex-col" id="ai-alternative-generator">
      {/* 타이틀 및 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3.5">
        <div className="flex items-center gap-1.5 text-slate-800">
          <div className="bg-gradient-to-tr from-indigo-750 to-blue-700 text-white p-1 rounded shadow-inner">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-xs tracking-tight">AI 자동 검토 생성 워크스페이스</h3>
            <p className="text-[10px] text-slate-400">Gemini 2.5 기반 법규/규모 연동 초고속 자동 기획 설계</p>
          </div>
        </div>

        {generatedAlt && (
          <button
            type="button"
            onClick={handleGenerateAlt}
            disabled={loading}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center gap-1 font-bold transition-all border border-slate-200 cursor-pointer disabled:opacity-50 text-[10.5px]"
            title="현재 목표에 기반하여 완전히 새로운 또 다른 AI 대안을 생성합니다."
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>새 대안으로 새로고침</span>
          </button>
        )}
      </div>

      {/* 대안 생성 옵션 제어 */}
      <div className="mb-4 bg-slate-50 p-3 rounded border border-slate-200 text-slate-700">
        <div className="flex flex-col gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              🎯 AI 최적화 기획 설계 목표 (Objective)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: "balanced", label: "⚖️ 조화 균형 실무", desc: "고른 타입 배정" },
                { id: "maximize_revenue", label: "💰 분양 가치 극대화", desc: "대형 평형 특화" },
                { id: "maximize_units", label: "👨‍👩‍👧 세대수 밀집 효율", desc: "중소형 대량 공급" },
                { id: "premium_parking", label: "🚗 세대 주차 여유형", desc: "1.3~1.5대 확보" }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setObjective(item.id)}
                  className={`p-2 rounded text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    objective === item.id
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm ring-1 ring-slate-800"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <span className="font-bold text-[10.5px] block">{item.label}</span>
                  <span className={`text-[8.5px] block mt-0.5 ${objective === item.id ? "text-slate-300" : "text-slate-400"}`}>
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200/50 pt-2.5">
            <button
              type="button"
              onClick={handleGenerateAlt}
              disabled={loading}
              className="flex-1 py-2 px-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-500 text-white font-bold rounded flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>{loading ? "AI가 대상을 정밀하게 분석하여 규모설계 중..." : "AI 원터치 자동 대안 기획안 생성"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 에러 처리 및 결과 노출 공간 */}
      {errorMsg && (
        <div className="bg-red-50 text-red-800 p-3 rounded flex items-start gap-2 text-[11px] border border-red-100 mb-3 animate-pulse">
          <AlertCircle className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold font-sans block mb-0.5">대안 설계 도출 오류</span>
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* 생성 완료된 대안 스펙 피드 */}
      {generatedAlt ? (
        <div className="border border-slate-200 rounded overflow-hidden shadow-xs hover:border-indigo-300 transition-all flex flex-col">
          {/* 배너 타이틀 */}
          <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1">
              🏢 AI 추천 기획안: <span className="text-yellow-300 font-extrabold">{generatedAlt.name}</span>
            </span>
            <span className="text-[10px] bg-indigo-800 px-1.5 py-0.5 rounded font-bold">
              {objective === "balanced" ? "조화균형" : objective === "maximize_revenue" ? "분양가치" : objective === "maximize_units" ? "세대극대" : "주차우위"}
            </span>
          </div>

          <div className="p-3.5 space-y-3">
            {/* 기본 규모 속성 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
              <div className="p-2 bg-slate-50 border border-slate-150 rounded">
                <span className="block text-[9px] text-slate-400 font-bold">배치 동수</span>
                <span className="font-bold text-slate-800 font-mono text-xs">{generatedAlt.buildingCount} 개동</span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-150 rounded">
                <span className="block text-[9px] text-slate-400 font-bold">기획 최고층</span>
                <span className="font-bold text-slate-800 font-mono text-xs">{generatedAlt.maxFloors} 층</span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-150 rounded">
                <span className="block text-[9px] text-slate-400 font-bold">건축 면적</span>
                <span className="font-bold text-slate-800 font-mono text-xs">{Math.round(generatedAlt.buildingArea).toLocaleString()} ㎡</span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-150 rounded">
                <span className="block text-[9px] text-slate-400 font-bold">구조 세팅</span>
                <span className="font-bold text-slate-800 text-[10px]">
                  포디움:{generatedAlt.podiumFloors}F / 트랜스퍼:{generatedAlt.transferFloors}F
                </span>
              </div>
            </div>

            {/* AI 기획 세대배치 분포 */}
            <div className="bg-slate-50/50 border border-slate-150 rounded p-2.5">
              <span className="block text-[9.5px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                📊 AI 도출 권장 세대수 믹스 조합
              </span>
              <div className="flex flex-wrap gap-1.5">
                {generatedAlt.types.map((t, idx) => (
                  <span key={idx} className="bg-white border border-slate-200 px-2.5 py-1 rounded text-[10px] font-bold text-slate-700 shadow-xs">
                    {t.name} <span className="text-indigo-600">({t.exclArea}㎡)</span> 
                    <span className="mx-1 text-slate-300">|</span> 
                    <span className="text-slate-900 font-mono text-[10.5px] font-extrabold">{t.count}</span>세대 
                    <span className="text-[9px] text-slate-400 font-normal ml-0.5">({t.unitsPerFloor}라인)</span>
                  </span>
                ))}
              </div>
            </div>

            {/* AI 아키텍트 설계 근거 */}
            <div className="border border-indigo-100 bg-indigo-50/15 p-3 rounded">
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-950 mb-1">
                <Info className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span>AI 아키텍트 기획 설계 의도 & 타당성 총평</span>
              </div>
              <p className="text-[10.5px] text-slate-700 leading-relaxed whitespace-pre-line bg-white/75 p-2 rounded border border-slate-150">
                {generatedAlt.aiRationale}
              </p>
            </div>

            {/* 사용자 적용 제어 버튼 */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-150 pt-3">
              <button
                type="button"
                onClick={handleApply}
                className="py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                title="현재 활성화된 대안에 이 AI 층고 및 신규 타입 세대를 즉시 주입 덮어쓰기합니다."
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>현재 대안에 덮어쓰기</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAsNew}
                className="py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold rounded flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                title="이 스펙을 기반으로 완전히 새로운 신규 대안 시나리오를 복제 증설하여 목록에 대조 배치합니다."
              >
                <Plus className="w-3.5 h-3.5 text-slate-900" />
                <span>독립된 새 대안으로 복제 저장</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-200 rounded p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-50/20">
          <Layers className="w-8 h-8 text-slate-300" />
          <div>
            <p className="font-bold text-slate-500 text-[11px]">생성된 AI 배치 대안이 없습니다.</p>
            <p className="text-[9.5px] text-slate-400 mt-0.5">상단 설계를 타겟팅한 후 초고속 자동 생성 버튼을 누르시면, Gemini 기획 시나리오가 펼쳐집니다.</p>
          </div>
        </div>
      )}
    </div>
  );
};
