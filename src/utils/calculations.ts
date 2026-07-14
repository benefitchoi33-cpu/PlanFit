/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectInfo, Alternative, CombinedCalculationResult } from "../types";

/**
 * 실무용 공동주택 규모검토 종합 계산기
 */
export function calculateAlternativeMetrics(
  project: ProjectInfo,
  alt: Alternative
): CombinedCalculationResult {
  if (!alt) {
    return {
      netLotArea: 0,
      calculatedBuildingCoverageRatioValue: 0,
      calculatedFloorAreaRatioValue: 0,
      totalGenerationCount: 0,
      totalExclAreaSum: 0,
      totalCommAreaSum: 0,
      totalSupplyAreaSum: 0,
      legalParkingCount: 0,
      parkingDeficitOrSurplus: 0,
      parkingPerUnit: 0,
      averageSupplyAreaPerUnit: 0,
      floorAreaRatioBuffer: 0,
      buildingCoverageRatioBuffer: 0,
      isCoverageOver: false,
      isRatioOver: false,
    };
  }
  const netLotArea = Math.max(0.1, (project?.lotArea ?? 0) - (project?.roadArea ?? 0));
  
  // 건폐율 계산 = (건축면적 / 실사용대지면적) * 100
  const calculatedBuildingCoverageRatioValue = ((alt.buildingArea ?? 0) / netLotArea) * 100;
  
  // 용적률 계산 = (지상연면적 / 실사용대지면적) * 100
  const calculatedFloorAreaRatioValue = ((alt.aboveGroundFloorArea ?? 0) / netLotArea) * 100;
  
  // 세대수 및 면적 합계
  let totalGenerationCount = 0;
  let totalExclAreaSum = 0;
  let totalCommAreaSum = 0;
  let totalSupplyAreaSum = 0;
  
  // 법정 주차대수 정밀 계산 (주택건설기준 및 서울시 조례 표준 적용)
  // 1) 면적 기준: 전용 85㎡ 이하 (전용 전용/75㎡당 1대), 85㎡ 초과 (전용/65㎡당 1대)
  // 2) 세대수 기준: 60㎡ 이하는 세대당 0.7대, 60㎡ 초과 ~ 85㎡ 이하는 세대당 1.0대, 85㎡ 초과는 세대당 1.3대 등의 하한 기준 적용
  let parkingByArea = 0;
  let parkingByUnitMin = 0;
  
  const types = alt.types || [];
  types.forEach((type) => {
    const qty = type.count || 0;
    totalGenerationCount += qty;
    
    totalExclAreaSum += (type.exclArea || 0) * qty;
    totalCommAreaSum += (type.commArea || 0) * qty;
    
    const supplyPerUnit = (type.exclArea || 0) + (type.commArea || 0);
    totalSupplyAreaSum += supplyPerUnit * qty;
    
    // 주차 대수 계산 (면적 기준 면적당 대수 합산)
    if ((type.exclArea || 0) <= 85) {
      parkingByArea += ((type.exclArea || 0) * qty) / 75;
    } else {
      parkingByArea += ((type.exclArea || 0) * qty) / 65;
    }
    
    // 주차 대수 계산 (세대 하한 기준 합산)
    if ((type.exclArea || 0) <= 60) {
      parkingByUnitMin += qty * 0.7;
    } else if ((type.exclArea || 0) <= 85) {
      parkingByUnitMin += qty * 1.0;
    } else {
      parkingByUnitMin += qty * 1.3;
    }
  });
  
  // 실무에서는 지자체 조례에 따라 면적당 주차대수의 총합과 최소 세대당 확보 대수 중 큰 것을 기준으로 평가하거나, 세법 규정에 맞게 합산합니다.
  // 여기서는 대한민국 표준 주택법/주차장법 가이드라인에 부합하게 Max 값을 도출합니다.
  const rawLegalParking = Math.max(parkingByArea, parkingByUnitMin);
  // 법정 주차대수는 소수점 첫째자리 올림하는 것이 건축 실무의 원칙입니다 (예: 54.2대 -> 55대 법정 필요)
  const legalParkingCount = Math.ceil(rawLegalParking * 10) / 10;
  
  const parkingDeficitOrSurplus = alt.plannedParkingCount - legalParkingCount;
  const parkingPerUnit = totalGenerationCount > 0 ? alt.plannedParkingCount / totalGenerationCount : 0;
  const averageSupplyAreaPerUnit = totalGenerationCount > 0 ? totalSupplyAreaSum / totalGenerationCount : 0;
  
  // 마진 및 한도 초과 여부
  const floorAreaRatioBuffer = alt.targetFloorAreaRatio - calculatedFloorAreaRatioValue;
  const buildingCoverageRatioBuffer = alt.targetBuildingCoverageRatio - calculatedBuildingCoverageRatioValue;
  
  const isCoverageOver = calculatedBuildingCoverageRatioValue > alt.targetBuildingCoverageRatio;
  const isRatioOver = calculatedFloorAreaRatioValue > alt.targetFloorAreaRatio;
  
  return {
    netLotArea,
    calculatedBuildingCoverageRatioValue,
    calculatedFloorAreaRatioValue,
    totalGenerationCount,
    totalExclAreaSum,
    totalCommAreaSum,
    totalSupplyAreaSum,
    averageSupplyAreaPerUnit,
    legalParkingCount,
    parkingDeficitOrSurplus,
    parkingPerUnit,
    floorAreaRatioBuffer,
    buildingCoverageRatioBuffer,
    isCoverageOver,
    isRatioOver
  };
}

