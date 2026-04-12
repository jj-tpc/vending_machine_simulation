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
    vendor,
    setVendor,
    apiKey,
    setApiKey,
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Top toolbar */}
      <div className="toolbar sticky top-0 z-50 px-6 h-14 flex items-center gap-4">
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Vending Machine Simulation
        </h1>
        <div className="flex-1" />
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
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-3 px-4 py-2.5" style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)',
          color: 'var(--accent-red)',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Main content */}
      {state ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="sidebar flex-shrink-0 overflow-y-auto p-4 space-y-4" style={{ width: '280px' }}>
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
              vendor={vendor}
              onSelectVendor={setVendor}
              apiKey={apiKey}
              onChangeApiKey={setApiKey}
              agentPrompt={agentPrompt}
              onChangePrompt={setAgentPrompt}
              disabled={state.day > 0}
            />
          </div>

          {/* Center content */}
          <div className="flex-1 overflow-y-auto p-5">
            {selectedEmail ? (
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedEmailId(null)}
                  className="btn-ghost flex items-center gap-1"
                  style={{ fontSize: '13px', color: 'var(--accent-primary)', padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span>&larr;</span> Agent Log
                </button>
                <EmailViewer email={selectedEmail} />
              </div>
            ) : (
              <AgentLog log={currentLog} />
            )}
          </div>

          {/* Right inspector */}
          <div className="flex-shrink-0 overflow-y-auto p-4 space-y-4" style={{
            width: '320px',
            borderLeft: '1px solid var(--border-light)',
            background: 'var(--bg-sidebar)',
          }}>
            <FinancialPanel state={state} logs={allLogs} />
            <MarketStatus state={state} log={currentLog} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Settings sidebar */}
          <div className="sidebar flex-shrink-0 overflow-y-auto p-4" style={{ width: '320px' }}>
            <SettingsPanel
              models={models}
              modelsLoading={modelsLoading}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              vendor={vendor}
              onSelectVendor={setVendor}
              apiKey={apiKey}
              onChangeApiKey={setApiKey}
              agentPrompt={agentPrompt}
              onChangePrompt={setAgentPrompt}
              disabled={false}
            />
          </div>

          {/* Welcome */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center" style={{ maxWidth: '400px' }}>
              <div style={{
                width: '72px',
                height: '72px',
                margin: '0 auto 20px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                border: '1px solid var(--border-light)',
              }}>
                🏭
              </div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}>
                Vending Machine Simulation
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}>
                AI 에이전트가 자판기 사업을 경영합니다.
                왼쪽에서 LLM 제공자, API 키, 모델, 에이전트 성격을 설정한 후
                상단 툴바에서 시뮬레이션 기간을 선택하세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
