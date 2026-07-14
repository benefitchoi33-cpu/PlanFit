/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { ProjectInfo, Alternative, TypeConfig } from "./types";
import { ProjectOverviewForm } from "./components/ProjectOverviewForm";
import { AlternativeDetailsCard } from "./components/AlternativeDetailsCard";
import { TypeDistributionConfig } from "./components/TypeDistributionConfig";
import { FloorAreaTable } from "./components/FloorAreaTable";
import { UsageAreaTable } from "./components/UsageAreaTable";
import { ComparisonMatrix } from "./components/ComparisonMatrix";
import { AiAdvisorPanel } from "./components/AiAdvisorPanel";
import { AiAlternativeGenerator } from "./components/AiAlternativeGenerator";
import { calculateAlternativeMetrics, convertProjectToCsvRows, convertAlternativeToGansamRows } from "./utils/calculations";

import {
  Download,
  Upload,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  LayoutDashboard,
  Coins,
  Landmark,
  Key,
  Eye,
  EyeOff
} from "lucide-react";

// 초기 시뮬레이션 고품질 실무 데이터 세트 정의
const INITIAL_PROJECT: ProjectInfo = {
  projectName: "마포 삼개공원 공동주택 신축사업 규모검토",
  location: "서울특별시 마포구 도화동 OOO지번 일대",
  zoneType: "제3종일반주거지역",
  lotArea: 12500,
  roadArea: 500,
};

const INITIAL_ALTERNATIVES: Alternative[] = [
  {
    id: "alt-1",
    name: "대안 1 (중소형 밀집형 안)",
    buildingCount: 4,
    maxFloors: 20,
    targetBuildingCoverageRatio: 50,
    targetFloorAreaRatio: 250,
    buildingArea: 2150,
    aboveGroundFloorArea: 28800,
    undergroundFloorArea: 12500,
    communityFacilityArea: 650,
    plannedParkingCount: 320,
    podiumFloors: 1,
    refugeFloors: 0,
    unitSelectionMode: "layout",
    types: [
      { id: "t1-1", name: "59A", exclArea: 59.9, commArea: 18.2, count: 152, unitsPerFloor: 2 },
      { id: "t1-2", name: "84A", exclArea: 84.9, commArea: 24.5, count: 76, unitsPerFloor: 1 },
    ],
  },
  {
    id: "alt-2",
    name: "대안 2 (중대형 균형형 안)",
    buildingCount: 3,
    maxFloors: 25,
    targetBuildingCoverageRatio: 50,
    targetFloorAreaRatio: 250,
    buildingArea: 1980,
    aboveGroundFloorArea: 29500,
    undergroundFloorArea: 14000,
    communityFacilityArea: 800,
    plannedParkingCount: 350,
    podiumFloors: 1,
    refugeFloors: 0,
    unitSelectionMode: "layout",
    types: [
      { id: "t2-1", name: "84A", exclArea: 84.9, commArea: 24.5, count: 144, unitsPerFloor: 2 },
      { id: "t2-2", name: "114A", exclArea: 114.8, commArea: 32.2, count: 72, unitsPerFloor: 1 },
    ],
  },
  {
    id: "alt-3",
    name: "대안 3 (하이엔드 대형 특화 안)",
    buildingCount: 5,
    maxFloors: 12,
    targetBuildingCoverageRatio: 50,
    targetFloorAreaRatio: 250,
    buildingArea: 2350,
    aboveGroundFloorArea: 24800,
    undergroundFloorArea: 17500,
    communityFacilityArea: 1200,
    plannedParkingCount: 380,
    podiumFloors: 0,
    refugeFloors: 0,
    unitSelectionMode: "layout",
    types: [
      { id: "t3-1", name: "84A", exclArea: 84.9, commArea: 24.5, count: 120, unitsPerFloor: 2 },
      { id: "t3-2", name: "114A", exclArea: 114.8, commArea: 32.2, count: 60, unitsPerFloor: 1 },
      { id: "t3-3", name: "150T", exclArea: 149.5, commArea: 42.1, count: 60, unitsPerFloor: 1 },
    ],
  },
];

