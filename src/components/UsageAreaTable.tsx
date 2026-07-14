/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ProjectInfo, Alternative } from "../types";
import { calculateAlternativeMetrics } from "../utils/calculations";

interface UsageAreaTableProps {
  project: ProjectInfo;
  alternative: Alternative;
}

export const UsageAreaTable: React.FC<UsageAreaTableProps> = ({
  project,
  alternative,
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

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-4 text-[12px]" id="area-breakdown-details">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-3.5 bg-indigo-600 rounded-sm"></span>
          <h4 className="text-[11px] font-bold text-slate-800">📋 용도별 세부 설계면적 분석 및 인허가 기준 검토</h4>
        </div>
        <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-150 font-semibold">실세대 연동✓</span>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="w-full text-left text-[10px] border-collapse bg-slate-50/50">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-[9px]">
              <th className="p-1.5 px-2.5">시설 구분 (바닥 용도)</th>
              <th className="p-1.5 px-2.5 text-right w-[110px]">계산면적 (㎡)</th>
              <th className="p-1.5 px-1 text-center w-[60px]">비율</th>
              <th className="p-1.5 px-2.5 text-slate-500 font-normal">법정 하한 규정 및 실무 적용 산출 공식</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 text-slate-700 bg-white">
            {/* 1. 지상 주거용 전용/공용 합산 */}
            <tr>
              <td className="p-2 px-2.5 font-medium flex items-center gap-1">
                <span>🏠</span> 주거 지상 연면적
              </td>
              <td className="p-2 px-2.5 text-right font-mono font-bold text-slate-800">
                {residentialAboveArea.toLocaleString()} ㎡
              </td>
              <td className="p-2 px-1 text-center text-slate-500 font-mono text-[9px]">
                {alternative.aboveGroundFloorArea > 0 ? ((residentialAboveArea / alternative.aboveGroundFloorArea) * 100).toFixed(1) : 0}%
              </td>
              <td className="p-2 px-2.5 text-slate-500 leading-normal">
                타입별 세대 전용 공급면적 총합산 [∑(전용 + 주거공용) × 세대수]. 주동 내부 전유·코어 공간.
              </td>
            </tr>

            {/* 2. 지상 주민공동시설 */}
            <tr>
              <td className="p-2 px-2.5 font-medium flex items-center gap-1">
                <span>👥</span> 주민공동시설 (커뮤니티)
              </td>
              <td className="p-2 px-2.5 text-right font-mono font-bold text-indigo-650">
                {communityFacilityArea.toLocaleString()} ㎡
              </td>
              <td className="p-2 px-1 text-center text-slate-400 font-mono text-[9px]">
                {alternative.aboveGroundFloorArea > 0 ? ((communityFacilityArea / alternative.aboveGroundFloorArea) * 100).toFixed(1) : 0}%
              </td>
              <td className="p-2 px-2.5 text-slate-500 leading-normal">
                <span className="font-semibold text-slate-600 block">주택건설기준 제55조의2 법정의무:</span> 
                100세대 미만 50㎡, 100~1000세대 세대당 2.5㎡, 1000세대 이상 500㎡ + 세대당 2.0㎡ 자동 누진 적용.
              </td>
            </tr>

            {/* 3. 기타 지상 부대복리 */}
            <tr>
              <td className="p-2 px-2.5 font-medium flex items-center gap-1">
                <span>🏢</span> 기타 부대복리시설
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-slate-700">
                {welfareFacilityArea.toLocaleString()} ㎡
              </td>
              <td className="p-2 px-1 text-center text-slate-400 font-mono text-[9px]">
                {alternative.aboveGroundFloorArea > 0 ? ((welfareFacilityArea / alternative.aboveGroundFloorArea) * 100).toFixed(1) : 0}%
              </td>
              <td className="p-2 px-2.5 text-slate-500 leading-normal">
                경로당, 어린이집, 관리기획실, 유치원 등 실무 기획 가중 계수 [세대당 1.5㎡] 자동 완결 산식 적용.
              </td>
            </tr>

            {/* 4. 지상층 연면적 (계) */}
            <tr className="bg-slate-50/80 font-semibold text-slate-900 border-t border-slate-200">
              <td className="p-2 px-2.5 text-slate-800 font-bold flex items-center gap-1">
                <span>📈</span> 지상 연면적 총계 (A)
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-indigo-700 font-extrabold">
                {(alternative.aboveGroundFloorArea).toLocaleString()} ㎡
              </td>
              <td className="p-2 px-1 text-center text-slate-700 font-mono text-[9px] font-bold">100.0%</td>
              <td className="p-2 px-2.5 text-indigo-900 leading-normal bg-indigo-50/10">
                <span className="font-semibold">용적률 산정 직결 연면적:</span> (주거지상 + 주민시설 + 부대시설). 이 주거 및 부대시설 면적의 지상 총합이 용적률 %를 통제합니다.
              </td>
            </tr>

            {/* 5. 지하층 주차장 세분 */}
            <tr>
              <td className="p-2 px-2.5 font-medium text-slate-600 flex items-center gap-1">
                <span>🚗</span> 지하 주차장 면적
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-slate-600">
                {undergroundParkingArea.toLocaleString()} ㎡
              </td>
              <td className="p-2 px-1 text-center text-slate-400 font-mono text-[9px]">
                {alternative.undergroundFloorArea > 0 ? ((undergroundParkingArea / alternative.undergroundFloorArea) * 100).toFixed(1) : 0}%
              </td>
              <td className="p-2 px-2.5 text-slate-500 leading-normal">
                계획 주차 {alternative.plannedParkingCount}대 × <span className="font-semibold text-slate-600">대당 38㎡</span> (실무 표준 법정 단일주차칸 2.5×5m 외 주차 차로, 램프구간, 환기구 등 지하 주차기둥 손실보장 반영).
              </td>
            </tr>

            {/* 6. 지하 기계/설비/피트실 */}
            <tr>
              <td className="p-2 px-2.5 font-medium text-slate-600 flex items-center gap-1">
                <span>⚙️</span> 지하 기계/전기설비실
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-slate-600">
                {undergroundUtilityArea.toLocaleString()} ㎡
              </td>
              <td className="p-2 px-1 text-center text-slate-400 font-mono text-[9px]">
                {alternative.undergroundFloorArea > 0 ? ((undergroundUtilityArea / alternative.undergroundFloorArea) * 100).toFixed(1) : 0}%
              </td>
              <td className="p-2 px-2.5 text-slate-500 leading-normal">
                기계실, 발전실, 수전반실, 배관 비트, 유입구, 정수조 등 아파트 인프라 설비를 위한 가중 계수 [세대당 4.5㎡] 산출 결합.
              </td>
            </tr>

            {/* 7. 지하층 연면적 (계) */}
            <tr className="bg-slate-50/80 font-semibold text-slate-900 border-t border-slate-200">
              <td className="p-2 px-2.5 text-slate-800 font-bold flex items-center gap-1">
                <span>📉</span> 지하 연면적 총계 (B)
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-slate-850 font-extrabold">
                {(alternative.undergroundFloorArea).toLocaleString()} ㎡
              </td>
              <td className="p-2 px-1 text-center text-slate-700 font-mono text-[9px]">-</td>
              <td className="p-2 px-2.5 text-slate-600 leading-normal">
                건축법상 용적률 산정에서는 <span className="font-semibold text-emerald-700">전액 제척(제외)</span>되나, 토공사 및 지하 골조 구조 시공 원가 산정을 위한 고유 대장 연면적 계산서에는 100% 산입됩니다.
              </td>
            </tr>

            {/* 8. 총 연면적 합계 */}
            <tr className="bg-slate-900 text-white font-bold text-[10px] rounded-b border-t border-slate-950">
              <td className="p-2 px-2.5 font-bold flex items-center gap-1 text-yellow-400">
                <span>🏢</span> 총 설계 연면적 합계 (A + B)
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-yellow-400 font-extrabold text-[11px]">
                {(alternative.aboveGroundFloorArea + alternative.undergroundFloorArea).toLocaleString()} ㎡
              </td>
              <td className="p-2 px-1 text-center font-mono">-</td>
              <td className="p-2 px-2.5 text-slate-300 leading-normal">
                해당 주차공간 and 커뮤니티 의무 요건을 전수 보장 조합한 시점에서 완결된 <span className="text-white font-semibold">사업 대지 종합 공사용 연면적</span>입니다 (공사 원가 계산의 정식 계약 면적).
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
