import React from "react";
import { ProjectInfo, Alternative } from "../types";
import { Info, Disc, Layers, ArrowDown, ArrowUp } from "lucide-react";

interface FloorAreaTableProps {
  project: ProjectInfo;
  alternative: Alternative;
}

export const FloorAreaTable: React.FC<FloorAreaTableProps> = ({ project, alternative }) => {
  const bldgCount = alternative.buildingCount || 0;
  const maxFloors = alternative.maxFloors || 0;
  const bldgArea = alternative.buildingArea || 0;
  const podiumFloors = alternative.podiumFloors || 0;
  const refugeFloors = alternative.refugeFloors || 0;

  // 실사용 대지면적 및 지하 굴착 한계 (대지면적의 80% 적용)
  const netLotArea = project ? Math.max(0.1, project.lotArea - project.roadArea) : 5000;
  const maxUndergroundFloorPlate = netLotArea * 0.8; // 실무 관례상 대지 면적의 약 80% 수준으로 지하 굴착 평균 한 층 면적 설정
  const roundedMaxUndergroundFloorPlate = Math.round(maxUndergroundFloorPlate * 10) / 10;

  // 주거 가능층수 계산
  const residentialFloors = Math.max(0, maxFloors - podiumFloors - refugeFloors);

  // 주거 전용+공용 연면적 (지상 주동 연면적)
  const types = alternative.types || [];
  const residentialAboveArea = types.reduce((sum, t) => sum + (t.exclArea + t.commArea) * t.count, 0);

  // 계산 유도변수들
  const avgFootprintPerBldg = bldgCount > 0 ? bldgArea / bldgCount : 0;
  const singleFloorM2PerBldg = (bldgCount > 0 && residentialFloors > 0)
    ? (residentialAboveArea / residentialFloors) / bldgCount
    : 0;

  // 지하 설정 계산 (대지경계 1m 이격 최대 굴착면적을 기준으로 한 층의 필요 면적 한도 및 최소 필요 지하층수 산출)
  const undergroundFloorArea = alternative.undergroundFloorArea || 0;
  const estimatedUndergroundFloors = maxUndergroundFloorPlate > 0 
    ? Math.max(1, Math.ceil(undergroundFloorArea / maxUndergroundFloorPlate)) 
    : 2;
  const estimatedUndergroundAreaPerFloor = estimatedUndergroundFloors > 0 
    ? undergroundFloorArea / estimatedUndergroundFloors 
    : 0;

  // 전체 층 구성 배열 (위에서부터 아래로 나열)
  const floorLayers = [];

  // 1. 주거 세대층 (기준층)
  if (residentialFloors > 0) {
    const layerSumArea = residentialAboveArea;
    const layerFloorArea = singleFloorM2PerBldg * bldgCount;
    floorLayers.push({
      name: `지상 주거 기준층`,
      range: `${podiumFloors + refugeFloors + 1}F ~ ${maxFloors}F`,
      floors: residentialFloors,
      areaPerFloor: layerFloorArea,
      totalArea: layerSumArea,
      usage: "공동주택 (주거 전용/공용)",
      status: avgFootprintPerBldg >= singleFloorM2PerBldg 
        ? "🟢 주동 바닥한도 적정" 
        : `⚠️ 건축면적 초과 (${Math.round(singleFloorM2PerBldg - avgFootprintPerBldg)}㎡ 오버)`,
      color: "bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold",
      badgeColor: "bg-indigo-100 text-indigo-800",
      icon: <ArrowUp className="w-3.5 h-3.5 text-indigo-650" />
    });
  }

  // 2. 피난안전구역/피난층
  if (refugeFloors > 0) {
    // 일반적으로 피난안전층은 벽체가 오픈되거나 피난전용 설비가 있어 면적 무가산 혹은 일부 가산
    const layerFloorArea = avgFootprintPerBldg * bldgCount * 0.3; // 피난구역은 일부만 구획 가정
    const layerSumArea = layerFloorArea * refugeFloors;
    floorLayers.push({
      name: "지상 피난안전용도층",
      range: "피난지정층 (중간층)",
      floors: refugeFloors,
      areaPerFloor: layerFloorArea,
      totalArea: layerSumArea,
      usage: "피난 대피소 및 설비 전용통로",
      status: "🟢 피난설비 면적 적용",
      color: "bg-amber-50/70 border-amber-200 text-amber-900",
      badgeColor: "bg-amber-100 text-amber-800",
      icon: <Disc className="w-3.5 h-3.5 text-amber-650" />
    });
  }

  // 4. 포디움 층 (저층부 상가 및 공동시설)
  if (podiumFloors > 0) {
    const communityArea = alternative.communityFacilityArea || 0;
    // 포디움 전체 면적 = 건축면적이 대부분 덮는다고 가정
    const layerFloorArea = bldgArea; 
    const layerSumArea = layerFloorArea * podiumFloors;
    floorLayers.push({
      name: "포디움 저층부 (Podium)",
      range: `지상 1F ~ ${podiumFloors}F`,
      floors: podiumFloors,
      areaPerFloor: layerFloorArea,
      totalArea: layerSumArea,
      usage: `근린생활시설, 부대복리 및 주민공동시설 (${communityArea}㎡ 포함)`,
      status: "🟢 가로 활성화 구획 적합",
      color: "bg-emerald-50/50 border-emerald-200 text-emerald-950",
      badgeColor: "bg-emerald-100 text-emerald-850",
      icon: <Layers className="w-3.5 h-3.5 text-emerald-650" />
    });
  }

  // 5. 지하 주차장 및 기계 전기실층
  if (undergroundFloorArea > 0) {
    const isUndergroundPlateOver = estimatedUndergroundAreaPerFloor > maxUndergroundFloorPlate + 5;
    floorLayers.push({
      name: "지하층 (주차장 및 기계실)",
      range: `B1F ~ B${estimatedUndergroundFloors}F`,
      floors: estimatedUndergroundFloors,
      areaPerFloor: estimatedUndergroundAreaPerFloor,
      totalArea: undergroundFloorArea,
      usage: "계획 주차장, 발전/기계실 및 정화조 시설",
      status: isUndergroundPlateOver 
        ? `⚠️ 굴착한도 초과 (한도: ${Math.round(maxUndergroundFloorPlate).toLocaleString()}㎡)` 
        : `🟢 지하 굴착영역 적합`,
      color: isUndergroundPlateOver 
        ? "bg-red-50 text-red-950 font-semibold" 
        : "bg-slate-50 border-slate-200 text-slate-800",
      badgeColor: isUndergroundPlateOver ? "bg-red-100 text-red-800 font-bold" : "bg-slate-200 text-slate-700",
      icon: <ArrowDown className={`w-3.5 h-3.5 ${isUndergroundPlateOver ? "text-red-600 font-bold animate-pulse" : "text-slate-650"}`} />
    });
  }

  // 총 누계 면적 계산
  const totalFloorSum = floorLayers.reduce((sum, item) => sum + item.totalArea, 0);

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-4 text-[12px] space-y-3" id="floor-area-table-view">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-indigo-700" />
          <h3 className="font-bold text-slate-800 text-sm tracking-tight">수직 동선 단면 층별 계획 면적표</h3>
        </div>
        <span className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-650 font-mono">
          총 높이: 지상 {maxFloors}층 / 지하 {estimatedUndergroundFloors}층
        </span>
      </div>

      <p className="text-[10px] text-slate-500 leading-normal">
        선택된 대안의 계획동수({bldgCount}동), 최고층고({maxFloors}층) 및 특수 보정층(포디움, 피난층) 조건에 매칭하는 가상 단면 평면 분석 결과입니다.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-650 font-bold text-[10.5px]">
              <th className="py-2 px-2.5">구분 용도구역</th>
              <th className="py-2 px-2 text-center w-16">층 범위</th>
              <th className="py-2 px-2 text-center w-12">층수</th>
              <th className="py-2 px-2.5 text-right">층당 동당 바닥면적 (평균)</th>
              <th className="py-2 px-2.5 text-right bg-indigo-50/30 text-indigo-950 font-extrabold border-l border-slate-200">합계 연면적 (㎡)</th>
              <th className="py-2 px-3 text-left border-l border-slate-200">주차/인허가 용도 프로필</th>
              <th className="py-2 px-2 text-left">종합 타당성 진단</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 font-mono text-slate-700">
            {floorLayers.map((layer, idx) => (
              <tr key={idx} className={`hover:bg-slate-50/40 transition-colors ${layer.color}`}>
                <td className="py-2 px-2.5 text-slate-900 font-sans font-semibold flex items-center gap-1.5">
                  {layer.icon}
                  {layer.name}
                </td>
                <td className="py-2 px-2 text-center text-[10.5px] font-sans font-medium text-slate-600">
                  {layer.range}
                </td>
                <td className="py-2 px-2 text-center text-slate-800 font-bold font-sans">
                  {layer.floors}F
                </td>
                <td className="py-2 px-2.5 text-right font-semibold">
                  {bldgCount > 0 
                    ? `${Math.round(layer.areaPerFloor / bldgCount).toLocaleString()} ㎡/동` 
                    : "0 ㎡"}
                  <span className="block text-[9px] font-normal text-slate-400 font-sans">
                    (전동 계: {Math.round(layer.areaPerFloor).toLocaleString()}㎡)
                  </span>
                </td>
                <td className="py-2 px-2.5 text-right font-extrabold text-indigo-950 bg-indigo-50/20 text-[12px] border-l border-slate-150">
                  {Math.round(layer.totalArea).toLocaleString()} ㎡
                  <span className="block text-[9px] text-indigo-600/70 font-normal font-sans">
                    ({(layer.totalArea * 0.3025).toFixed(1)}평)
                  </span>
                </td>
                <td className="py-2 px-3 text-left text-slate-600 font-sans text-[10.5px] border-l border-slate-150 leading-tight">
                  {layer.usage}
                </td>
                <td className="py-2 px-2 text-left font-sans text-[10px]">
                  <span className={`inline-block px-1.5 py-0.5 rounded-sm font-semibold border shadow-sm text-[9.5px] ${
                    layer.status.includes("⚠️") 
                      ? "bg-red-50 text-red-700 border-red-200" 
                      : "bg-white border-slate-150 text-slate-700"
                  }`}>
                    {layer.status}
                  </span>
                </td>
              </tr>
            ))}

            {/* 총 층별 스택 합산 행 */}
            <tr className="bg-slate-800 text-white font-bold border-t border-slate-900">
              <td className="py-2.5 px-2.5 uppercase text-[10px] font-bold text-slate-300">총 누계 스택 (Stack Total)</td>
              <td className="py-2.5 px-2 text-center text-slate-400 font-sans">-</td>
              <td className="py-2.5 px-2 text-center font-sans text-yellow-400">
                {(maxFloors + estimatedUndergroundFloors)}F
              </td>
              <td className="py-2.5 px-2.5 text-right text-slate-400">-</td>
              <td className="py-2.5 px-2.5 text-right border-l border-slate-700 bg-slate-900/30 text-yellow-400 font-extrabold text-[12.5px]">
                {Math.round(totalFloorSum).toLocaleString()} ㎡
                <span className="block text-[9px] font-normal text-slate-350 font-sans">
                  ({(totalFloorSum * 0.3025).toFixed(0)}평)
                </span>
              </td>
              <td className="py-2.5 px-3 text-left text-slate-300 font-sans text-[10px] border-l border-slate-700" colSpan={2}>
                📐 지상 연면적 {Math.round(residentialAboveArea).toLocaleString()}㎡ + 지하 {Math.round(undergroundFloorArea).toLocaleString()}㎡ 등 전체 계획 구역 반영 완료
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600 leading-relaxed flex flex-col gap-2">
        <div className="flex items-start gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">지상 수직적층 정합성 안내: </span>
            <span>
              주거세대 분양 연면적을 수직으로 균등 적층할 경우 한 동당 필요한 층 바닥면적은 약{" "}
              <strong>{Math.round(singleFloorM2PerBldg)}㎡</strong>입니다. 해당 값은 기획 건축면적 한도(동당 <strong>{Math.round(avgFootprintPerBldg)}㎡</strong>)보다 작거나 같아야 무리 없는 대안 수용이 성립합니다.
              {avgFootprintPerBldg >= singleFloorM2PerBldg ? (
                <span className="text-emerald-700 font-bold ml-1">현재 동수 및 최고층고는 주차 및 세대 배치를 완전히 포괄하는 넉넉한 공간을 제공합니다.</span>
              ) : (
                <span className="text-red-650 font-bold ml-1">현재 층수가 부족하여 주동 바닥에 무리가 갈 수 있으니 최고층수를 상향하거나, 타 세대 타입의 층당 호조합 배정을 수정해 주십시오.</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
