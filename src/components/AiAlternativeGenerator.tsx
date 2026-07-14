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
      console.error(err);
      setErrorMsg(err.message || "AI 대안 생성 중 에러가 발생했습니다.");
      if (onShowNotification) {
        onShowNotification("⚠️ AI 대안 도출에 실패했습니다. API 설정을 확인하세요.", "error");
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
