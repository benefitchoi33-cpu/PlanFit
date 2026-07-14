/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TypeConfig {
  id: string;
  name: string;      // 예: "59A", "84A", "114"
  exclArea: number;  // 전용면적 (㎡)
  commArea: number;  // 주거공용면적 (㎡) (계단, 복도 등)
  count: number;     // 세대수
  unitsPerFloor?: number; // 층당 호 조합 개수 (건물 1개동 1개층의 라인 수)
}

export interface ProjectInfo {
  projectName: string;
  location: string;
  zoneType: string;
  lotArea: number;   // 대지면적 (㎡)
  roadArea: number;  // 도로제척면적 (㎡)
}

export interface Alternative {
  id: string;
  name: string;        // 예: "대안 1 (안1)", "대안 2 (안2)"
  buildingCount: number; // 동수
  maxFloors: number;     // 최고 층수
  
  // 제한 규정
  targetBuildingCoverageRatio: number; // 건폐율 법정 제한 (%)
  targetFloorAreaRatio: number;        // 용적률 법정 제한 (%)
  
  // 지상/지하 계획
  buildingArea: number;                // 건축면적 (㎡) -> 건폐율과 연계
  aboveGroundFloorArea: number;        // 지상 연면적 (㎡) -> 용적률 용 산정용
  undergroundFloorArea: number;        // 지하 연면적 (㎡)
  
  // 부대복리시설 & 기타
  communityFacilityArea: number;       // 주민공동시설 면적 (㎡)
  plannedParkingCount: number;         // 계획 주차대수 (대)
  
  // 구조 및 특수층 계획 (추가)
  podiumFloors?: number;               // 지상 포디움(Podium) 층수
  refugeFloors?: number;               // 피난안전구역/피난층 수

  // 타입별 세대 구성
  types: TypeConfig[];
  unitSelectionMode?: "layout" | "manual"; // 세대 산정 방식 (호조합 연동 또는 수동 입력)
}

export interface CombinedCalculationResult {
  netLotArea: number;                            // 실사용 대지면적 (㎡)
  calculatedBuildingCoverageRatioValue: number;  // 실제 건폐율 (%)
  calculatedFloorAreaRatioValue: number;         // 실제 용적률 (%)
  
  totalGenerationCount: number;                  // 총 세대수
  totalExclAreaSum: number;                      // 전용면적 합계 (㎡)
  totalCommAreaSum: number;                      // 주거공용면적 합계 (㎡)
  totalSupplyAreaSum: number;                    // 공급면적 합계 (㎡)
  averageSupplyAreaPerUnit: number;              // 세대당 평균 공급면적 (㎡)
  
  // 주차대수 산정
  legalParkingCount: number;                     // 법정 주차대수 (대)
  parkingDeficitOrSurplus: number;               // 계획대수 - 법정대수 차이
  parkingPerUnit: number;                        // 세대당 주차대수 (대)
  
  // 사업성/지상 비율 분석
  floorAreaRatioBuffer: number;                  // 용적률 마진 (%p)
  buildingCoverageRatioBuffer: number;           // 건폐율 마진 (%p)
  isCoverageOver: boolean;                       // 건폐율 초과 여부
  isRatioOver: boolean;                          // 용적률 초과 여부
}
