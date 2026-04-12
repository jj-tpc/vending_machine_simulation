'use client';

import { useState } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from './ControlPanel';
import VendingMachineView from './VendingMachineView';
import FinancialPanel from './FinancialPanel';
import AgentLog from './AgentLog';
import NewsLine from './NewsLine';
import EmailPanel from './EmailPanel';
import EmailViewer from './EmailViewer';
import SettingsPanel from './SettingsPanel';

export default function Dashboard() {
  const {
    state,
    currentLog,
    allLogs,
    isLoading,
    loadingSteps,
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
  const [showSettings, setShowSettings] = useState(false);
  const [centerTab, setCenterTab] = useState<'agent' | 'email' | 'settings'>('agent');

  // Random start date (between 2020-01-01 and 2025-12-31)
  const [startDate, setStartDate] = useState(() => {
    const start = new Date(2020, 0, 1).getTime();
    const end = new Date(2025, 11, 31).getTime();
    const randomDate = new Date(start + Math.random() * (end - start));
    return randomDate.toISOString().split('T')[0];
  });
  const selectedEmail = state?.emails.find(e => e.id === selectedEmailId) || null;

  const settingsPanel = (
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
      disabled={!!state && state.day > 0}
    />
  );

  const handleReset = () => {
    setSelectedEmailId(null);
    reset();
  };

  return (
    <div className="flex flex-col" style={{ background: 'var(--bg-primary)', height: '100vh', overflow: 'hidden' }}>
      {/* Top: Turn Interface */}
      <div className="toolbar sticky top-0 z-50 px-6 h-14 flex items-center gap-4">
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Vending Machine Simulation
        </h1>
        <div className="flex-1" />
        <ControlPanel
          state={state}
          isLoading={isLoading}
          loadingSteps={loadingSteps}
          finished={finished}
          finishReason={finishReason}
          onStart={startSimulation}
          startDate={startDate}
          onChangeStartDate={setStartDate}
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

      {/* Settings popup overlay */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '40px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
        >
          <div style={{
            width: '780px',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px var(--border-light)',
            background: 'var(--bg-card)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-light)',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Settings</span>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'var(--fill-light)',
                  border: 'none',
                  borderRadius: '6px',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: '4px' }}>
              {settingsPanel}
            </div>
          </div>
        </div>
      )}

      {state ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* News Line */}
          <NewsLine state={state} log={currentLog} />

          {/* 3-column layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Email */}
            <div className="sidebar flex-shrink-0 overflow-y-auto p-3" style={{ width: '260px' }}>
              <EmailPanel
                state={state}
                selectedEmailId={selectedEmailId}
                onSelectEmail={setSelectedEmailId}
                onSwitchToEmailTab={() => setCenterTab('email')}
              />
            </div>

            {/* Center: Tabbed content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab buttons */}
              <div style={{
                display: 'flex',
                gap: '2px',
                padding: '8px 16px 0',
                borderBottom: '1px solid var(--border-light)',
                flexShrink: 0,
              }}>
                {([
                  { key: 'agent', label: 'Agent Log' },
                  { key: 'email', label: 'Email' },
                  { key: 'settings', label: 'Settings' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setCenterTab(tab.key);
                      if (tab.key !== 'email') setSelectedEmailId(null);
                    }}
                    style={{
                      padding: '6px 16px',
                      fontSize: '13px',
                      fontWeight: centerTab === tab.key ? 600 : 400,
                      color: centerTab === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      background: centerTab === tab.key ? 'var(--bg-card)' : 'transparent',
                      border: centerTab === tab.key
                        ? '1px solid var(--border-light)'
                        : '1px solid transparent',
                      borderBottom: centerTab === tab.key
                        ? '1px solid var(--bg-card)'
                        : '1px solid transparent',
                      borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                      cursor: 'pointer',
                      marginBottom: '-1px',
                      transition: 'color var(--transition-fast)',
                    }}
                  >
                    {tab.label}
                    {tab.key === 'email' && state.emails.filter(e => e.type === 'received' && !e.read).length > 0 && (
                      <span style={{
                        marginLeft: '6px',
                        padding: '1px 6px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        fontSize: '9px',
                        borderRadius: '6px',
                        fontWeight: 700,
                      }}>
                        {state.emails.filter(e => e.type === 'received' && !e.read).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {centerTab === 'agent' && (
                  <AgentLog log={currentLog} />
                )}
                {centerTab === 'email' && (
                  selectedEmail ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => setSelectedEmailId(null)}
                        style={{
                          fontSize: '13px',
                          color: 'var(--accent-primary)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        &larr; 목록으로
                      </button>
                      <EmailViewer email={selectedEmail} />
                    </div>
                  ) : (
                    <EmailPanel
                      state={state}
                      selectedEmailId={selectedEmailId}
                      onSelectEmail={setSelectedEmailId}
                    />
                  )
                )}
                {centerTab === 'settings' && (
                  <div className="card">
                    {settingsPanel}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Vending Machine + Finance */}
            <div className="flex-shrink-0 overflow-y-auto p-3 space-y-3" style={{
              width: '408px',
              borderLeft: '1px solid var(--border-light)',
              background: 'var(--bg-sidebar)',
            }}>
              <VendingMachineView machine={state.machine} />
              <FinancialPanel state={state} logs={allLogs} />
            </div>
          </div>
        </div>
      ) : (
        /* Pre-simulation: Settings + Welcome */
        <div className="flex flex-1 overflow-hidden">
          <div className="sidebar flex-shrink-0 overflow-y-auto p-4" style={{ width: '320px' }}>
            {settingsPanel}
          </div>
          <div className="flex-1 overflow-y-auto flex items-center p-6 gap-6">
            <div className="flex-1" />
            {/* Center: Welcome + Date */}
            <div className="text-center" style={{ maxWidth: '400px', flexShrink: 0 }}>
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
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Vending Machine Simulation
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                AI 에이전트가 자판기 사업을 경영합니다.
                왼쪽에서 LLM 제공자, API 키, 모델, 에이전트 성격을 설정한 후
                상단 툴바에서 시뮬레이션 기간을 선택하세요.
              </p>

              {/* Start date card */}
              <div className="card" style={{ marginTop: '24px', padding: '16px 20px', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: '8px' }}>
                  시작 날짜
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="input"
                    style={{ flex: 1, height: '32px', fontSize: '13px' }}
                  />
                  <button
                    onClick={() => setStartDate(new Date().toISOString().split('T')[0])}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', height: '32px', flexShrink: 0 }}
                  >
                    오늘
                  </button>
                  <button
                    onClick={() => {
                      const start = new Date(2020, 0, 1).getTime();
                      const end = new Date(2025, 11, 31).getTime();
                      const d = new Date(start + Math.random() * (end - start));
                      setStartDate(d.toISOString().split('T')[0]);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', height: '32px', flexShrink: 0 }}
                  >
                    랜덤
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1" />
            {/* Right: Rules card */}
            <div style={{ maxWidth: '360px', flexShrink: 0, alignSelf: 'center' }}>
              <div style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                {/* Header */}
                <div style={{
                  background: 'var(--accent-primary)',
                  padding: '16px 20px',
                  color: 'white',
                }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                    게임 규칙
                  </h3>
                  <p style={{ fontSize: '11px', opacity: 0.85 }}>
                    LLM Agent가 자판기를 운영하며 수익을 벌어들입니다.
                    시스템 프롬프트를 수정하여, Agent의 행동과 방향을 조정하여 수익을 극대화 시켜보세요.
                  </p>
                </div>
                {/* Body */}
                <div style={{ background: 'var(--bg-card)', padding: '16px 20px' }}>
                  <RuleItem title="시작 자금은 $500입니다" desc="매일 운영비 $2가 자동으로 빠져나갑니다." />
                  <RuleItem title="자판기에는 12개의 슬롯이 있습니다" desc="소형 6칸에는 최대 15개, 대형 6칸에는 최대 8개까지 넣을 수 있습니다." />
                  <RuleItem title="상품은 공급업체에 이메일로 주문합니다" desc="주문 후 1~3일 뒤에 배송이 도착합니다. 공급업체마다 가격과 성격이 다릅니다." />
                  <RuleItem title="시장 상황이 매출에 영향을 줍니다" desc="날씨, 계절, 주말 여부, 뉴스 이벤트에 따라 고객 수와 구매 패턴이 달라집니다." />
                  <RuleItem title="잔고가 5일 연속 마이너스면 파산합니다" desc="현금 흐름을 잘 관리하고, 자판기에 쌓인 매출을 적시에 수거하세요." />
                  <RuleItem title="시뮬레이션이 끝나면 대여료 $400을 냅니다" desc="최종 정산에서 차감되므로, 충분한 이익을 확보해야 합니다." last />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RuleItem({ title, desc, last }: { title: string; desc: string; last?: boolean }) {
  return (
    <div style={{
      paddingBottom: last ? 0 : '10px',
      marginBottom: last ? 0 : '10px',
      borderBottom: last ? 'none' : '1px solid var(--border-light)',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}
