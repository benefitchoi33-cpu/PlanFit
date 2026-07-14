/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ProjectInfo, Alternative } from "../types";
import { Sparkles, Send, Loader2, BookOpen, AlertCircle, HelpCircle } from "lucide-react";
import { calculateAlternativeMetrics } from "../utils/calculations";

interface AiAdvisorPanelProps {
  project: ProjectInfo;
  currentAlternative: Alternative;
  apiKey?: string;
}

const RECOMMEND_QUESTIONS = [
  "현재 대안의 법적 건폐율/용적률 한계치 대비 실현 가능성 및 개선점을 피드백해줘.",
  "세대별 타입 배치 구성과 법정 주차대수 규정(주택설기준)을 충족하는지 종합 검토해줘.",
  "부대복리시설(주민공동시설) 가이드라인(세대수 연동 기준) 및 설계 조언을 전해줘.",
];

export const AiAdvisorPanel: React.FC<AiAdvisorPanelProps> = ({
  project,
  currentAlternative,
  apiKey,
}) => {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: `반갑습니다! 건축설계실무 규모검토 전담 AI 건축사 비서입니다. 
선택된 대안 **[${currentAlternative.name}]**의 건축개요와 세대 배치 계획을 기반으로 대한민국 건축법/주택법 상한과 타당성 피드백을 실시간 분석해 드릴 수 있습니다.

아래 추천 질문 버튼을 클릭하거나, 직접 궁금한 법규 제약 사항에 관해 물어보세요!`,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    // 사용자 메시지 추가
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInputText("");
    setIsLoading(true);
    setErrorText("");

    try {
      const metrics = calculateAlternativeMetrics(project, currentAlternative);
      const enrichedAlternative = {
        ...currentAlternative,
        ...metrics,
      };

      const response = await fetch("/api/gemini/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-gemini-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          projectData: project,
          currentAlternative: enrichedAlternative,
          userMessage: text,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("GitHub Pages 등 정적 호스팅 환경에서는 백엔드 Node.js 서버(server.ts)가 동작하지 않으므로 실시간 Gemini AI 기능을 실행할 수 없습니다. AI 자문기능을 사용하려면 미리보기용 Cloud Run 링크를 사용하시거나, 로컬 환경에서 실행해 주세요.");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `서버 응답 오류 (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages((prev) => [...prev, { sender: "ai", text: data.text || "죄송합니다, 피드백을 제공할 수 없습니다." }]);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "AI 검토 중 에러가 발생했습니다.");
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: `⚠️ 죄송합니다. 규모검토 피드백 도중 오류가 발생했습니다. 개발 서버 환경의 GEMINI_API_KEY 등록 및 유효성 상태를 다시 확인해 주십시오.\n\n(상세 에러 내용: ${err.message || err})` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-4 text-[12px] flex flex-col h-full min-h-[480px]" id="ai-advisor-panel">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <div className="flex items-center gap-1.5 text-slate-800">
          <div className="bg-slate-800 text-white p-1 rounded">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-xs tracking-tight">AI 법규 및 규모검토 보좌관 (Gemini 2.5)</h3>
            <p className="text-[10px] text-slate-400">대한민국 주택법·주차장법 연동 실시간 실무 피드백</p>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[300px] mb-3 p-2 bg-slate-50/50 rounded border border-slate-150 text-[11px] scrollbar-thin">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col max-w-[85%] ${
              m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
            }`}
          >
            <span className="text-[9px] text-slate-400 font-bold mb-0.5">
              {m.sender === "user" ? "설계 설계팀" : "AI 건축사 어드바이저"}
            </span>
            <div
              className={`p-2.5 rounded whitespace-pre-line leading-relaxed ${
                m.sender === "user"
                  ? "bg-slate-800 text-white font-medium"
                  : "bg-white border border-slate-250 text-slate-800 font-medium shadow-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-1.5 mr-auto bg-white border border-slate-250 text-slate-500 rounded p-2 shadow-sm text-[10px]">
            <Loader2 className="w-3 h-3 animate-spin text-blue-700" />
            <span>본 대안의 배치타입 및 한계규제를 바탕으로 타당성 분석 중입니다...</span>
          </div>
        )}
        {errorText && (
          <div className="bg-red-50 text-red-700 p-2 rounded flex items-center gap-1 text-[10.5px] border border-red-100">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorText}</span>
          </div>
        )}
      </div>

      {/* 실무 퀵 추천 안내 질문 */}
      <div className="space-y-1 mb-3">
        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5 uppercase tracking-wide">
          <BookOpen className="w-3 h-3 text-blue-700" /> 빠른 실무 질의 추천
        </p>
        <div className="flex flex-col gap-1">
          {RECOMMEND_QUESTIONS.map((q, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(q)}
              className="text-left py-1 px-1.5 bg-slate-100 hover:bg-slate-200 disabled:hover:bg-slate-100 text-[10px] rounded border border-slate-200/60 transition-colors text-slate-700 truncate font-semibold"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 입력 박스 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex gap-2 border-t border-slate-100 pt-2.5"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="AI에게 용적률 완화 가이드라인이나, 주차 조례 충족 여부를 물어보세요..."
          className="flex-1 px-2.5 py-1.5 border border-slate-250 rounded text-xs outline-none bg-slate-50 focus:bg-white focus:border-blue-600 font-medium"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="bg-blue-700 hover:bg-blue-800 text-white px-3.5 rounded flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
