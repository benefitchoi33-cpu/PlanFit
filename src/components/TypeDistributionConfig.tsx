/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { TypeConfig, Alternative } from "../types";
import { Plus, Trash2, Sliders, Layers, MessageSquare, Info } from "lucide-react";

interface TypeDistributionConfigProps {
  alternative: Alternative;
  onChange: (updated: TypeConfig[]) => void;
  onChangeMode: (mode: "layout" | "manual") => void;
  onShowNotification?: (message: string, type?: "success" | "error" | "info") => void;
}

export const TypeDistributionConfig: React.FC<TypeDistributionConfigProps> = ({
  alternative,
  onChange,
  onChangeMode,
  onShowNotification,
}) => {
  const mode = alternative.unitSelectionMode || "layout";
  const buildingCount = alternative.buildingCount || 0;
  const maxFloors = alternative.maxFloors || 0;
  const podiumFloors = alternative.podiumFloors || 0;
  const refugeFloors = alternative.refugeFloors || 0;
  const transferFloors = alternative.transferFloors || 0;

  const residentialFloors = Math.max(0, maxFloors - podiumFloors - refugeFloors - transferFloors);
  const multiplier = residentialFloors * buildingCount;
  const types = alternative.types || [];

  const handleRowChange = (id: string, field: keyof Omit<TypeConfig, 'id'>, value: any) => {
    const updated = types.map((item) => {
      if (item.id === id) {
        let finalVal = value;
        if (field === "unitsPerFloor") {
          finalVal = Math.max(0, Math.round(parseFloat(value) || 0));
        } else if (field === "exclArea" || field === "commArea" || field === "count") {
          finalVal = Math.max(0, parseFloat(value) || 0);
        }
        
        const updatedItem = { ...item, [field]: finalVal };
        
        // 연동 기획 모드일 때 층당 호수 수정 시 세대수 즉각 계산
        if (mode === "layout") {
          const upf = field === "unitsPerFloor" ? finalVal : (item.unitsPerFloor ?? (item.count / (multiplier || 1)));
          const upfInteger = Math.max(1, Math.round(upf));
          updatedItem.unitsPerFloor = upfInteger;
          updatedItem.count = multiplier > 0 ? Math.round(upfInteger * multiplier) : 0;
        } else {
          // 수동 직접입력 모드일 때 세대수 수정 시 층당 호수 역산 기록
          if (field === "count") {
            updatedItem.unitsPerFloor = multiplier > 0 ? Math.max(1, Math.round(finalVal / multiplier)) : 0;
          }
        }
        
        return updatedItem;
      }
      return item;
    });
    onChange(updated);
  };

  const addRow = () => {
    const newId = `type-${Date.now()}`;
    const initialUpf = 1;
    const initialCount = mode === "layout" ? Math.round(initialUpf * multiplier) : 100;
    const newType: TypeConfig = {
      id: newId,
      name: `Type-${types.length + 1}`,
      exclArea: 84.9,
      commArea: 25.1,
      count: initialCount,
      unitsPerFloor: initialUpf,
    };
    onChange([...types, newType]);
  };

  const removeRow = (id: string) => {
    if (types.length <= 1) {
      if (onShowNotification) {
        onShowNotification("최소 한 개의 세대 타입형 설정은 유지되어야 합니다.", "error");
      } else {
        alert("최소 한 개의 세대 타입형 설정은 유지되어야 합니다.");
      }
      return;
    }
    const removedType = types.find((item) => item.id === id);
    onChange(types.filter((item) => item.id !== id));
    if (onShowNotification && removedType) {
      onShowNotification(`[${removedType.name}] 전용유형 정보가 구성표에서 임시 제거되었습니다.`, "info");
    }
  };

  // 실무용 빠른 프리셋 규격 적용 도우미
  const applyPreset = (presetType: "59" | "84" | "114") => {
    const presets = {
      "59": { excl: 59.9, comm: 18.5, name: "59A", upf: 2 },
      "84": { excl: 84.9, comm: 24.8, name: "84A", upf: 2 },
      "114": { excl: 114.8, comm: 32.2, name: "114A", upf: 1 },
    };
    
    const picked = presets[presetType];
    const newId = `preset-${Date.now()}`;
    const initialCount = mode === "layout" ? Math.round(picked.upf * multiplier) : 50;
    const newType: TypeConfig = {
      id: newId,
      name: picked.name,
      exclArea: picked.excl,
      commArea: picked.comm,
      count: initialCount,
      unitsPerFloor: picked.upf,
    };
    onChange([...types, newType]);
  };

  // 총 세대수 및 면적 집계
  const totalUnits = types.reduce((sum, t) => sum + t.count, 0);
  const totalExcl = types.reduce((sum, t) => sum + t.exclArea * t.count, 0);
  const totalComm = types.reduce((sum, t) => sum + t.commArea * t.count, 0);
  const totalSupply = totalExcl + totalComm;

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-4 text-[12px]" id="type-config-panel">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-650" />
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">공동주택 타입별 세대 구성 및 분양면적표</h3>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            동수 x 주거가능층 조합에 의한 기획 설계 방식 또는 수동 직접 입력 방식을 선택할 수 있습니다.
          </p>
        </div>

        {/* 세대 산정 방식 전환 스위치 (Segmented Controller) */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start lg:self-center" id="scale-calc-mode-switch">
          <button
            type="button"
            onClick={() => {
              onChangeMode("layout");
              if (onShowNotification) {
                onShowNotification("🔄 동/층 호조합 연동 기획 모드가 활성화되어 세대수가 자동 계산됩니다.", "success");
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              mode === "layout" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> 동·층 호조합 기획 (추천)
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeMode("manual");
              if (onShowNotification) {
                onShowNotification("✍️ 수동 직접지정 모드로 전환되어 세대수를 개별 작성할 수 있습니다.", "info");
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              mode === "manual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> 수동 개별 직접입력
          </button>
        </div>
      </div>

      {mode === "layout" && (
        <div className="mb-3 px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded text-[11px] flex items-center justify-between text-indigo-950">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <span>
              현재 <strong>{alternative.name}</strong> 기획 높이 연계 상태: <strong>{buildingCount}동</strong> × <strong>주거실층 {residentialFloors}F</strong> (최고 {maxFloors}F) = 1호당 기본 <strong className="text-indigo-700">{multiplier}세대</strong> 배정
            </span>
          </div>
          <span className="text-[9.5px] text-indigo-600 font-semibold underline decoration-dotted">세대수 직접 수정🔒 (호수 수정시 연동)</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-300 text-[11px]">
              <th className="py-2 px-3 min-w-[90px] text-slate-600">세대 타입명</th>
              <th className="py-2 px-3 text-right text-slate-600">전용면적 (A)</th>
              <th className="py-2 px-3 text-right text-slate-600">주거공용 (B)</th>
              <th className="py-2 px-3 bg-slate-100/50 text-slate-700 font-bold text-right border-l border-slate-200">공급면적 (A+B)</th>
              
              {/* 호조합 전용 열 컬럼 */}
              <th className={`py-2 px-3 text-right font-bold transition-all border-l border-slate-200 ${mode === "layout" ? "bg-indigo-50 text-indigo-950" : "text-slate-400 font-light"}`}>
                동별 층당 호수
              </th>

              <th className={`py-2 px-3 min-w-[120px] text-right font-bold border-l border-slate-250 ${mode === "manual" ? "bg-indigo-50/40 text-indigo-900" : "bg-slate-50 text-slate-500"}`}>
                계획 세대수
              </th>
              
              <th className="py-2 px-3 font-semibold text-right text-slate-600">총 전용면적</th>
              <th className="py-2 px-3 font-semibold text-right text-slate-600 font-sans">총 공급면적</th>
              <th className="py-2 px-2 text-center w-10">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 font-mono text-slate-700">
            {types.map((type) => {
              const supplyAreaPerUnit = type.exclArea + type.commArea;
              const totalExclRow = type.exclArea * type.count;
              const totalSupplyRow = supplyAreaPerUnit * type.count;
              
              // 현재 라인 세대 비율 역산 표시
              const currentUpf = type.unitsPerFloor !== undefined ? Math.round(type.unitsPerFloor) : (multiplier > 0 ? Math.max(1, Math.round(type.count / multiplier)) : 0);

              return (
                <tr key={type.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* 세대 타입명 */}
                  <td className="py-1.5 px-2">
                    <input
                      type="text"
                      value={type.name}
                      onChange={(e) => handleRowChange(type.id, "name", e.target.value)}
                      className="w-full px-1.5 py-0.5 border border-transparent hover:border-slate-300 focus:border-slate-800 rounded bg-transparent focus:bg-white text-xs text-left font-bold"
                    />
                  </td>
                  
                  {/* 전용면적 */}
                  <td className="py-1.5 px-2">
                    <div className="relative flex items-center justify-end">
                      <input
                        type="number"
                        step="0.01"
                        value={type.exclArea}
                        onChange={(e) => handleRowChange(type.id, "exclArea", e.target.value)}
                        className="w-full pr-4 py-0.5 text-right border border-transparent hover:border-slate-200 focus:border-slate-800 bg-transparent focus:bg-white rounded text-xs"
                      />
                      <span className="absolute right-0 text-[10px] text-slate-400">㎡</span>
                    </div>
                  </td>
                  
                  {/* 주거공용 */}
                  <td className="py-1.5 px-2">
                    <div className="relative flex items-center justify-end">
                      <input
                        type="number"
                        step="0.01"
                        value={type.commArea}
                        onChange={(e) => handleRowChange(type.id, "commArea", e.target.value)}
                        className="w-full pr-4 py-0.5 text-right border border-transparent hover:border-slate-200 focus:border-slate-800 bg-transparent focus:bg-white rounded text-xs"
                      />
                      <span className="absolute right-0 text-[10px] text-slate-400">㎡</span>
                    </div>
                  </td>
                  
                  {/* 공급면적 */}
                  <td className="py-1.5 px-3 bg-slate-50/30 text-right text-slate-800 font-bold border-l border-slate-150">
                    {supplyAreaPerUnit.toFixed(2)} ㎡
                  </td>
                  
                  {/* 동별 층당 호수 고유 컬럼 */}
                  <td className={`py-1.5 px-2 border-l border-slate-150 ${mode === "layout" ? "bg-indigo-50/10" : "bg-slate-50/30 text-slate-400"}`}>
                    {mode === "layout" ? (
                      <div className="relative flex items-center justify-end">
                        <input
                          type="number"
                          step="1"
                          value={Math.round(currentUpf)}
                          onChange={(e) => handleRowChange(type.id, "unitsPerFloor", e.target.value)}
                          className="w-full pr-4 py-0.5 text-right border border-transparent hover:border-indigo-200 focus:border-indigo-600 bg-transparent focus:bg-white rounded text-xs font-bold text-indigo-950"
                          title="한 개층 평면에서의 해당 평형 호배조 라인 개수를 입력해 줍니다. (예: 2호 조합, 3호 조합 등, 무조건 정수)"
                        />
                        <span className="absolute right-0 text-[10px] text-indigo-600 font-bold">호</span>
                      </div>
                    ) : (
                      <div className="text-right pr-2 text-slate-400 text-[11px] font-medium" title="수동 지정 모드에서는 역산치만 모니터링됩니다.">
                        {Math.round(currentUpf)} 호
                      </div>
                    )}
                  </td>
                  
                  {/* 계획 세대수 */}
                  <td className={`py-1.5 px-2 border-l border-slate-200 transition-all ${mode === "layout" ? "bg-indigo-50/10" : ""}`}>
                    {mode === "layout" ? (
                      <div className="text-right pr-2 text-indigo-950 font-bold flex flex-col justify-center text-[11.5px]" title={`${currentUpf}호 x ${residentialFloors}층 x ${buildingCount}동`}>
                        <span>{type.count} 세대</span>
                        <span className="text-[8.5px] text-indigo-400 font-normal">({currentUpf}호 × {multiplier}배수)</span>
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-end">
                        <input
                          type="number"
                          value={type.count}
                          onChange={(e) => handleRowChange(type.id, "count", e.target.value)}
                          className="w-full pr-4 py-0.5 text-right border border-transparent hover:border-slate-200 focus:border-slate-800 bg-transparent focus:bg-white rounded text-xs font-bold text-slate-900"
                        />
                        <span className="absolute right-0 text-[10px] text-slate-500">대</span>
                      </div>
                    )}
                  </td>
                  
                  {/* 총 전용면적 / 총 공급면적 */}
                  <td className="py-1.5 px-3 text-right text-[11px]">
                    {totalExclRow.toLocaleString(undefined, { maximumFractionDigits: 1 })} ㎡
                  </td>
                  <td className="py-1.5 px-3 text-right font-medium text-slate-950 text-[11px]">
                    {totalSupplyRow.toLocaleString(undefined, { maximumFractionDigits: 1 })} ㎡
                  </td>
                  
                  {/* 삭제 */}
                  <td className="py-1.5 px-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(type.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="타입 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* 계산된 합계 행 */}
            <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-900">
              <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-350">합계 (Total)</td>
              <td className="py-2 px-3 text-right text-[10px] text-slate-400">-</td>
              <td className="py-2 px-3 text-right text-[10px] text-slate-400">-</td>
              <td className="py-2 px-3 text-right bg-slate-900/40 text-slate-350 text-[10.5px] border-l border-slate-700">
                평균: {totalUnits > 0 ? (totalSupply / totalUnits).toFixed(2) : "0"} ㎡
              </td>
              
              {/* 호합계 */}
              <td className="py-2 px-3 text-right text-indigo-200 text-xs border-l border-slate-700 font-bold bg-transparent">
                층당: {Math.round(types.reduce((sum, t) => sum + (t.unitsPerFloor !== undefined ? t.unitsPerFloor : (multiplier > 0 ? t.count / multiplier : 0)), 0))} 호
              </td>

              <td className="py-2 px-3 text-right text-yellow-400 text-xs border-l border-slate-700 bg-slate-900/20 font-extrabold">
                {totalUnits} 세대
              </td>
              <td className="py-2 px-3 text-right text-slate-300">
                {totalExcl.toLocaleString(undefined, { maximumFractionDigits: 1 })} ㎡
              </td>
              <td className="py-2 px-3 text-right text-slate-100">
                {totalSupply.toLocaleString(undefined, { maximumFractionDigits: 1 })} ㎡
              </td>
              <td className="py-2 px-1 text-center font-mono text-[9px] text-slate-400">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3.5 flex flex-col md:flex-row gap-3.5 justify-between items-start md:items-center bg-slate-50 rounded p-3 border border-slate-200">
        <p className="text-[10px] text-slate-600 leading-normal flex items-start gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
          <span>
            {mode === "layout" ? (
              <>
                <strong>실무 가이드 (연동형)</strong>: 건축물의 동수, 최고 높이 및 부대 제외층을 조절하고 타입별로 <strong>층당 호 조합</strong>을 설정하는 것만으로 각 타입별 총 세대 수 및 설계 면적이 완전히 동조하여 역학 산출됩니다.
              </>
            ) : (
              <>
                <strong>실무 가이드 (수동형)</strong>: 총 전용면적과 실세대수를 단편적으로 직접 제어합니다. 해당 모드에서는 상단 층높이 및 층고 변화에 의한 세대수 보정이 차단됩니다.
              </>
            )}
          </span>
        </p>
        <div className="flex gap-1.5 self-end md:self-center shrink-0">
          <span className="text-[10px] text-slate-400 font-semibold mr-1 shrink-0 flex items-center">📐 빠른형식 가산:</span>
          <button
            type="button"
            onClick={() => applyPreset("59")}
            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[10.5px] rounded transition-colors font-mono font-bold cursor-pointer"
          >
            + 59A (2호)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("84")}
            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[10.5px] rounded transition-colors font-mono font-bold cursor-pointer"
          >
            + 84A (1.5호)
          </button>
          <button
            type="button"
            onClick={() => addRow()}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-bold rounded flex items-center gap-1 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3 h-3" /> 규격형 추가
          </button>
        </div>
      </div>
    </div>
  );
};