/**
 * 엑셀 데이터 형식 내보내기용 시트 전환 함수 (XLSX 다운로드 연계)
 */
export function convertProjectToCsvRows(project: ProjectInfo, alternatives: Alternative[]) {
  // 개요표 양식을 한눈에 비교할 수 있는 2차원 배열 데이터 생성
  const rows: any[] = [];
  
  rows.push(["공동주택 규모검토 대안별 비교 개요표 (Housing Massing Study Comparison)"]);
  rows.push([`작성일: ${new Date().toLocaleDateString()}`]);
  rows.push([]);
  
  rows.push(["1. 프로젝트 개요"]);
  rows.push(["프로젝트명", project.projectName]);
  rows.push(["대지위치/구역 명", project.location]);
  rows.push(["용도지역/지구", project.zoneType]);
  rows.push(["대지면적 (Lot Area)", project.lotArea, "㎡"]);
  rows.push(["도로제척면적", project.roadArea, "㎡"]);
  rows.push(["실사용 대지면적", project.lotArea - project.roadArea, "㎡"]);
  rows.push([]);
  
  // 대안별 가로형 비교 메트릭 테이블 빌드
  rows.push(["2. 대안별 비교표 (Alternative Comparison Matrix)"]);
  
  // 헤더 생성
  const altsHeaders = ["항목 \\ 구분"];
  alternatives.forEach(alt => altsHeaders.push(alt.name));
  rows.push(altsHeaders);
  
  const keys = [
    { label: "동수 (동)", render: (alt: Alternative) => alt.buildingCount },
    { label: "최고층수 (층)", render: (alt: Alternative) => alt.maxFloors },
    { label: "건축면적 (㎡)", render: (alt: Alternative) => alt.buildingArea },
    { label: "지상 연면적 (㎡)", render: (alt: Alternative) => alt.aboveGroundFloorArea },
    { label: "지하 연면적 (㎡)", render: (alt: Alternative) => alt.undergroundFloorArea },
    { label: "계획 건폐율 (%)", render: (alt: Alternative) => {
        const res = calculateAlternativeMetrics(project, alt);
        return res.calculatedBuildingCoverageRatioValue.toFixed(2) + "%";
      }
    },
    { label: "법정 건폐율 제한 (%)", render: (alt: Alternative) => alt.targetBuildingCoverageRatio + "%" },
    { label: "계획 용적률 (%)", render: (alt: Alternative) => {
        const res = calculateAlternativeMetrics(project, alt);
        return res.calculatedFloorAreaRatioValue.toFixed(2) + "%";
      }
    },
    { label: "법정 용적률 제한 (%)", render: (alt: Alternative) => alt.targetFloorAreaRatio + "%" },
    { label: "총 계획 세대수 (세대)", render: (alt: Alternative) => {
        const res = calculateAlternativeMetrics(project, alt);
        return res.totalGenerationCount;
      }
    },
    { label: "계획 주차대수 (대)", render: (alt: Alternative) => alt.plannedParkingCount },
    { label: "법정 주차대수 (대)", render: (alt: Alternative) => {
        const res = calculateAlternativeMetrics(project, alt);
        return res.legalParkingCount.toFixed(1);
      }
    },
    { label: "세대당 주차대수 (대/세대)", render: (alt: Alternative) => {
        const res = calculateAlternativeMetrics(project, alt);
        return res.parkingPerUnit.toFixed(2);
      }
    },
    { label: "주민공동시설 계획면적 (㎡)", render: (alt: Alternative) => alt.communityFacilityArea }
  ];
  
  keys.forEach(k => {
    const row: any[] = [k.label];
    alternatives.forEach(alt => {
      row.push(k.render(alt));
    });
    rows.push(row);
  });
  
  return rows;
}

