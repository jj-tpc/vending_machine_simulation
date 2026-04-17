'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from './ControlPanel';
import VendingMachineView from './VendingMachineView';
import FinancialPanel from './FinancialPanel';
import AgentLog from './AgentLog';
import NewsLine from './NewsLine';
import EmailPanel from './EmailPanel';
import EmailViewer from './EmailViewer';
import SettingsPanel from './SettingsPanel';
import TurnSummary from './TurnSummary';
import FinishBanner from './FinishBanner';

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
    clearError,
  } = useSimulation();

  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [centerTab, setCenterTab] = useState<'agent' | 'email' | 'settings'>('agent');

  // History cursor — null이면 Live tail. 숫자면 해당 일차의 로그를 표시(읽기 전용).
  // 시뮬레이션 state(자판기·이메일·잔고)는 언제나 최신 유지.
  const [cursorDay, setCursorDay] = useState<number | null>(null);
  const tailDay = allLogs.length; // 진행된 최종 일차 (1-based; 0이면 로그 없음)
  const isHistory = cursorDay !== null && cursorDay < tailDay;
  // 로그 기반 패널이 볼 displayLog — 히스토리 모드면 allLogs[cursor-1], 아니면 현재
  const displayLog = cursorDay !== null && cursorDay >= 1 && cursorDay <= tailDay
    ? allLogs[cursorDay - 1]
    : currentLog;
  const returnToLive = useCallback(() => setCursorDay(null), []);

  // "다음 일" 실행 시 cursor를 live로 복귀시킨 뒤 턴 진행 — 히스토리에 머문 채 새 턴이 묻히는 것 방지
  const handleNextTurn = useCallback(() => {
    setCursorDay(null);
    nextTurn();
  }, [nextTurn]);

  // 리셋 시 cursor 초기화 (다음 사이클에서 history stale 값 방지)
  const handleReset = useCallback(() => {
    setSelectedEmailId(null);
    setCursorDay(null);
    reset();
  }, [reset]);

  // 키보드 단축키: ← → 탐색, Space 다음 일, Esc 최신으로. input/textarea 포커스·설정 모달 중엔 무시.
  useEffect(() => {
    if (!state) return;
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // input/textarea/select는 타이핑 보호. button은 Space가 native click으로 처리되므로 스킵해 이중 발화 방지.
      if (target && target.matches?.('input, textarea, select, button, [contenteditable="true"]')) return;
      if (showSettings) return; // 설정 모달 열려있으면 Esc 충돌 피함
      if (tailDay === 0) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCursorDay(prev => {
          const curr = prev ?? tailDay;
          return curr > 1 ? curr - 1 : curr;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCursorDay(prev => {
          const curr = prev ?? tailDay;
          if (curr + 1 >= tailDay) return null; // tail 도달 시 Live 복귀
          return curr + 1;
        });
      } else if (e.key === 'Escape') {
        if (cursorDay !== null) {
          e.preventDefault();
          setCursorDay(null);
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        if (!isLoading && !finished) {
          e.preventDefault();
          handleNextTurn();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [state, tailDay, cursorDay, isLoading, finished, showSettings, handleNextTurn]);

  // 센터 탭 스크롤 감지 → TurnSummary compact(28px) 토글. hysteresis 60/40으로 플리커 방지
  const [isCompact, setIsCompact] = useState(false);
  const centerScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = centerScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const top = el.scrollTop;
      setIsCompact(prev => {
        if (!prev && top > 60) return true;
        if (prev && top < 40) return false;
        return prev;
      });
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [state, centerTab]);
  // 탭 전환 시 스크롤 리셋 → compact 복귀 (useLayoutEffect 없이 state 변경으로 간접 처리)
  useEffect(() => { setIsCompact(false); }, [centerTab]);

  // 종료 ceremony: finished가 false → true로 뒤집힐 때 일회성 dim overlay를 재생
  const [dimActive, setDimActive] = useState(false);
  const dimPlayedForFinishRef = useRef(false);
  useEffect(() => {
    if (finished && !dimPlayedForFinishRef.current) {
      dimPlayedForFinishRef.current = true;
      setDimActive(true);
    }
    if (!finished) {
      // 리셋 시 다음 ceremony를 위해 플래그 복원
      dimPlayedForFinishRef.current = false;
      setDimActive(false);
    }
  }, [finished]);

  // 기본 시작일: 오늘 — mount마다 random이면 재현 불가능(교재용으로 부적합).
  // 랜덤화는 welcome 화면의 명시적 "랜덤" 버튼으로만 수행.
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
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

  return (
    <div className="flex flex-col" style={{ background: 'var(--bg-primary)', height: '100vh', overflow: 'hidden', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
      {/* Top: Turn Interface */}
      <div className="toolbar sticky top-0 z-50 px-6 h-14 flex items-center gap-4">
        <h1 className="display" style={{ fontSize: '19px', color: 'var(--text-primary)', flexShrink: 0 }}>
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
          onNextTurn={handleNextTurn}
          onSkipTurns={skipTurns}
          onReset={handleReset}
        />
      </div>

      {/* Error — 닫기 가능, 원문 메시지는 기술적일 수 있으므로 "오류 —" 접두로 맥락 부여 */}
      {error && (
        <div
          className="mx-6 mt-3 px-4 py-2.5 flex items-start gap-3"
          role="alert"
          style={{
            background: 'var(--surface-alert)',
            border: '1px solid var(--surface-alert-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--surface-alert-text)',
            fontSize: '13px',
          }}
        >
          <div style={{ flex: 1, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, marginRight: '6px' }}>오류</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            aria-label="오류 메시지 닫기"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--surface-alert-text)',
              cursor: 'pointer',
              padding: '0 4px',
              fontSize: '16px',
              lineHeight: 1,
              opacity: 0.7,
              flexShrink: 0,
            }}
          >
            &times;
          </button>
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
          <div className="settings-modal" style={{
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
              <span style={{ fontSize: '14px', fontWeight: 600 }}>설정</span>
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
          {/* 종료 ceremony — finished일 때만 3-column 위에 full-width 배너 */}
          {finished && (
            <FinishBanner
              bankrupt={finishReason === 'bankrupt'}
              maxDays={state.maxDays}
              logs={allLogs}
              onReset={handleReset}
            />
          )}

          {/* 일회성 dim overlay — animation 종료 시 자동 언마운트 */}
          {dimActive && (
            <div
              className="finish-dim-overlay"
              aria-hidden="true"
              onAnimationEnd={() => setDimActive(false)}
            />
          )}

          {/* NewsLine — 자체 40px strip. RTL 스크롤 ticker는 의도된 디자인 */}
          <NewsLine
            state={state}
            log={displayLog}
            tailDay={tailDay}
            cursorDay={cursorDay}
            onSeek={setCursorDay}
          />

          {/* Turn Summary — displayLog 기반 + 히스토리 배지. compact는 센터 탭 스크롤로 구동 */}
          <TurnSummary
            log={displayLog}
            allLogs={allLogs}
            finished={finished}
            isHistory={isHistory}
            tailDay={tailDay}
            onReturnLive={returnToLive}
            onInspectWarnings={() => setCenterTab('agent')}
            compact={isCompact && centerTab === 'agent'}
          />

          {/* 3-column layout — 참조 레일 2개 + 센터 drill-down */}
          <div className="dashboard-columns flex flex-1 overflow-hidden">
            {/* Left: Email — 레퍼런스 리스트, 240px */}
            <div className="sidebar dashboard-left flex-shrink-0 overflow-y-auto p-3" style={{ width: '240px' }}>
              <EmailPanel
                state={state}
                selectedEmailId={selectedEmailId}
                onSelectEmail={setSelectedEmailId}
                onSwitchToEmailTab={() => setCenterTab('email')}
              />
            </div>

            {/* Center: Tabbed content */}
            <div className="dashboard-center flex-1 flex flex-col overflow-hidden">
              {/* Tab buttons */}
              <div style={{
                display: 'flex',
                gap: '2px',
                padding: '8px 16px 0',
                borderBottom: '1px solid var(--border-light)',
                flexShrink: 0,
              }}>
                {([
                  { key: 'agent', label: '에이전트 로그' },
                  { key: 'email', label: '이메일' },
                  { key: 'settings', label: '설정' },
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
                        color: 'var(--text-on-accent)',
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

              {/* Tab content — scrollRef 연결해 TurnSummary compact 트리거 */}
              <div ref={centerScrollRef} className="flex-1 overflow-y-auto p-4">
                {centerTab === 'agent' && (
                  <AgentLog log={displayLog} />
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

            {/* Right: Finance(scorecard glance) + Vending Machine(blueprint).
                340px — opinionated: 오늘의 결과값이 먼저, 도면은 아래. 패널 간 gap 20px으로 distinct reference 리듬 확보 */}
            <div className="dashboard-right flex-shrink-0 overflow-y-auto p-3" style={{
              width: '340px',
              borderLeft: '1px solid var(--border-light)',
              background: 'var(--bg-sidebar)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}>
              <FinancialPanel state={state} logs={allLogs} />
              <VendingMachineView machine={state.machine} />
            </div>
          </div>
        </div>
      ) : (
        /* Pre-simulation: Settings + Welcome */
        <div className="welcome-layout flex flex-1 overflow-hidden">
          <div className="sidebar flex-shrink-0 overflow-y-auto p-4" style={{ width: '320px' }}>
            {settingsPanel}
          </div>
          <div className="welcome-main flex-1 overflow-y-auto flex items-center p-6 gap-6">
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
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
              }}>
                <VendingIcon />
              </div>
              <h2 className="display" style={{ fontSize: '34px', color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.15 }}>
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
                  color: 'var(--text-on-accent)',
                }}>
                  {/* .display (Hedvig serif) 채택 — hero 컨벤션에 편입, 3번째 헤딩 타입 제거 */}
                  <h3 className="display" style={{ fontSize: '18px', marginBottom: '4px', lineHeight: 1.2 }}>
                    게임 규칙
                  </h3>
                  <p style={{ fontSize: '11px', opacity: 0.85 }}>
                    LLM Agent가 자판기를 운영하며 수익을 벌어들입니다.
                    시스템 프롬프트를 수정하여, Agent의 행동과 방향을 조정하여 수익을 극대화 시켜보세요.
                  </p>
                </div>
                {/* Body — 번호 매긴 핸드북 스타일 */}
                <div style={{ background: 'var(--bg-card)', padding: '14px 18px' }}>
                  <Rule n={1} text="시작 자금 $500 · 매일 운영비 $2 자동 차감" />
                  <Rule n={2} text="12슬롯 자판기 (소형 6칸 각 15개, 대형 6칸 각 8개)" />
                  <Rule n={3} text="공급업체에 이메일 주문 · 1–3일 뒤 배송" />
                  <Rule n={4} text="날씨·계절·주말·뉴스가 수요와 매출에 영향" />
                  <Rule n={5} text="잔고가 5일 연속 음수면 파산" />
                  <Rule n={6} text="시뮬레이션 종료 시 자판기 대여료 $400 차감" last />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 1-stroke 자판기 도면 아이콘 — 🏭 emoji 대체. mechanical + warm 톤 유지.
function VendingIcon() {
  return (
    <svg
      viewBox="0 0 32 40"
      width="32"
      height="40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="26" height="34" rx="1.5" />
      <line x1="23" y1="3" x2="23" y2="37" />
      <line x1="3" y1="26" x2="23" y2="26" />
      <line x1="10" y1="6" x2="10" y2="26" />
      <line x1="16" y1="6" x2="16" y2="26" />
      <line x1="3" y1="12" x2="23" y2="12" />
      <line x1="3" y1="19" x2="23" y2="19" />
      <rect x="5" y="29" width="16" height="5" rx="0.8" />
      <line x1="25" y1="9" x2="27" y2="9" />
      <line x1="25" y1="13" x2="27" y2="13" />
    </svg>
  );
}

function Rule({ n, text, last }: { n: number; text: string; last?: boolean }) {
  return (
    <div className="flex items-start gap-3" style={{
      paddingBottom: last ? 0 : '8px',
      marginBottom: last ? 0 : '8px',
      borderBottom: last ? 'none' : '1px solid var(--border-light)',
    }}>
      <span style={{
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-quaternary)',
        fontWeight: 600,
        letterSpacing: '0.02em',
        marginTop: '2px',
        flexShrink: 0,
      }}>
        {String(n).padStart(2, '0')}
      </span>
      <span style={{
        fontSize: '12px',
        color: 'var(--text-secondary)',
        lineHeight: 1.55,
      }}>
        {text}
      </span>
    </div>
  );
}

