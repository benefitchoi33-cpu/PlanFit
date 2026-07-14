/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ProjectInfo, Alternative } from "../types";
import { calculateAlternativeMetrics } from "../utils/calculations";
import { Table, Award, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

interface ComparisonMatrixProps {
  project: ProjectInfo;
  alternatives: Alternative[];
  onSelectAlternative: (id: string) => void;
  selectedId: string;
}

export const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({
  project,
  alternatives,
  onSelectAlternative,
  selectedId,
}) => {
  // 각 대안별 메트릭 계산 미리 실행
  const calculatedData = alternatives.map(alt => ({
    alt,
    metrics: calculateAlternativeMetrics(project, alt)
  }));

  // 사업성(가장 많은 세대수 확보 및 용적률 준수) 기준 최선의 안 선출
  let bestAltId = "";
  let maxGen = -1;
  calculatedData.forEach(({ alt, metrics }) => {
    // 규제 한도를 만족하는 안 중에서 세대수가 가장 많은 안 탐색
    if (!metrics.isCoverageOver && !metrics.isRatioOver) {
      if (metrics.totalGenerationCount > maxGen) {
        maxGen = metrics.totalGenerationCount;
        bestAltId = alt.id;
      }
    }
  });

  // 만약 모든 안이 한도 초과 상태라면, 그냥 세대수가 제일 많은 안을 탐색
  if (!bestAltId && alternatives.length > 0) {
    let maxGenAll = -1;
    calculatedData.forEach(({ alt, metrics }) => {
      if (metrics.totalGenerationCount > maxGenAll) {
        maxGenAll = metrics.totalGenerationCount;
        bestAltId = alt.id;
      }
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-4 text-[12px]" id="comparison-matrix-panel">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-1.5">
          <Table className="w-3.5 h-3.5 text-blue-700" id="matrix-table-icon" />
          <div>
            <h3 className="font-bold text-slate-800 text-xs tracking-tight">대안별 종합 검토 및 의사결정 Matrix</h3>
          </div>
        </div>
      </div>

      {/* 모바일/데스크톱 모두 친화적인 의사결정 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {calculatedData.map(({ alt, metrics }) => {
          const isSelected = alt.id === selectedId;
          const isBest = alt.id === bestAltId;

          return (
            <div
              key={`card-${alt.id}`}
              onClick={() => onSelectAlternative(alt.id)}
              className={`relative border rounded p-3 cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? "border-blue-600 bg-blue-50/30 ring-1 ring-blue-500/20"
                  : "border-slate-200 hover:border-slate-400 bg-white"
              }`}
              id={`scenario-card-${alt.id}`}
            >
              {isBest && (
                <span className="absolute -top-2 right-2 bg-yellow-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                  <Award className="w-2.5 h-2.5" /> 최대 세대 안
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-slate-900 text-xs">{alt.name}</h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {alt.buildingCount}개동 / {alt.maxFloors}F
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">실 건폐율:</span>
                    <span className={`font-mono font-bold ${metrics.isCoverageOver ? "text-red-650" : "text-slate-800"}`}>
                      {metrics.calculatedBuildingCoverageRatioValue.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">실 용적률:</span>
                    <span className={`font-mono font-bold ${metrics.isRatioOver ? "text-red-650" : "text-slate-800"}`}>
                      {metrics.calculatedFloorAreaRatioValue.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-slate-200 pt-1 mt-1 font-bold">
                    <span className="text-slate-800">총 세대수:</span>
                    <span className="font-mono text-blue-700">{metrics.totalGenerationCount} 세대</span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 border-t border-slate-100 pt-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1">
                  {metrics.isCoverageOver || metrics.isRatioOver ? (
                    <span className="text-red-600 flex items-center gap-0.5 font-semibold">
                      <AlertTriangle className="w-2.5 h-2.5" /> 규모초과
                    </span>
                  ) : (
                    <span className="text-emerald-700 flex items-center gap-0.5 font-semibold">
                      <CheckCircle2 className="w-2.5 h-2.5" /> 법규적합
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="text-slate-550 hover:text-blue-700 flex items-center gap-0.5 font-bold cursor-pointer text-[10px]"
                >
                  활성화 표기 <ChevronRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 정형화된 정통 엑셀식 비교 그리드 표 */}
      <div className="overflow-x-auto border border-slate-200 rounded">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white font-bold">
              <th className="py-2 px-3 sticky left-0 bg-slate-800 border-r border-slate-700 min-w-[150px] shadow-[2px_0_5px_rgba(0,0,0,0.15)] z-10">규모검토 산정 항목</th>
              {calculatedData.map(({ alt }) => (
                <th key={`header-${alt.id}`} className="py-2 px-2 min-w-[100px] text-center border-r border-slate-700">
                  {alt.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {/* 기본 수치들 */}
            <tr className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">주동 계획 (동수 / 최고층)</td>
              {calculatedData.map(({ alt }) => (
                <td key={`row-building-${alt.id}`} className="py-1.5 px-2 text-center font-mono text-slate-900">
                  {alt.buildingCount}동 / {alt.maxFloors}F
                </td>
              ))}
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">건축 바닥면적 (㎡)</td>
              {calculatedData.map(({ alt }) => (
                <td key={`row-area-${alt.id}`} className="py-1.5 px-2 text-center font-mono">
                  {alt.buildingArea.toLocaleString()} ㎡
                  <span className="block text-[9px] text-slate-400">({(alt.buildingArea * 0.3025).toFixed(1)}평)</span>
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">지상층 연면적 (㎡)</td>
              {calculatedData.map(({ alt }) => (
                <td key={`row-farea-${alt.id}`} className="py-1.5 px-2 text-center font-mono text-slate-900">
                  {alt.aboveGroundFloorArea.toLocaleString()} ㎡
                  <span className="block text-[9px] text-slate-400">({(alt.aboveGroundFloorArea * 0.3025).toFixed(1)}평)</span>
                </td>
              ))}
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">지하층 연면적 (㎡)</td>
              {calculatedData.map(({ alt }) => (
                <td key={`row-uarea-${alt.id}`} className="py-1.5 px-2 text-center font-mono text-slate-700">
                  {alt.undergroundFloorArea.toLocaleString()} ㎡
                  <span className="block text-[9px] text-slate-400">({(alt.undergroundFloorArea * 0.3025).toFixed(1)}평)</span>
                </td>
              ))}
            </tr>

            {/* 법적 한계 대조군 */}
            <tr className="bg-blue-50/20 hover:bg-blue-50/30 transition-colors">
              <td className="py-1.5 px-3 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">계획 건폐율 (%)</td>
              {calculatedData.map(({ alt, metrics }) => (
                <td key={`row-bcr-${alt.id}`} className="py-1.5 px-2 text-center font-mono">
                  <span className={`font-bold ${metrics.isCoverageOver ? "text-red-650" : "text-blue-800"}`}>
                    {metrics.calculatedBuildingCoverageRatioValue.toFixed(2)}%
                  </span>
                  <span className="block text-[9px] text-slate-400">(상한: {alt.targetBuildingCoverageRatio}%)</span>
                </td>
              ))}
            </tr>

            <tr className="bg-blue-50/20 hover:bg-blue-50/30 transition-colors">
              <td className="py-1.5 px-3 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">계획 용적률 (%)</td>
              {calculatedData.map(({ alt, metrics }) => (
                <td key={`row-far-${alt.id}`} className="py-1.5 px-2 text-center font-mono">
                  <span className={`font-bold ${metrics.isRatioOver ? "text-red-650" : "text-blue-800"}`}>
                    {metrics.calculatedFloorAreaRatioValue.toFixed(2)}%
                  </span>
                  <span className="block text-[9px] text-slate-400">(상한: {alt.targetFloorAreaRatio}%)</span>
                </td>
              ))}
            </tr>

            {/* 세대 및 주차 */}
            <tr className="bg-slate-900 text-white font-bold text-xs">
              <td className="py-2 px-3 sticky left-0 bg-slate-900 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.15)] z-10">최종 계획 세대수</td>
              {calculatedData.map(({ alt, metrics }) => (
                <td key={`row-units-${alt.id}`} className="py-2 px-2 text-center font-mono text-yellow-300">
                  {metrics.totalGenerationCount} 세대
                </td>
              ))}
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">지상 기획 주차 면적수</td>
              {calculatedData.map(({ alt }) => (
                <td key={`row-parking-${alt.id}`} className="py-1.5 px-2 text-center font-mono text-slate-800">
                  {alt.plannedParkingCount} 대
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/30 hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">주거 전용 총합 (㎡)</td>
              {calculatedData.map(({ alt, metrics }) => (
                <td key={`row-total-excl-${alt.id}`} className="py-1.5 px-2 text-center font-mono text-slate-800">
                  {metrics.totalExclAreaSum.toLocaleString()} ㎡
                </td>
              ))}
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">주거 공급 총합 (㎡)</td>
              {calculatedData.map(({ alt, metrics }) => (
                <td key={`row-total-supp-${alt.id}`} className="py-1.5 px-2 text-center font-mono text-slate-800">
                  {metrics.totalSupplyAreaSum.toLocaleString()} ㎡
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/30 hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">가구 평균 분양 면적</td>
              {calculatedData.map(({ alt, metrics }) => (
                <td key={`row-avg-supp-${alt.id}`} className="py-1.5 px-2 text-center font-mono text-slate-800">
                  {metrics.averageSupplyAreaPerUnit.toFixed(1)} ㎡
                </td>
              ))}
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">법정 최소 필요 주량</td>
              {calculatedData.map(({ alt, metrics }) => (
                <td key={`row-legal-parking-${alt.id}`} className="py-1.5 px-2 text-center font-mono text-slate-550">
                  {metrics.legalParkingCount.toFixed(1)} 대
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50/30 hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">수급 잉여/마진 상태</td>
              {calculatedData.map(({ alt, metrics }) => (
                <td key={`row-margin-${alt.id}`} className="py-1.5 px-2 text-center font-mono font-bold">
                  <span className={metrics.parkingDeficitOrSurplus >= 0 ? "text-emerald-700" : "text-red-650"}>
                    {metrics.parkingDeficitOrSurplus >= 0
                      ? `+${metrics.parkingDeficitOrSurplus.toFixed(1)}대 충족`
                      : `${metrics.parkingDeficitOrSurplus.toFixed(1)}대 부족`}
                  </span>
                </td>
              ))}
            </tr>

            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] z-10">공동 주민시설면적 (㎡)</td>
              {calculatedData.map(({ alt }) => (
                <td key={`row-community-${alt.id}`} className="py-1.5 px-2 text-center font-mono text-slate-800">
                  {alt.communityFacilityArea} ㎡
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