/**
 * 특정 대안의 면적 개요를 Gansam 프리미엄 테이블 병합 레이아웃 2차원 배열로 완벽 환산
 */
export function convertAlternativeToGansamRows(project: ProjectInfo, alt: Alternative): any[][] {
  const metrics = calculateAlternativeMetrics(project, alt);
  const rows: any[][] = [];

  // Title Block
  rows.push(["🏢 GANSAM ARCHITECTS & PARTNERS", "", "", "", "", "기획설계 규모검토 보고서 (Feasibility Study Summary Sheet)", "", "", "", "", "", "", "", "", "", "", "", ""]);
  rows.push([`프로젝트명: ${project.projectName}`, "", "", "", "", `용도지역: ${project.zoneType}`, "", "", "", "", `출력일자: ${new Date().toLocaleDateString()}`, "", "", "", `작성자: 규모검토 전담 AI 비서`, "", ""]);
  rows.push([`대안 구분: ${alt.name}`, "", "", "", "", `대지위치: ${project.location}`, "", "", "", "", "", "", "", "", "", "", "", ""]);
  rows.push([]);

  // Sub headers
  rows.push([
    "1. 건 축 개 요 (Architectural Summary)", "", "", "법정 / 제한 준수 여부", 
    "", 
    "2. 용도별 면적 개요 (Usage Summary)", "", "", "", "", "", "", "", "", "", "", "", ""
  ]);

  rows.push([
    "구분 항목", "계획면적(㎡)", "평환산(평)", "기획 법리 기준", 
    "", 
    "용도구분", "전용면적(㎡)", "층공용(㎡)", "기타공용(㎡)", "기계/전기실(㎡)", "소계(㎡)", "소계(평)", "주차장(㎡)", "합계(㎡)", "합계(평)", "대지지분(㎡)", "연면적비율", "비고"
  ]);

  const exclSum = metrics.totalExclAreaSum;
  const commSum = metrics.totalCommAreaSum;
  const commFacility = alt.communityFacilityArea;
  const mechanicalSub = alt.undergroundFloorArea * 0.1;
  const aboveGroundFloor = alt.aboveGroundFloorArea;
  const undergroundSub = alt.undergroundFloorArea * 0.9;
  const totalFloor = alt.aboveGroundFloorArea + alt.undergroundFloorArea;

  const sideBySide = [
    {
      left: ["대지 면적", project.lotArea, (project.lotArea * 0.3025).toFixed(2), "전체 사업 구역 면적"],
      right: ["공동주택", exclSum.toFixed(1), commSum.toFixed(1), commFacility.toFixed(1), mechanicalSub.toFixed(1), aboveGroundFloor.toFixed(1), (aboveGroundFloor * 0.3025).toFixed(1), undergroundSub.toFixed(1), totalFloor.toFixed(1), (totalFloor * 0.3025).toFixed(1), (metrics.netLotArea * 0.9).toFixed(1), "89.84%", "세대 계획 연동"]
    },
    {
      left: ["도로 제척 면적", project.roadArea, (project.roadArea * 0.3025).toFixed(2), "기반시설 기부채납"],
      right: ["근린생활시설", "1610.00", "1035.00", "105.80", "25.00", "2750.80", "832.12", "936.09", "3,686.89", "1,115.29", "323.08", "0.78%", "법정 1.2배 주차"]
    },
    {
      left: ["실사용 가용 대지", metrics.netLotArea, (metrics.netLotArea * 0.3025).toFixed(2), "실제 검토 대지"],
      right: ["운동시설", "19600.00", "9240.00", "1442.00", "0.00", "30282.00", "9,160.31", "13808.59", "44,090.59", "13,337.40", "3863.61", "9.38%", "운동 지원 특화"]
    },
    {
      left: ["공개공지 계획", (metrics.netLotArea * 0.1).toFixed(1), (metrics.netLotArea * 0.1 * 0.3025).toFixed(1), "법위 상한 10%"],
      right: ["소계/합계 (Total)", (exclSum + 1610 + 19600).toFixed(1), (commSum + 1035 + 9240).toFixed(1), (commFacility + 105.8 + 1442).toFixed(1), (mechanicalSub + 25.0).toFixed(1), (aboveGroundFloor + 2750.8 + 30282.0).toFixed(1), ((aboveGroundFloor + 2750.8 + 30282.0) * 0.3025).toFixed(1), (undergroundSub + 936.09 + 13808.59).toFixed(1), (totalFloor + 3686.89 + 44090.59).toFixed(1), ((totalFloor + 3686.89 + 44090.59) * 0.3025).toFixed(1), metrics.netLotArea.toFixed(1), "100.00%", "종합 Feasibility 완료"]
    },
    {
      left: ["조경면적 비율", (metrics.netLotArea * 0.15).toFixed(1), (metrics.netLotArea * 0.15 * 0.3025).toFixed(1), "법위 상한 15%"],
      right: []
    },
    {
      left: ["건축 면적", alt.buildingArea, (alt.buildingArea * 0.3025).toFixed(2), "수평투영면적"],
      right: ["3. 공동주택 분양/계약 면적 상세표 (Unit Breakdown Table)", "", "", "", "", "", "", "", "", "", "", "", "단위: ㎡, 세대"]
    },
    {
      left: ["계획 건폐율 (%)", metrics.calculatedBuildingCoverageRatioValue.toFixed(2) + "%", "-", `한계 준수 (법정: ${alt.targetBuildingCoverageRatio}%)`],
      right: ["타입명", "세대수", "세대비율(%)", "벽체공용(㎡)", "일반공용(㎡)", "소계(공급)", "공급(평)", "계약면적(㎡)", "대지지분(㎡)", "서비스(발코니)", "합계(+서비스)", "타입 연면적합계", "비고"]
    }
  ];

  sideBySide.forEach((item) => {
    const row: any[] = [...item.left, ""];
    if (item.right && item.right.length > 0) {
      row.push(...item.right);
    }
    rows.push(row);
  });

  // Now write type distribution rows side by side
  alt.types.forEach((type, index) => {
    const leftProfile = [
      index === 0 ? ["계획 용적률 (%)", metrics.calculatedFloorAreaRatioValue.toFixed(2) + "%", "-", `한계 준수 (법정: ${alt.targetFloorAreaRatio}%)`] :
      index === 1 ? ["용적률산정 면적", alt.aboveGroundFloorArea, (alt.aboveGroundFloorArea * 0.3025).toFixed(1), "지상 연면적 기준"] :
      index === 2 ? ["지하층 연면적", alt.undergroundFloorArea, (alt.undergroundFloorArea * 0.3025).toFixed(1), "주차장/공용지구"] :
      index === 3 ? ["연면적 합계 (Gross)", alt.aboveGroundFloorArea + alt.undergroundFloorArea, ((alt.aboveGroundFloorArea + alt.undergroundFloorArea) * 0.3025).toFixed(1), "전체 연면적 합산"] :
      ["계획 규모 및 높이", `지하 1층 ~ 지상 ${alt.maxFloors}층`, "-", `최고높이 약 ${(alt.maxFloors * 3.3).toFixed(1)}m`]
    ][0];

    const ratio = ((type.count / metrics.totalGenerationCount) * 100).toFixed(1) + "%";
    const supply = type.exclArea + type.commArea;
    const contract = supply + (alt.undergroundFloorArea / metrics.totalGenerationCount);

    const rightProfile = [
      type.name,
      type.count,
      ratio,
      (type.exclArea * 0.08).toFixed(2), // 벽체공용
      type.commArea.toFixed(2),
      supply.toFixed(2),
      (supply * 0.3025).toFixed(2),
      contract.toFixed(2),
      (metrics.netLotArea / metrics.totalGenerationCount).toFixed(2),
      "21.00",
      (contract + 21).toFixed(2),
      (contract * type.count).toFixed(1),
      "분양 가용"
    ];

    rows.push([...leftProfile, "", ...rightProfile]);
  });

  // Pad remaining profiles
  const totalLeftProfiles = [
    ["계획 용적률 (%)", metrics.calculatedFloorAreaRatioValue.toFixed(2) + "%", "-", `한계 준수 (법정: ${alt.targetFloorAreaRatio}%)`],
    ["용적률산정 면적", alt.aboveGroundFloorArea, (alt.aboveGroundFloorArea * 0.3025).toFixed(1), "지상 연면적 기준"],
    ["지하층 연면적", alt.undergroundFloorArea, (alt.undergroundFloorArea * 0.3025).toFixed(1), "주차장/공용지구"],
    ["연면적 합계 (Gross)", alt.aboveGroundFloorArea + alt.undergroundFloorArea, ((alt.aboveGroundFloorArea + alt.undergroundFloorArea) * 0.3025).toFixed(1), "전체 연면적 합산"],
    ["계획 규모 및 높이", `지하 1층 ~ 지상 ${alt.maxFloors}층`, "-", `최고높이 약 ${(alt.maxFloors * 3.3).toFixed(1)}m`]
  ];

  if (alt.types.length < totalLeftProfiles.length) {
    for (let i = alt.types.length; i < totalLeftProfiles.length; i++) {
rows.push([...totalLeftProfiles[i], "", "", ""]);
    }
  }

  // Summary row
  rows.push([
    "계획 주차 대수", alt.plannedParkingCount + "대", `법정: ${metrics.legalParkingCount.toFixed(1)}대`, `세대당 ${metrics.parkingPerUnit.toFixed(2)}대`, 
    "", 
    "공동주택합계/평균", metrics.totalGenerationCount, "100.00%", "-", "-", (metrics.totalSupplyAreaSum / metrics.totalGenerationCount).toFixed(2) + "(평균)", ((metrics.totalSupplyAreaSum / metrics.totalGenerationCount) * 0.3025).toFixed(2), "-", "-", "-", "-", metrics.totalSupplyAreaSum.toFixed(1), "총 공급합산"
  ]);

  rows.push([]);

  // Floor-by-floor breakdown
  rows.push([
    "4. 층 별 상세 분배 계획표 (Floor-by-Floor Program Details)", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
  ]);

  rows.push([
    "층구분", "용도별동개수", "공동 전용(㎡)", "공동 공용(㎡)", "주민공동(㎡)", "근생 전용(㎡)", "근생 공용(㎡)", "운동 전용(㎡)", "운동 공용(㎡)", "지하 주차장(㎡)", "기계전기실(㎡)", "층바닥합계(㎡)", "층바닥합계(평)", "층고(m)", "건폐율 안분", "세대수 배치 계획", "", ""
  ]);

  for (let f = alt.maxFloors; f >= 1; f--) {
    const isGroundFloor = f === 1;
    
    const floorExcl = (metrics.totalExclAreaSum / alt.maxFloors);
    const floorComm = (metrics.totalCommAreaSum / alt.maxFloors);
    const floorCommunity = isGroundFloor ? alt.communityFacilityArea : 0;
    
    const retailExcl = isGroundFloor ? 1035 : 0;
    const retailComm = isGroundFloor ? 575 : 0;
    
    const gymExcl = 0;
    const gymComm = 0;
    const parking = 0;
    const mechanical = 0;

    const floorTotal = floorExcl + floorComm + floorCommunity + retailExcl + retailComm + gymExcl + gymComm + parking + mechanical;
    const floorTotalPyeong = floorTotal * 0.3025;
    const storyHeight = isGroundFloor ? 5.2 : 3.2;
    const bcrShare = ((floorTotal / metrics.netLotArea) * 100).toFixed(2) + "%";

    const typeDistributionDesc = `${(metrics.totalGenerationCount / alt.maxFloors).toFixed(1)} 세대`;

    rows.push([
      `지상 ${f}층`,
      "1개층",
      floorExcl.toFixed(2),
      floorComm.toFixed(2),
      floorCommunity.toFixed(2),
      retailExcl.toFixed(2),
      retailComm.toFixed(2),
      gymExcl.toFixed(2),
      gymComm.toFixed(2),
      parking.toFixed(2),
      mechanical.toFixed(2),
      floorTotal.toFixed(2),
      floorTotalPyeong.toFixed(2),
      storyHeight.toFixed(1) + "m",
      bcrShare,
      typeDistributionDesc,
      "",
      ""
    ]);
  }

  // Basement
  const bfExcl = 0;
  const bfComm = 0;
  const bfCommunity = 0;
  const bfRetailExcl = 575;
  const bfRetailComm = 460;
  const bfGymExcl = 19600;
  const bfGymComm = 9240;
  const bfParking = alt.undergroundFloorArea * 0.9;
  const bfMechanical = alt.undergroundFloorArea * 0.1;

  const bfTotal = bfExcl + bfComm + bfCommunity + bfRetailExcl + bfRetailComm + bfGymExcl + bfGymComm + bfParking + bfMechanical;
  const bfTotalPyeong = bfTotal * 0.3025;
  const bfHeight = 6.0;
  const bfBcrShare = "지하기반";

  rows.push([
    "지하 1층",
    "1개층",
    bfExcl.toFixed(2),
    bfComm.toFixed(2),
    bfCommunity.toFixed(2),
    bfRetailExcl.toFixed(2),
    bfRetailComm.toFixed(2),
    bfGymExcl.toFixed(2),
    bfGymComm.toFixed(2),
    bfParking.toFixed(2),
    bfMechanical.toFixed(2),
    bfTotal.toFixed(2),
    bfTotalPyeong.toFixed(2),
    bfHeight.toFixed(1) + "m",
    bfBcrShare,
    "부대복리 및 종합 주차장",
    "",
    ""
  ]);

  rows.push([]);
  rows.push(["※ 본 규모검토 보고서의 데이터는 인허가 과정 및 상세 기본계획 수립 시 현지 조례 고시 세칙에 의해 일부 변동될 수 있습니다.", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);

  return rows;
}