export default function App() {
  const [project, setProject] = useState<ProjectInfo>(INITIAL_PROJECT);
  const [alternatives, setAlternatives] = useState<Alternative[]>(INITIAL_ALTERNATIVES);
  const [selectedAltId, setSelectedAltId] = useState<string>("alt-1");
  const [activeLeftTab, setActiveLeftTab] = useState<"details" | "ai_generator">("details");
  const [activeMobileTab, setActiveMobileTab] = useState<"site" | "design" | "ai" | "compare">("site");
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // API Key state with localStorage persistence
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("gemini_user_api_key") || "";
  });
  const [isKeyVisible, setIsKeyVisible] = useState<boolean>(false);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem("gemini_user_api_key", val);
  };

  const handleMobileTabChange = (tab: "site" | "design" | "ai" | "compare") => {
    setActiveMobileTab(tab);
    if (tab === "design") {
      setActiveLeftTab("details");
    } else if (tab === "ai") {
      setActiveLeftTab("ai_generator");
    }
  };

  // 커스텀 알림(Toast) 및 다이얼로그(Confirm) 상태 관리 정의
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    // 3.5초가 지나면 자동으로 닫아줍니다.
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
    });
  };

  // 실무용 세대수 연동 용도별 면적 및 주차/지하층 완결 산출 엔진
  const calculateRealtimeAlternativeMetrics = (updatedTypes: TypeConfig[], baseAlt: Alternative) => {
    const totalUnits = updatedTypes.reduce((sum, type) => sum + type.count, 0);

    // 1. 주거시설 연면적 (지상) = (전용면적 + 공용면적) * 세대수
    const residentialAboveArea = updatedTypes.reduce(
      (sum, type) => sum + (type.exclArea + type.commArea) * type.count,
      0
    );

    // 2. 세대수 비례 주민공동시설(커뮤니티) 면적 자동 연산 (주택건설기준 규정 표준 국토부 기준 반영)
    let communityFacilityArea = 0;
    if (totalUnits > 0) {
      if (totalUnits < 100) {
        communityFacilityArea = 50; // 100세대 미만: 최소 기본 권장선 50㎡
      } else if (totalUnits < 1000) {
        communityFacilityArea = totalUnits * 2.5; // 세대당 2.5㎡
      } else {
        communityFacilityArea = 500 + totalUnits * 2.0; // 1000세대 이상: 500㎡ + 세대당 2.0㎡
      }
    }
    const roundedCommunityArea = Math.round(communityFacilityArea * 10) / 10;

    // 3. 기타 지상 부대복리시설 (가령 경로당, 어린이집, 관리기획실 등 - 세대당 1.5㎡ 비례 배정)
    const welfareFacilityArea = totalUnits > 0 ? Math.round((totalUnits * 1.5) * 10) / 10 : 0;

    // 4. 최종 지상층 연면적 (용적률 산정 대상) = 주거지상면적 + 커뮤니티면적 + 기타부대시설면적
    const aboveGroundFloorArea = Math.round((residentialAboveArea + roundedCommunityArea + welfareFacilityArea) * 100) / 100;

    // 5. 법정 조례상 계획 주차대수 산정
    let parkingByArea = 0;
    let parkingByUnitMin = 0;

    updatedTypes.forEach((type) => {
      const qty = type.count;
      if (qty <= 0) return;
      
      // 면적 기준: 전용 85㎡ 이하 (전용/75㎡당 1대), 85㎡ 초과 (전용/65㎡당 1대)
      if (type.exclArea <= 85) {
        parkingByArea += (type.exclArea * qty) / 75;
      } else {
        parkingByArea += (type.exclArea * qty) / 65;
      }
      
      // 세대수 기준 하한선
      if (type.exclArea <= 60) {
        parkingByUnitMin += qty * 0.7;
      } else if (type.exclArea <= 85) {
        parkingByUnitMin += qty * 1.0;
      } else {
        parkingByUnitMin += qty * 1.3;
      }
    });

    const rawLegalParking = Math.max(parkingByArea, parkingByUnitMin);
    const plannedParkingCount = rawLegalParking > 0 ? Math.ceil(rawLegalParking) : baseAlt.plannedParkingCount;

    // 6. 지하층 연면적 (Underground Floor Area) 연동 산정
    // 대지경계 이격 고려 한 층 굴착한계 면적(실사용 대지면적의 80%)을 구하고, 굳이 2개층을 만들 필요 없는 면적이면 1개층, 넘어가면 자동으로 층수 계산되도록 반영
    const netLotArea = Math.max(0.1, project.lotArea - project.roadArea);
    const maxUndergroundFloorPlate = netLotArea * 0.8;
    const requiredUndergroundArea = (plannedParkingCount * 38) + (totalUnits * 4.5);
    const estimatedUndergroundFloors = maxUndergroundFloorPlate > 0 
      ? Math.max(1, Math.ceil(requiredUndergroundArea / maxUndergroundFloorPlate)) 
      : 1;
    const undergroundFloorArea = Math.round((estimatedUndergroundFloors * maxUndergroundFloorPlate) * 10) / 10;

    return {
      aboveGroundFloorArea,
      communityFacilityArea: roundedCommunityArea,
      plannedParkingCount,
      undergroundFloorArea,
    };
  };

  // 현재 활성화된 대안
  const currentAlternative = alternatives.find((alt) => alt.id === selectedAltId) || alternatives[0];

  // 동/층 호조합 계산 연동 보정 함수
  const syncTypesWithLayout = (types: TypeConfig[], alt: Alternative): TypeConfig[] => {
    const isLayoutMode = alt.unitSelectionMode === "layout" || !alt.unitSelectionMode;
    if (!isLayoutMode) return types;

    const residentialFloors = Math.max(
      0,
      alt.maxFloors - (alt.podiumFloors || 0) - (alt.refugeFloors || 0)
    );
    const multiplier = residentialFloors * alt.buildingCount;

    return types.map((t) => {
      let upf = t.unitsPerFloor;
      if (upf === undefined) {
        // 호조합 지정이 없는 경우 현재 count로부터 역산하여 분배치
        upf = multiplier > 0 ? Math.round((t.count / multiplier) * 100) / 100 : 1;
      }
      return {
        ...t,
        unitsPerFloor: upf,
        count: multiplier > 0 ? Math.round(upf * multiplier) : 0,
      };
    });
  };

  // 단일값 실시간 변경을 통한 해당 대안 상태 반영
  const handleAlternativeChange = (updatedAlt: Alternative) => {
    setAlternatives((prev) =>
      prev.map((alt) => {
        if (alt.id === updatedAlt.id) {
          let newTypes = updatedAlt.types;
          const isLayoutMode = updatedAlt.unitSelectionMode === "layout" || !updatedAlt.unitSelectionMode;
          if (isLayoutMode) {
            newTypes = syncTypesWithLayout(updatedAlt.types, updatedAlt);
          }
          const metrics = calculateRealtimeAlternativeMetrics(newTypes, updatedAlt);
          return {
            ...updatedAlt,
            types: newTypes,
            aboveGroundFloorArea: metrics.aboveGroundFloorArea,
            communityFacilityArea: metrics.communityFacilityArea,
            plannedParkingCount: metrics.plannedParkingCount,
            undergroundFloorArea: metrics.undergroundFloorArea,
          };
        }
        return alt;
      })
    );
  };

  // 타입별 배치표 변경 핸들러
  const handleTypesChange = (updatedTypes: TypeConfig[]) => {
    setAlternatives((prev) =>
      prev.map((alt) => {
        if (alt.id === selectedAltId) {
          let finalTypes = updatedTypes;
          const isLayoutMode = alt.unitSelectionMode === "layout" || !alt.unitSelectionMode;
          if (isLayoutMode) {
            finalTypes = syncTypesWithLayout(updatedTypes, alt);
          }
          const metrics = calculateRealtimeAlternativeMetrics(finalTypes, alt);
          return {
            ...alt,
            types: finalTypes,
            aboveGroundFloorArea: metrics.aboveGroundFloorArea,
            communityFacilityArea: metrics.communityFacilityArea,
            plannedParkingCount: metrics.plannedParkingCount,
            undergroundFloorArea: metrics.undergroundFloorArea,
          };
        }
        return alt;
      })
    );
  };

  // AI 추천 믹스를 이용해 새로운 대안을 추가하는 핸들러
  const handleAddAlternativeWithTypes = (name: string, types: TypeConfig[]) => {
    const newId = `alt-${Date.now()}`;
    const metrics = calculateRealtimeAlternativeMetrics(types, currentAlternative);
    const newAlt: Alternative = {
      id: newId,
      name: name,
      buildingCount: currentAlternative.buildingCount,
      maxFloors: currentAlternative.maxFloors,
      targetBuildingCoverageRatio: currentAlternative.targetBuildingCoverageRatio,
      targetFloorAreaRatio: currentAlternative.targetFloorAreaRatio,
      buildingArea: currentAlternative.buildingArea,
      aboveGroundFloorArea: metrics.aboveGroundFloorArea,
      undergroundFloorArea: metrics.undergroundFloorArea,
      communityFacilityArea: metrics.communityFacilityArea,
      plannedParkingCount: metrics.plannedParkingCount,
      podiumFloors: currentAlternative.podiumFloors,
      refugeFloors: currentAlternative.refugeFloors,
      types: JSON.parse(JSON.stringify(types)),
    };
    setAlternatives((prev) => [...prev, newAlt]);
    setSelectedAltId(newId);
  };

  // AI 자동기획으로 파라미터와 타입을 한 번에 신규 등록하는 핸들러
  const handleAddAlternativeWithTypesAndParams = (name: string, types: TypeConfig[], altParams?: Partial<Alternative>) => {
    const newId = `alt-${Date.now()}`;
    const baseAlt = { ...currentAlternative, ...altParams };
    const metrics = calculateRealtimeAlternativeMetrics(types, baseAlt);
    const newAlt: Alternative = {
      id: newId,
      name: name,
      buildingCount: baseAlt.buildingCount ?? currentAlternative.buildingCount,
      maxFloors: baseAlt.maxFloors ?? currentAlternative.maxFloors,
      targetBuildingCoverageRatio: baseAlt.targetBuildingCoverageRatio ?? currentAlternative.targetBuildingCoverageRatio,
      targetFloorAreaRatio: baseAlt.targetFloorAreaRatio ?? currentAlternative.targetFloorAreaRatio,
      buildingArea: baseAlt.buildingArea ?? currentAlternative.buildingArea,
      aboveGroundFloorArea: metrics.aboveGroundFloorArea,
      undergroundFloorArea: metrics.undergroundFloorArea,
      communityFacilityArea: metrics.communityFacilityArea,
      plannedParkingCount: metrics.plannedParkingCount,
      podiumFloors: baseAlt.podiumFloors ?? currentAlternative.podiumFloors,
      refugeFloors: baseAlt.refugeFloors ?? currentAlternative.refugeFloors,
      types: JSON.parse(JSON.stringify(types)),
    };
    setAlternatives((prev) => [...prev, newAlt]);
    setSelectedAltId(newId);
    triggerToast("✨ 새로운 AI 특화 대안 시나리오가 성공적으로 등록 및 보존되었습니다!", "success");
  };

  // AI 자동기획으로 현재 대안의 설계를 업데이트하는 핸들러
  const handleApplyAlternativeWithParams = (types: TypeConfig[], altParams?: Partial<Alternative>) => {
    const updatedAlt = {
      ...currentAlternative,
      ...altParams,
      types: JSON.parse(JSON.stringify(types)),
    };
    const metrics = calculateRealtimeAlternativeMetrics(types, updatedAlt);
    
    // 자동 계산 값 덮어쓰기
    updatedAlt.aboveGroundFloorArea = metrics.aboveGroundFloorArea;
    updatedAlt.undergroundFloorArea = metrics.undergroundFloorArea;
    updatedAlt.communityFacilityArea = metrics.communityFacilityArea;
    updatedAlt.plannedParkingCount = metrics.plannedParkingCount;

    handleAlternativeChange(updatedAlt);
    triggerToast("✨ 현재 대안의 동수, 최고층수, 건축면적 및 세대 믹스가 AI 기획 수치로 덮어씌워졌습니다!", "success");
  };

  // 신규 대안 시나리오 추가
  const handleAddAlternative = () => {
    const newId = `alt-${Date.now()}`;
    const newAlt: Alternative = {
      id: newId,
      name: `대안 ${alternatives.length + 1} (신규 검토 복제안)`,
      buildingCount: currentAlternative.buildingCount,
      maxFloors: currentAlternative.maxFloors,
      targetBuildingCoverageRatio: currentAlternative.targetBuildingCoverageRatio,
      targetFloorAreaRatio: currentAlternative.targetFloorAreaRatio,
      buildingArea: currentAlternative.buildingArea,
      aboveGroundFloorArea: currentAlternative.aboveGroundFloorArea,
      undergroundFloorArea: currentAlternative.undergroundFloorArea,
      communityFacilityArea: currentAlternative.communityFacilityArea,
      plannedParkingCount: currentAlternative.plannedParkingCount,
      podiumFloors: currentAlternative.podiumFloors,
      refugeFloors: currentAlternative.refugeFloors,
      types: JSON.parse(JSON.stringify(currentAlternative.types)), // 깊은 복사
    };
    setAlternatives((prev) => [...prev, newAlt]);
    setSelectedAltId(newId);
  };

  // 특정 대안 삭제
  const handleDeleteAlternative = (id: string, name: string) => {
    if (alternatives.length <= 1) {
      triggerToast("적어도 한 개의 규모검토 대안이 보존되어야 합니다.", "error");
      return;
    }
    triggerConfirm(
      "규모기획 대안 삭제",
      `진짜 [${name}]을 기획 안 목록에서 삭제하시겠습니까?`,
      () => {
        const filtered = alternatives.filter((alt) => alt.id !== id);
        setAlternatives(filtered);
        if (selectedAltId === id) {
          setSelectedAltId(filtered[0].id);
        }
        triggerToast(`[${name}] 설계 안이 성공적으로 목록에서 완전 삭제되었습니다.`, "success");
      }
    );
  };

  // 종합 리셋 (초기 데이터 재참조)
  const handleResetData = () => {
    triggerConfirm(
      "기획안 일괄 리셋",
      "작성 중이던 모든 데이터가 지워지고 최초 로딩된 3가지 초깃값으로 정형 초기화됩니다. 이 작업을 동의 진행하시겠습니까?",
      () => {
        setProject(INITIAL_PROJECT);
        setAlternatives(INITIAL_ALTERNATIVES);
        setSelectedAltId("alt-1");
        setUploadStatus("");
        triggerToast("모든 기획 및 유형별 시범 데이터가 초깃값으로 강제 리셋되었습니다.", "info");
      }
    );
  };

  // 1) 엑셀 일괄 내보내기/다운로드 (SheetJS 사용)
  const handleDownloadExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // A. 전체 대안별 비교표 시트
      const compRows = convertProjectToCsvRows(project, alternatives);
      const wsComp = XLSX.utils.aoa_to_sheet(compRows);
      XLSX.utils.book_append_sheet(wb, wsComp, "종합 대안 비교표");

      // B. 개별 대안별 상세 세대 분양 계획표 시트 추가
      alternatives.forEach(alt => {
        const altRows = convertAlternativeToGansamRows(project, alt);
        const wsAlt = XLSX.utils.aoa_to_sheet(altRows);
        // 시트이름에 영문/숫자 및 가벼운 이름만 허용하므로 정제
        const sheetName = alt.name.substring(0, 30).replace(/[\\*?:/[\]]/g, "");
        XLSX.utils.book_append_sheet(wb, wsAlt, sheetName);
      });

      // 파일 내보내기 지시
      XLSX.writeFile(wb, `${project.projectName.replace(/\s+/g, "_")}_의사결정_개요표.xlsx`);
    } catch (error) {
      console.error("이중 엑셀 파일 생성 중 오류 발생:", error);
      alert("엑셀 다운로드 중 에러가 발생했습니다.");
    }
  };

  // 2) 엑셀 업로드 / 파싱 (SheetJS 사용)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    setUploadStatus("파일 구조 파싱 중...");

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("파일을 읽을 수 없습니다.");
        
        const workbook = XLSX.read(data, { type: "binary" });
        
        // 엑셀 파싱 기조: 첫 번째 시트를 기준으로 가볍게 파해쳐 봅니다.
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 5) {
          throw new Error("유효한 규모검토 엑셀 개요서 양식이 아닙니다. 데이터 라인이 부족합니다.");
        }

        // 실무자가 업로드한 엑셀에서 특정 키워드를 검색하여 대지면적이나 프로젝트명을 자동으로 리맵핑합니다.
        let parsedProjectName = project.projectName;
        let parsedLocation = project.location;
        let parsedLotArea = project.lotArea;
        let parsedRoadArea = project.roadArea;

        jsonData.forEach(row => {
          if (!row || row.length < 2) return;
          const col0 = String(row[0]).trim();
          const col1 = String(row[1]).trim();

          if (col0.includes("프로젝트명") || col0.includes("사업명")) {
            parsedProjectName = col1;
          } else if (col0.includes("대지위치") || col0.includes("위치")) {
            parsedLocation = col1;
          } else if (col0.includes("대지면적")) {
            parsedLotArea = parseFloat(col1) || parsedLotArea;
          } else if (col0.includes("도로제척")) {
            parsedRoadArea = parseFloat(col1) || parsedRoadArea;
          }
        });

        setProject({
          projectName: parsedProjectName,
          location: parsedLocation,
          zoneType: project.zoneType,
          lotArea: parsedLotArea,
          roadArea: parsedRoadArea
        });

        setUploadStatus("성공적으로 공통 대지조건을 동기화했습니다!");
        setTimeout(() => setUploadStatus(""), 4000);
      } catch (err: any) {
        console.error(err);
        setUploadStatus(`오류: ${err.message || "파일 형식이 유효하지 않습니다."}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  const calculatedMetricsForHeader = calculateAlternativeMetrics(project, currentAlternative);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-slate-900 selection:text-white text-[12px] pb-16 md:pb-0">
      
      {/* 최상단 메인 브랜딩 헤더 바 */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 px-4 py-2.5 shadow-sm border-b border-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1.5 rounded flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white">공동주택 규모검토 시스템</h1>
                <span className="bg-emerald-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase">
                  📱 모바일 지원
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                건축 실무 엑셀의 자유로움과 다면비교 분석을 지원하는 고밀도 시뮬레이터
              </p>
            </div>
          </div>

          {/* 주요 컨트롤 액션 그룹 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetData}
              className="px-2 py-1 md:px-2.5 md:py-1.5 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] md:text-[10.5px] font-semibold rounded flex items-center gap-1 transition-all cursor-pointer"
              title="데이터 초기값 리셋"
            >
              <RefreshCw className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-400" /> <span className="hidden sm:inline">데이터 </span>리셋
            </button>

            {/* 정교한 엑셀 업로더 */}
            <label className="px-2 py-1 md:px-2.5 md:py-1.5 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] md:text-[10.5px] font-semibold rounded flex items-center gap-1 transition-all cursor-pointer bg-slate-900 relative">
              <Upload className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-400" /> <span className="hidden sm:inline">엑셀 </span>로드
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>

            {/* 마스터 엑셀 다운로더 */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-2.5 py-1 md:px-3 md:py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-[10px] md:text-[10.5px] font-semibold rounded flex items-center gap-1 transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-2.5 h-2.5 md:w-3 md:h-3" /> <span className="hidden sm:inline">대안별 </span>엑셀 다운
            </button>
          </div>
        </div>

        {uploadStatus && (
          <div className="max-w-7xl mx-auto mt-2 text-center text-[10.5px] bg-yellow-50 text-yellow-950 py-1 rounded font-semibold flex items-center justify-center gap-1">
            <Info className="w-3 h-3 text-yellow-700" />
            <span>{uploadStatus}</span>
          </div>
        )}
      </header>

      {/* Gemini API Key Configuration Bar */}
      <div className="bg-slate-950 border-b border-slate-900 text-slate-300 py-2 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <div className="text-[11px]">
              <span className="font-extrabold text-white">Gemini API 설정: </span>
              <span className="text-slate-400">AI 보좌관 및 자동 대안 기획을 작동시키려면 API 키를 입력하세요.</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <input
                type={isKeyVisible ? "text" : "password"}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Gemini API Key 입력 (AIzaSy...)"
                className="w-full sm:w-72 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded px-2.5 py-1 text-[11px] font-mono text-white placeholder-slate-500 outline-none pr-8 transition-colors"
              />
              <button
                type="button"
                onClick={() => setIsKeyVisible(!isKeyVisible)}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={isKeyVisible ? "비밀번호 보이기 해제" : "비밀번호 보이기"}
              >
                {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10.5px] font-bold border border-slate-700 transition-all text-center shrink-0 whitespace-nowrap"
            >
              🔑 무료 키 발급
            </a>
            {apiKey && (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 shrink-0 select-none">
                ✓ 브라우저 저장됨
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 종합 현황 핵심 대지 스킵 대시보드 */}
      <div className="bg-slate-800 text-white py-3 px-4 border-b border-slate-900">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-3 divide-y md:divide-y-0 md:divide-x divide-slate-700 text-[11px]">
          <div className="pr-3">
            <p className="text-slate-400 font-bold mb-0.5">🔍 기획 대상 프로젝트</p>
            <p className="text-xs font-bold text-slate-100 truncate">{project.projectName || "미정"}</p>
            <p className="text-[10px] text-slate-400 truncate">{project.location || "위치 정보 없음"}</p>
          </div>
          <div className="pt-2 md:pt-0 md:pl-4">
            <p className="text-slate-400 font-bold mb-0.5">🏡 용도 지역 지침</p>
            <p className="text-xs font-bold text-slate-100">{project.zoneType || "지정되지 않음"}</p>
            <p className="text-[10px] text-slate-400">건폐 상한 {currentAlternative.targetBuildingCoverageRatio}% / 용적 {currentAlternative.targetFloorAreaRatio}%</p>
          </div>
          <div className="pt-2 md:pt-0 md:pl-4">
            <p className="text-slate-400 font-bold mb-0.5">📏 산정 실사용 대지면적</p>
            <p className="text-xs font-bold text-slate-100 font-mono">
              {Math.max(0, project.lotArea - project.roadArea).toLocaleString()} ㎡
            </p>
            <p className="text-[10px] text-slate-400">도로제척: {project.roadArea}㎡ 공제</p>
          </div>
          <div className="pt-2 md:pt-0 md:pl-4 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <div>
                <p className="text-[9px] text-slate-400">세대당 평균 공급면적</p>
                <p className="text-xs font-bold text-yellow-300 font-mono">
                  {calculatedMetricsForHeader.averageSupplyAreaPerUnit.toFixed(1)} ㎡
                  <span className="text-[10px] text-slate-200"> ({(calculatedMetricsForHeader.averageSupplyAreaPerUnit * 0.3025).toFixed(1)}평)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 본문 콘텐츠 아키텍처 대시보드 */}
      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4 font-sans">
        
        {/* 모바일 최적화 상단 탭 인디케이터 바 (사용자 가이드용 피드백) */}
        <div className="md:hidden bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-sm text-center text-slate-300 text-[11px] font-medium">
          현재 모바일 기기 규격으로 정교한 축소 뷰가 적용되었습니다.
          <br />
          하단 탭바 터치 시 각 상세분석 모듈로 즉각 전환됩니다.
        </div>

        {/* 공통 대지 파라미터 입력 폼 */}
        <div className={activeMobileTab === "site" ? "block animate-fadeIn" : "hidden md:block"}>
          <ProjectOverviewForm project={project} onChange={setProject} />
        </div>

        {/* 대안별 시나리오 고속 제어 탭 메커니즘 */}
        <div className={`bg-white border border-slate-200 rounded p-3 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 ${
          activeMobileTab === "design" || activeMobileTab === "ai" || activeMobileTab === "compare" ? "block animate-fadeIn" : "hidden md:block"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-700" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">검토안 선택 (Scenarios):</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1 sm:mt-0">
                {alternatives.map((alt) => {
                  const isSelected = alt.id === selectedAltId;
                  return (
                    <div key={alt.id} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setSelectedAltId(alt.id)}
                        className={`px-2.5 py-1.5 text-[11px] font-bold rounded-l transition-all border ${
                          isSelected
                            ? "bg-slate-800 border-slate-850 text-white"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {alt.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAlternative(alt.id, alt.name)}
                        className={`px-1.5 py-1.5 border-t border-b border-r text-[10px] rounded-r transition-all ${
                          isSelected
                            ? "bg-slate-800 hover:bg-red-700 border-slate-850 text-white"
                            : "bg-slate-50 border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-500"
                        }`}
                        title="이 대안 세트 영구 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddAlternative}
              className="mt-2 sm:mt-0 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded flex items-center justify-center gap-1 transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-3 h-3 text-slate-700" /> 비교용 대안 시나리오 추가
            </button>
          </div>
        </div>

        {/* 메인 2분할 대각선 작업 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* 좌측 2칸: 현재 선택된 대안 명세 및 AI 자동 생성 */}
          <div className={`lg:col-span-2 space-y-4 ${
            activeMobileTab === "design" || activeMobileTab === "ai" ? "block animate-fadeIn" : "hidden md:block"
          }`}>
            
            {/* 세부 기획 및 AI 대안 탭 셀렉터 (데스크톱에서만 렌더링 - 모바일에서는 하단 탭과 자동 동기화됨) */}
            <div className="hidden md:flex bg-slate-100/50 p-1 rounded-lg border border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveLeftTab('details');
                  setActiveMobileTab('design');
                }}
                className={`flex-1 py-2 font-bold text-xs rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeLeftTab === 'details'
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>📋 수동 입력 및 상세설계 분석</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveLeftTab('ai_generator');
                  setActiveMobileTab('ai');
                }}
                className={`flex-1 py-2 font-bold text-xs rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeLeftTab === 'ai_generator'
                    ? "bg-slate-900 text-white shadow-sm border border-slate-950"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                <span>✨ AI 원터치 자동 대안 생성</span>
              </button>
            </div>

            {/* 수동 상세 설계 탭 (모바일: design 탭 / 데스크톱: details 상태) */}
            {activeLeftTab === 'details' ? (
              <div className={`space-y-4 animate-fadeIn ${activeMobileTab === "design" ? "block" : "hidden md:block"}`} id="app-manual-details-section">
                {/* 대안 요약 카드 (기획 및 지침 배치 수치 입력단) */}
                <div className="bg-white rounded border border-slate-200 p-1">
                  <AlternativeDetailsCard
                    project={project}
                    alternative={currentAlternative}
                    onChange={handleAlternativeChange}
                  />
                </div>

                {/* 타입별 구성 설정 스프레드시트 */}
                <TypeDistributionConfig
                  alternative={currentAlternative}
                  onChange={handleTypesChange}
                  onChangeMode={(mode) => handleAlternativeChange({ ...currentAlternative, unitSelectionMode: mode })}
                  onShowNotification={triggerToast}
                />

                {/* 수직 동선 단면 층별 계획 면적표 */}
                <FloorAreaTable
                  project={project}
                  alternative={currentAlternative}
                />

                {/* 용도별 세부 설계면적 분석 및 인허가 기준 검토 총괄표 */}
                <UsageAreaTable
                  project={project}
                  alternative={currentAlternative}
                />
              </div>
            ) : (
              <div className={`animate-fadeIn ${activeMobileTab === "ai" ? "block" : "hidden md:block"}`} id="app-ai_generator-section">
                <AiAlternativeGenerator
                  project={project}
                  currentAlternative={currentAlternative}
                  onApplyAlternative={handleApplyAlternativeWithParams}
                  onAddAlternativeWithTypes={handleAddAlternativeWithTypesAndParams}
                  onShowNotification={triggerToast}
                  apiKey={apiKey}
                />
              </div>
            )}

          </div>

          {/* 우측 1칸: AI 의사결정 비조와 법규 보좌관 패널 (모바일: ai 탭 / 데스크톱: 우측 고정) */}
          <div className={`lg:col-span-1 flex flex-col ${
            activeMobileTab === "ai" ? "block mt-4 lg:mt-0 animate-fadeIn" : "hidden lg:block"
          }`}>
            <div className="sticky top-[100px] space-y-4">
              
              {/* AI 조언기 패널 */}
              <AiAdvisorPanel
                project={project}
                currentAlternative={currentAlternative}
                apiKey={apiKey}
              />

            </div>
          </div>

        </div>

        {/* 전체 대안 의사결정 매트릭스 목록 (하단 가로 정형화 표) (모바일: compare 탭 / 데스크톱: 항상 하단 노출) */}
        <div className={`w-full mt-4 ${
          activeMobileTab === "compare" ? "block animate-fadeIn" : "hidden md:block"
        }`} id="comparison-matrix-wrapper">
          <ComparisonMatrix
            project={project}
            alternatives={alternatives}
            onSelectAlternative={setSelectedAltId}
            selectedId={selectedAltId}
          />
        </div>

      </main>

      {/* 모바일 전용 하단 고정 터치 네비게이션 탭 바 (Touch-target 최소 44px 이상 확보) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-950 px-2 py-1.5 z-50 flex justify-around shadow-[0_-5px_15px_rgba(0,0,0,0.2)]">
        {[
          { id: "site", label: "대지정보", icon: Landmark },
          { id: "design", label: "상세설계", icon: Layers },
          { id: "ai", label: "AI 조언·기획", icon: Sparkles },
          { id: "compare", label: "대안비교", icon: LayoutDashboard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMobileTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleMobileTabChange(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-lg transition-all min-h-[44px] cursor-pointer ${
                isActive ? "text-blue-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 mb-1 ${isActive ? "text-blue-400 scale-110" : "text-slate-400"}`} />
              <span className="text-[9px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 푸터 영역 */}
      <footer className="bg-slate-900 border-t border-slate-950 text-slate-400 mt-12 py-5 px-4 text-center text-[11px]">
        <div className="max-w-7xl mx-auto space-y-1">
          <p className="font-bold text-slate-200">공동주택 규모검토 웹 업무 통합 Workspace (Feasibility Study Dashboard)</p>
          <p>
            건축설계 현업의 엑셀 데이터 분석 흐름과 한계 규제식을 완벽 지원하는 가오 검증 솔루션입니다.
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            © 2026 Housing Feasibility Study Space. Powered by Google AI Studio Gemini Engine.
          </p>
        </div>
      </footer>

      {/* 커스텀 알림(Toast) 컴포넌트 */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full bg-slate-900 border border-slate-850 text-white rounded-lg p-3.5 shadow-xl flex items-start gap-2.5 transition-all outline outline-slate-800 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="mt-0.5 rounded-full p-1 bg-slate-800">
            {toast.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            {toast.type === "error" && (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            {toast.type === "info" && (
              <Info className="w-4 h-4 text-blue-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-medium leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white transition-colors text-[10px] font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 커스텀 컨펌 다이얼로그(Confirm Modal) 컴포넌트 */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded shadow-2xl max-w-md w-full overflow-hidden text-[12px] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-3.5 text-white flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                {confirmDialog.title}
              </span>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="text-slate-400 hover:text-white text-[12px] font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2.5 text-slate-700">
              <p className="leading-relaxed font-semibold text-slate-900 text-[12px]">{confirmDialog.message}</p>
              <div className="bg-slate-50 p-2 border border-slate-100 rounded text-[10.5px] text-slate-500 font-mono">
                ※ 이 작업은 즉시 메모리 및 동기상에 반영되며 복구할 수 없습니다.
              </div>
            </div>
            <div className="bg-slate-50 p-3 flex justify-end gap-1.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded font-semibold transition-colors cursor-pointer text-[11px]"
              >
                취소 (Cancel)
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors cursor-pointer text-[11px]"
              >
                확인 및 실행
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
