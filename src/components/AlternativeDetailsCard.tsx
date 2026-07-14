/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ProjectInfo, Alternative } from "../types";
import { calculateAlternativeMetrics } from "../utils/calculations";
import { Building2, Sliders, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface AlternativeDetailsCardProps {
  project: ProjectInfo;
  alternative: Alternative;
  onChange: (updated: Alternative) => void;
}

export const AlternativeDetailsCard: React.FC<AlternativeDetailsCardProps> = ({
  project,
  alternative,
  onChange,
}) => {
  const metrics = calculateAlternativeMetrics(project, alternative);

  // 1. 세대수 및 주거지상면적 합산
  const totalUnits = alternative.types ? alternative.types.reduce((sum, t) => sum + t.count, 0) : 0;
  const residentialAboveArea = alternative.types 
    ? alternative.types.reduce((sum, t) => sum + (t.exclArea + t.commArea) * t.count, 0) 
    : 0;

  // 2. 주민공동시설 (커뮤니티) 면적
  const communityFacilityArea = alternative.communityFacilityArea || 0;

  // 3. 기타 부대복리시설 면적 (지상층연면적이 완성되면 차액으로 산정하거나 세대수 비례 보장)
  const rawWelfareFacilityArea = alternative.aboveGroundFloorArea - residentialAboveArea - communityFacilityArea;
  const welfareFacilityArea = rawWelfareFacilityArea > 0 ? Math.round(rawWelfareFacilityArea * 100) / 100 : Math.round((totalUnits * 1.5) * 100) / 100;

  // 4. 지하 주차장 면적: 계획 주차대수 × 38㎡
  const undergroundParkingArea = (alternative.plannedParkingCount || 0) * 38;

  // 5. 지하 기계/전기설비실 면적 = 지하층연면적 - 지하 주차장 면적
  const rawUndergroundUtilityArea = alternative.undergroundFloorArea - undergroundParkingArea;
  const undergroundUtilityArea = rawUndergroundUtilityArea > 0 ? Math.round(rawUndergroundUtilityArea * 100) / 100 : Math.round((totalUnits * 4.5) * 100) / 100;

  // 6. 계획 동수 및 최고 층수 기반 기획 배치 타당성 연동 분석 (포디움, 피난층 반영)
  const bldgCount = alternative.buildingCount || 0;
  const maxFloors = alternative.maxFloors || 0;
  const bldgArea = alternative.buildingArea || 0;

  const podiumFloors = alternative.podiumFloors || 0;
  const refugeFloors = alternative.refugeFloors || 0;

  // 실제 주거 용도로 사용 가능한 적층 층수
  const residentialFloors = Math.max(0, maxFloors - podiumFloors - refugeFloors);

  // 대지면적 기반 실무 자동 연산 변수들
  const netLotArea = metrics.netLotArea || Math.max(0.1, project.lotArea - project.roadArea);
  const maxBuildingArea = Math.round(netLotArea * ((alternative.targetBuildingCoverageRatio || 60) / 100) * 10) / 10;
  
  // 지하경계 이격 고려 최대 1개층 바닥면적 (대지의 약 80% 적용)
  const maxUndergroundFloorPlate = netLotArea * 0.8; // 실무 관례상 대지 면적의 약 80% 수준으로 지하 굴착 평균 한 층 면적 설정
  const roundedMaxUndergroundFloorPlate = Math.round(maxUndergroundFloorPlate * 10) / 10;

  const applyMaxBcrArea = () => {
    onChange({
      ...alternative,
      buildingArea: maxBuildingArea,
    });
  };

  const avgFootprintPerBldg = bldgCount > 0 ? Math.round((bldgArea / bldgCount) * 10) / 10 : 0;
  const minFloorPlateNeeded = (bldgCount > 0 && residentialFloors > 0) 
    ? Math.round((residentialAboveArea / (bldgCount * residentialFloors)) * 10) / 10 
    : 0;
  const isLayoutPlannable = bldgCount > 0 && residentialFloors > 0 && bldgArea > 0 && (avgFootprintPerBldg >= minFloorPlateNeeded);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsedVal = Math.max(0, parseFloat(value) || 0);
    onChange({
      ...alternative,
      [name]: parsedVal,
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({
      ...alternative,
      [name]: value,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-4 text-[12px]" id="alternative-details-panel">
      {/* 대안 이름 및 기본 정보 헤더 */}
      <div className="flex justify-between items-center gap-4 border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-700" id="building-icon" />
          <input
            type="text"
            name="name"
            value={alternative.name}
            onChange={handleTextChange}
            className="text-xs font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-slate-850 focus:outline-none transition-all px-1 py-0.5 bg-transparent"
            title="클릭하여 대안명 수정 가능"
            id="input-alternative-name"
          />
        </div>
        <div className="flex gap-2">
          {metrics.isCoverageOver || metrics.isRatioOver ? (
            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[10.5px] font-semibold px-2 py-0.5 rounded border border-red-100" id="badge-over">
              <AlertTriangle className="w-3 h-3" /> 규모초과
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold px-2 py-0.5 rounded border border-emerald-100" id="badge-compliant">
              <CheckCircle className="w-3 h-3" /> 법규적합
            </span>
          )}
        </div>
      </div>

      {/* 핵심 건축 계획 수치 입력 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 왼쪽 섹션: 입력 변수 */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">📐 배치 및 기획 지침 수치</h4>
          
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">지침 건폐율상한</label>
              <div className="relative">
                <input
                  type="number"
                  name="targetBuildingCoverageRatio"
                  value={alternative.targetBuildingCoverageRatio || ""}
                  onChange={handleInputChange}
                  className="w-full pr-5 pl-2 py-1 border border-slate-200 rounded text-xs font-mono text-right focus:border-blue-500 outline-none bg-slate-50 focus:bg-white"
                  id="input-target-bcr"
                />
                <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400">%</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">지침 용적률상한</label>
              <div className="relative">
                <input
                  type="number"
                  name="targetFloorAreaRatio"
                  value={alternative.targetFloorAreaRatio || ""}
                  onChange={handleInputChange}
                  className="w-full pr-5 pl-2 py-1 border border-slate-200 rounded text-xs font-mono text-right focus:border-blue-500 outline-none bg-slate-50 focus:bg-white"
                  id="input-target-far"
                />
                <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">계획 동수 (개동)</label>
              <input
                type="number"
                name="buildingCount"
                value={alternative.buildingCount || ""}
                onChange={handleInputChange}
                className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono text-right focus:border-indigo-500 outline-none bg-white font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-150"
                id="input-building-count"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">최고 계획 층수 (층)</label>
              <input
                type="number"
                name="maxFloors"
                value={alternative.maxFloors || ""}
                onChange={handleInputChange}
                className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono text-right focus:border-indigo-500 outline-none bg-white font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-150"
                id="input-max-floors"
              />
            </div>
          </div>

          {/* 특수 및 주조전환층 구성 계획 */}
          <div className="bg-slate-50/80 rounded border border-slate-200 p-2 space-y-2" id="special-floors-config">
            <span className="block text-[9.5px] font-bold text-slate-650 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>🏢 수직 높이 상세 보정 계획</span>
              <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded font-semibold border border-indigo-150 scale-95">적층 분석 연동</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[8.5px] font-medium text-slate-500 mb-0.5" title="저층부 포디엄(상가 등) 제외 층수">지상 포디엄</label>
                <div className="relative">
                  <input
                    type="number"
                    name="podiumFloors"
                    value={alternative.podiumFloors !== undefined ? alternative.podiumFloors : 0}
                    onChange={handleInputChange}
                    className="w-full pr-4 pl-1 py-0.5 border border-slate-200 rounded text-[10.5px] font-mono text-right bg-white"
                    placeholder="0"
                    id="input-podium-floors"
                  />
                  <span className="absolute right-1 top-1 text-[8px] text-slate-400">F</span>
                </div>
              </div>

              <div>
                <label className="block text-[8.5px] font-medium text-slate-500 mb-0.5" title="초고층 피난설비 또는 중간 피난안전층">피난안전</label>
                <div className="relative">
                  <input
                    type="number"
                    name="refugeFloors"
                    value={alternative.refugeFloors !== undefined ? alternative.refugeFloors : 0}
                    onChange={handleInputChange}
                    className="w-full pr-4 pl-1 py-0.5 border border-slate-200 rounded text-[10.5px] font-mono text-right bg-white"
                    placeholder="0"
                    id="input-refuge-floors"
                  />
                  <span className="absolute right-1 top-1 text-[8px] text-slate-400">F</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-white rounded p-1 px-1.5 text-[9.5px] border border-slate-150">
              <span className="text-slate-500 font-medium font-sans">실 사용 주거 적층 가능층수:</span>
              <span className="font-mono text-slate-800 font-bold">
                {maxFloors}F - {podiumFloors + refugeFloors}F = <span className="text-indigo-600 font-extrabold text-[10px]">{residentialFloors} 층</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="block text-[10px] font-semibold text-slate-500" title="대지에 배치할 실제 건축물들의 바닥 면적의 총 계">건축면적 (바닥 ㎡)</label>
                <button
                  type="button"
                  onClick={applyMaxBcrArea}
                  className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold underline bg-transparent cursor-pointer p-0 border-none transition-colors"
                  title={`지침 최대 건폐율(${alternative.targetBuildingCoverageRatio}%)을 적용한 한계 건축면적 ${maxBuildingArea.toLocaleString()}㎡를 입력값으로 즉시 설정합니다.`}
                >
                  최대한도 BCR 적용
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  name="buildingArea"
                  value={alternative.buildingArea || ""}
                  onChange={handleInputChange}
                  className="w-full pr-5 pl-2 py-1 border border-slate-200 rounded text-xs font-mono text-right focus:border-indigo-500 outline-none bg-white font-bold text-slate-800 focus:ring-1 focus:ring-indigo-150"
                  id="input-building-area"
                />
                <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400">㎡</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="block text-[10px] font-semibold text-slate-400" title="용적률 산정에 포함되는 지상층 바닥면적 전부">지상층 연면적 (㎡)</label>
                <span className="text-[8px] bg-slate-100 border border-slate-200 text-slate-500 px-1 rounded-sm scale-95 origin-right">세대수 연동🔒</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  name="aboveGroundFloorArea"
                  value={alternative.aboveGroundFloorArea || ""}
                  disabled
                  readOnly
                  className="w-full pr-5 pl-2 py-1 border border-slate-100 rounded text-xs font-mono text-right outline-none bg-slate-50 text-slate-450 font-bold select-none cursor-not-allowed"
                  id="input-above-ground-floor-area"
                  title="해당 수치는 타입별 세대 설계 배정표에 따라 법정 의무시설을 포함하여 실시간 자동 산출됩니다."
                />
                <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400">㎡</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="block text-[10px] font-semibold text-slate-450">지하층 연면적 (㎡)</label>
                <span className="text-[8px] bg-slate-100 border border-slate-200 text-slate-500 px-1 rounded-sm scale-95 origin-right">주차 연동🔒</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  name="undergroundFloorArea"
                  value={alternative.undergroundFloorArea || ""}
                  disabled
                  readOnly
                  className="w-full pr-5 pl-2 py-1 border border-slate-100 rounded text-xs font-mono text-right outline-none bg-slate-50 text-slate-450 select-none cursor-not-allowed"
                  id="input-underground-floor-area"
                  title="계획 주차면수에 규격 면적(38㎡/대) 및 기본 설비를 가산해 자동 연산됩니다."
                />
                <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400">㎡</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="block text-[10px] font-semibold text-slate-450">주동공동시설 (㎡)</label>
                <span className="text-[8px] bg-slate-100 border border-slate-200 text-slate-500 px-1 rounded-sm scale-95 origin-right">의무 규정🔒</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  name="communityFacilityArea"
                  value={alternative.communityFacilityArea || "0"}
                  disabled
                  readOnly
                  className="w-full pr-5 pl-2 py-1 border border-slate-100 rounded text-xs font-mono text-right outline-none bg-slate-50 text-slate-450 select-none cursor-not-allowed"
                  id="input-community-facility"
                  title="주택건설기준 법정 설치 규정에 비례하여 자동 계산됩니다."
                />
                <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400">㎡</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-0.5">
              <label className="block text-[10px] font-semibold text-slate-450">계획 주차대수 (대)</label>
              <span className="text-[8px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-1 rounded-sm scale-95 origin-right font-medium">법정 비율 동적 확보✓</span>
            </div>
            <input
              type="number"
              name="plannedParkingCount"
              value={alternative.plannedParkingCount || ""}
              disabled
              readOnly
              className="w-full px-2 py-1 border border-slate-100 rounded text-xs font-mono text-right outline-none bg-slate-50 text-slate-500 font-bold cursor-not-allowed select-none"
              placeholder="0"
              id="input-planned-parking"
              title="세대 면적별 법정 요구량의 정수 올림 조건을 완전 충족하도록 실시간 자동 락됩니다."
            />
          </div>
        </div>

        {/* 오른쪽 섹션: 실시간 한계 계산 분석 보드 */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col justify-between" id="feasibility-dashboard">
          <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-blue-700" /> 실시간 타당성 분석 계측기
            </h4>

            {/* 건폐율 인디케이터 */}
            <div className="space-y-1 mb-2.5">
              <div className="flex justify-between text-[11px] font-medium">
                <span className="text-slate-600">계획 건폐율 (B.C.R.)</span>
                <span className={`font-mono font-bold ${metrics.isCoverageOver ? "text-red-650 font-extrabold" : "text-blue-700"}`}>
                  {metrics.calculatedBuildingCoverageRatioValue.toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${metrics.isCoverageOver ? "bg-red-500" : "bg-blue-600"}`}
                  style={{ width: `${Math.min(100, (metrics.calculatedBuildingCoverageRatioValue / alternative.targetBuildingCoverageRatio) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>지침상한: {alternative.targetBuildingCoverageRatio}%</span>
                <span>
                  {metrics.isCoverageOver
                    ? `초과: +${Math.abs(metrics.buildingCoverageRatioBuffer).toFixed(2)}%p`
                    : `여유: -${metrics.buildingCoverageRatioBuffer.toFixed(2)}%p`}
                </span>
              </div>
            </div>

            {/* 용적률 인디케이터 */}
            <div className="space-y-1 mb-2.5">
              <div className="flex justify-between text-[11px] font-medium">
                <span className="text-slate-600">계획 용적률 (F.A.R.)</span>
                <span className={`font-mono font-bold ${metrics.isRatioOver ? "text-red-650 font-extrabold" : "text-blue-700"}`}>
                  {metrics.calculatedFloorAreaRatioValue.toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${metrics.isRatioOver ? "bg-red-500" : "bg-blue-600"}`}
                  style={{ width: `${Math.min(100, (metrics.calculatedFloorAreaRatioValue / alternative.targetFloorAreaRatio) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>지침상한: {alternative.targetFloorAreaRatio}%</span>
                <span>
                  {metrics.isRatioOver
                    ? `초과: +${Math.abs(metrics.floorAreaRatioBuffer).toFixed(2)}%p`
                    : `여유: -${metrics.floorAreaRatioBuffer.toFixed(2)}%p`}
                </span>
              </div>
            </div>

            {/* 주차대수 수급분석 */}
            <div className="border-t border-slate-200 pt-2.5 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">법정 주차 필요대수:</span>
                <span className="font-mono text-slate-800 font-bold">{metrics.legalParkingCount.toFixed(1)} 대</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">가구당 주차 확보율:</span>
                <span className="font-mono text-slate-800 font-bold">{metrics.parkingPerUnit.toFixed(2)} 대/세대</span>
              </div>
              <div className="flex justify-between items-center bg-white border border-slate-200 rounded p-1.5 mt-1">
                <span className="text-[10px] text-slate-500 font-semibold font-sans">주차 공급상태</span>
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${metrics.parkingDeficitOrSurplus >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {metrics.parkingDeficitOrSurplus >= 0
                    ? `만족 (+${metrics.parkingDeficitOrSurplus.toFixed(1)}대)`
                    : `부족 (${metrics.parkingDeficitOrSurplus.toFixed(1)}대)`}
                </span>
              </div>
            </div>

            {/* 동수 × 최고층수 배치 타당성 진단 */}
            <div className="border-t border-slate-200 pt-2.5 space-y-1 text-[11px] mt-2">
              <span className="text-[10px] font-bold text-slate-500 block">🏢 동수 × 최고층수 배치 타당성</span>
              
              <div className="flex justify-between text-[10.5px]">
                <span className="text-slate-500">동당 평균 건축면적:</span>
                <span className="font-mono text-slate-800 font-bold">{avgFootprintPerBldg.toLocaleString()} ㎡/동</span>
              </div>
              <div className="flex justify-between text-[10.5px]">
                <span className="text-slate-500">층당 필요 바닥면적:</span>
                <span className="font-mono text-indigo-700 font-bold">{minFloorPlateNeeded.toLocaleString()} ㎡/동</span>
              </div>

              {bldgCount > 0 && maxFloors > 0 && bldgArea > 0 ? (
                <div className={`border p-2 rounded mt-1.5 text-[10px] leading-relaxed transition-all ${isLayoutPlannable ? "bg-indigo-50/70 border-indigo-150 text-indigo-950" : "bg-amber-50 border-amber-200 text-amber-950"}`}>
                  <div className="flex items-center gap-1 font-bold mb-0.5">
                    <span>{isLayoutPlannable ? "🟢 배치 수용력 적정" : "⚠️ 배치 수용력 불충분"}</span>
                  </div>
                  <p className="text-[9.5px] text-slate-600 font-normal">
                    {isLayoutPlannable 
                      ? `충분한 기획 바닥면적(${avgFootprintPerBldg}㎡)으로 계산된 지상 세대 연면적(최소 ${minFloorPlateNeeded}㎡ 필요)을 지정 층고에 완전히 배치할 수 있습니다.`
                      : `지상층 주동 연면적 대비 지정 층수(${maxFloors}층)가 낮거나 동수가 부족하여 면적이 넘칩니다. 최고층수를 상향하여 수직 적층 폭을 늘려주세요.`
                    }
                  </p>
                </div>
              ) : (
                <div className="bg-slate-100 border border-slate-200 p-2 rounded mt-1.5 text-[9.5px] text-slate-500 leading-tight">
                  💡 배치 동수, 최고층수, 그리고 건축면적을 입력해 주시면 실시간으로 주동 수평/수직 배치 타당성을 진단해 드립니다.
                </div>
              )}
            </div>
          </div>

          <div className="mt-2.5 bg-slate-800 text-slate-300 rounded p-2 text-[10px] flex items-start gap-1">
            <Info className="w-3" />
            <p className="leading-tight">
              실무 가이드: 타입별 세대수를 직접 조정하면 연면적과 주차율이 실시간으로 동기화되어 사업성 수치에 보정됩니다.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
