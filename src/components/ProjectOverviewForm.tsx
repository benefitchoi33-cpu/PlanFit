/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ProjectInfo } from "../types";
import { Landmark, Navigation, MapPin, Minimize, HelpCircle } from "lucide-react";

interface ProjectOverviewFormProps {
  project: ProjectInfo;
  onChange: (updated: ProjectInfo) => void;
}

// 대표적인 용도지역 가이드 데이터 (참고용)
const ZONE_GUIDES: Record<string, { bcr: number; far: number; desc: string }> = {
  "제1종일반주거지역": { bcr: 60, far: 150, desc: "저층 주택 중심" },
  "제2종일반주거지역": { bcr: 60, far: 200, desc: "중층 주택 중심" },
  "제3종일반주거지역": { bcr: 50, far: 250, desc: "중고층 주택 중심" },
  "준주거지역": { bcr: 60, far: 400, desc: "주거 및 상업보완" },
  "일반상업지역": { bcr: 60, far: 800, desc: "고밀도 상업 및 중심 시설" },
  "근린상업지역": { bcr: 60, far: 500, desc: "근린 편의제공 상업지역" },
};

export const ProjectOverviewForm: React.FC<ProjectOverviewFormProps> = ({
  project,
  onChange,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "lotArea" || name === "roadArea") {
      onChange({
        ...project,
        [name]: Math.max(0, parseFloat(value) || 0),
      });
    } else {
      onChange({
        ...project,
        [name]: value,
      });
    }
  };

  const handleZoneSelect = (zoneName: string) => {
    onChange({
      ...project,
      zoneType: zoneName
    });
  };

  const netAreaInRealtime = Math.max(0, project.lotArea - project.roadArea);

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-4 text-[12px]" id="project-overview-panel">
      <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
        <Landmark className="w-3.5 h-3.5 text-blue-700" id="landmark-icon" />
        프로젝트 기본 정보
      </h2>

      <div className="space-y-3">
        {/* 프로젝트명 */}
        <div className="grid grid-cols-1 gap-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight flex items-center gap-1">
            <Navigation className="w-3 h-3 text-slate-400" /> 프로젝트명
          </label>
          <input
            type="text"
            name="projectName"
            value={project.projectName}
            onChange={handleInputChange}
            placeholder="예: 마포 주거공동체 신축규모검토"
            className="w-full border border-slate-200 p-2 text-xs font-semibold rounded bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors"
            id="input-project-name"
          />
        </div>

        {/* 대지위치 */}
        <div className="grid grid-cols-1 gap-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" /> 대지위치
          </label>
          <input
            type="text"
            name="location"
            value={project.location}
            onChange={handleInputChange}
            placeholder="예: 서울특별시 마포구 OOO번지"
            className="w-full border border-slate-200 p-2 text-xs font-medium rounded bg-slate-50 focus:bg-white outline-none focus:border-blue-500 transition-colors"
            id="input-location"
          />
        </div>

        {/* 용도지역 */}
        <div className="grid grid-cols-1 gap-1">
          <label className="text-[10px] font-semibold text-slate-400 tracking-tight">지정 용도지역</label>
          <select
            name="zoneType"
            value={project.zoneType}
            onChange={handleInputChange}
            className="w-full border border-slate-200 p-2 text-xs rounded bg-slate-50 focus:bg-white outline-none focus:border-blue-500 font-medium"
            id="select-zone-type"
          >
            <option value="">-- 용도지역 지정 --</option>
            {Object.keys(ZONE_GUIDES).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
            <option value="기타 용도지역">직접 작성 (기타 지역)</option>
          </select>
        </div>

        {/* 대지 면적 산정 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-400">대지면적 (㎡)</label>
            <div className="relative">
              <input
                type="number"
                name="lotArea"
                value={project.lotArea || ""}
                onChange={handleInputChange}
                className="w-full border border-slate-200 p-2 pr-6 text-xs font-mono font-bold rounded bg-blue-50/30 text-blue-800 focus:bg-white focus:text-slate-900 outline-none"
                id="input-lot-area"
              />
              <span className="absolute right-2 top-2 text-[10px] text-slate-400">㎡</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5">
              도로제척 <Minimize className="w-2.5 h-2.5 text-slate-400" />
            </label>
            <div className="relative">
              <input
                type="number"
                name="roadArea"
                value={project.roadArea || "0"}
                onChange={handleInputChange}
                className="w-full border border-slate-200 p-2 pr-6 text-xs font-mono text-red-700 font-medium rounded bg-red-50/20 focus:bg-white focus:text-slate-900 outline-none"
                id="input-road-area"
              />
              <span className="absolute right-2 top-2 text-[10px] text-red-400">㎡</span>
            </div>
          </div>
        </div>

        {/* 용도지역 가이드 팁 / 요약 피드백 */}
        {ZONE_GUIDES[project.zoneType] ? (
          <div className="bg-blue-50/40 rounded p-2 text-[11px] border border-blue-100/50 mt-1" id="zone-guide-info">
            <div className="flex justify-between items-center text-slate-600 font-mono">
              <span>조례상 건폐율:</span>
              <span className="font-bold text-slate-900">{ZONE_GUIDES[project.zoneType].bcr}% 이하</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 font-mono mt-0.5">
              <span>조례상 용적률:</span>
              <span className="font-bold text-slate-900">{ZONE_GUIDES[project.zoneType].far}% 이하</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded p-2 text-[10px] text-slate-400 border border-dashed border-slate-200 mt-1 text-center" id="zone-guide-info">
            용도지역 가이드 힌트 표시 중
          </div>
        )}

        <div className="mt-2 bg-slate-900 text-white rounded p-2.5 flex justify-between items-center" id="net-area-badge">
          <div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">산정 대지면적 (Net)</p>
            <p className="text-[10px] font-mono font-bold text-emerald-400">{(netAreaInRealtime * 0.3025).toFixed(1)}평 환산</p>
          </div>
          <p className="font-mono text-xs font-bold">{netAreaInRealtime.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ㎡</p>
        </div>
      </div>
    </div>
  );
};
