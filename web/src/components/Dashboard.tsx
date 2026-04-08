'use client';

import { useState } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from './ControlPanel';
import VendingMachineView from './VendingMachineView';
import FinancialPanel from './FinancialPanel';
import AgentLog from './AgentLog';
import MarketStatus from './MarketStatus';
import EmailPanel from './EmailPanel';
import EmailViewer from './EmailViewer';
import SettingsPanel from './SettingsPanel';

export default function Dashboard() {
  const {
    state,
    currentLog,
    allLogs,
    isLoading,
    error,
    finished,
    finishReason,
    models,
    modelsLoading,
    selectedModel,
    setSelectedModel,
    agentPrompt,
    setAgentPrompt,
    startSimulation,
    nextTurn,
    skipTurns,
    reset,
  } = useSimulation();

  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const selectedEmail = state?.emails.find(e => e.id === selectedEmailId) || null;

  const handleReset = () => {
    setSelectedEmailId(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold">
          Vending Machine Simulation
        </h1>
        <p className="text-gray-500 text-xs mt-0.5">
          Powered by Claude AI Agent &middot; Based on Vending-Bench
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Control Panel */}
      <ControlPanel
        state={state}
        isLoading={isLoading}
        finished={finished}
        finishReason={finishReason}
        onStart={startSimulation}
        onNextTurn={nextTurn}
        onSkipTurns={skipTurns}
        onReset={handleReset}
      />

      {/* Main content grid */}
      {state && (
        <div className="grid grid-cols-12 gap-4 mt-4">
          {/* Left column - Vending Machine + Email List + Settings */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <VendingMachineView machine={state.machine} />
            <EmailPanel
              state={state}
              selectedEmailId={selectedEmailId}
              onSelectEmail={setSelectedEmailId}
            />
            <SettingsPanel
              models={models}
              modelsLoading={modelsLoading}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              agentPrompt={agentPrompt}
              onChangePrompt={setAgentPrompt}
              disabled={state.day > 0}
            />
          </div>

          {/* Center - Agent Log or Email Viewer */}
          <div className="col-span-12 lg:col-span-5">
            {selectedEmail ? (
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedEmailId(null)}
                  className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <span>&larr;</span> Agent Log로 돌아가기
                </button>
                <EmailViewer email={selectedEmail} />
              </div>
            ) : (
              <AgentLog log={currentLog} />
            )}
          </div>

          {/* Right column - Financials + Market */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <FinancialPanel state={state} logs={allLogs} />
            <MarketStatus state={state} log={currentLog} />
          </div>
        </div>
      )}

      {/* Empty state - with settings */}
      {!state && (
        <div className="mt-8 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 lg:col-start-2">
            <SettingsPanel
              models={models}
              modelsLoading={modelsLoading}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              agentPrompt={agentPrompt}
              onChangePrompt={setAgentPrompt}
              disabled={false}
            />
          </div>
          <div className="col-span-12 lg:col-span-5 flex flex-col items-center justify-center text-center py-12">
            <div className="text-6xl mb-4">🏭</div>
            <h2 className="text-xl font-semibold text-gray-300 mb-2">
              Vending Machine Simulation
            </h2>
            <p className="text-gray-500 max-w-md text-sm">
              Claude AI 에이전트가 자판기 사업을 경영합니다.
              왼쪽에서 모델과 에이전트 성격을 설정한 후,
              상단에서 시뮬레이션 기간을 선택하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
