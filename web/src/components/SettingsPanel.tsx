'use client';

import { useState } from 'react';
import { ModelInfo, LlmVendor } from '@/simulation/types';
import { DEFAULT_AGENT_PROMPT } from '@/simulation/agent';

const VENDOR_OPTIONS: { value: LlmVendor; label: string; placeholder: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { value: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
  { value: 'gemini', label: 'Google (Gemini)', placeholder: 'AIza...' },
];

interface Props {
  models: ModelInfo[];
  modelsLoading: boolean;
  selectedModel: string;
  onSelectModel: (id: string) => void;
  vendor: LlmVendor;
  onSelectVendor: (vendor: LlmVendor) => void;
  apiKey: string;
  onChangeApiKey: (key: string) => void;
  agentPrompt: string;
  onChangePrompt: (prompt: string) => void;
  disabled: boolean;
}

export default function SettingsPanel({
  models,
  modelsLoading,
  selectedModel,
  onSelectModel,
  vendor,
  onSelectVendor,
  apiKey,
  onChangeApiKey,
  agentPrompt,
  onChangePrompt,
  disabled,
}: Props) {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(agentPrompt);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSavePrompt = () => {
    onChangePrompt(editingPrompt);
    setIsPromptOpen(false);
  };

  const handleResetPrompt = () => {
    setEditingPrompt(DEFAULT_AGENT_PROMPT);
    onChangePrompt(DEFAULT_AGENT_PROMPT);
  };

  const currentVendor = VENDOR_OPTIONS.find(v => v.value === vendor)!;

  return (
    <div className="p-4 space-y-4">

      {/* LLM Vendor */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 500 }}>
          LLM Provider
        </label>
        <div className="segmented">
          {VENDOR_OPTIONS.map(v => (
            <button
              key={v.value}
              onClick={() => onSelectVendor(v.value)}
              disabled={disabled}
              className={`segmented-item ${vendor === v.value ? 'active' : ''}`}
              style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              {v.label.split(' ')[0]}
            </button>
          ))}
        </div>
        {disabled && (
          <p style={{ fontSize: '11px', color: 'var(--text-quaternary)', marginTop: '4px' }}>
            시뮬레이션 중에는 변경이 불가합니다.
          </p>
        )}
      </div>

      {/* API Key */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 500 }}>
          API Key
          <span style={{ color: 'var(--text-quaternary)', marginLeft: '4px', fontWeight: 400 }}>
            ({currentVendor.label})
          </span>
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => onChangeApiKey(e.target.value)}
            placeholder={currentVendor.placeholder}
            disabled={disabled}
            className="input"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              paddingRight: '52px',
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'text',
            }}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              color: 'var(--accent-primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {showApiKey ? '숨기기' : '보기'}
          </button>
        </div>
        {!apiKey && (
          <p style={{ fontSize: '11px', color: 'var(--accent-orange)', marginTop: '4px' }}>
            API 키를 입력해야 시뮬레이션을 실행할 수 있습니다.
          </p>
        )}
      </div>

      {/* Model */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 500 }}>
          Model
        </label>
        {modelsLoading ? (
          <div className="animate-pulse" style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>
            Loading models...
          </div>
        ) : (
          <select
            value={selectedModel}
            onChange={e => onSelectModel(e.target.value)}
            disabled={disabled}
            className="select"
            style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name || m.id}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Agent Prompt */}
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Agent Prompt</label>
          <button
            onClick={() => {
              setEditingPrompt(agentPrompt);
              setIsPromptOpen(!isPromptOpen);
            }}
            style={{
              fontSize: '12px',
              color: 'var(--accent-primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isPromptOpen ? '닫기' : '편집'}
          </button>
        </div>

        {!isPromptOpen ? (
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            maxHeight: '80px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
            border: '1px solid var(--border-light)',
          }}>
            {agentPrompt.slice(0, 200)}
            {agentPrompt.length > 200 && '...'}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={editingPrompt}
              onChange={e => setEditingPrompt(e.target.value)}
              rows={10}
              className="input"
              style={{
                height: 'auto',
                padding: '10px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.5,
                resize: 'vertical',
              }}
              placeholder="에이전트의 역할, 성격, 행동 패턴을 자유롭게 작성하세요..."
            />
            <div className="flex gap-1.5">
              <button onClick={handleSavePrompt} className="btn btn-primary" style={{ height: '28px', fontSize: '12px' }}>
                적용
              </button>
              <button onClick={handleResetPrompt} className="btn btn-secondary" style={{ height: '28px', fontSize: '12px' }}>
                기본값 복원
              </button>
              <button onClick={() => setIsPromptOpen(false)} className="btn btn-ghost" style={{ height: '28px', fontSize: '12px' }}>
                취소
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-quaternary)' }}>
              역할, 성격, 행동 패턴을 편집할 수 있습니다. 환경 규칙과 도구 사용법은 시스템에서 자동으로 추가됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
