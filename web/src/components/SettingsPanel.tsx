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
  disabled: boolean; // 시뮬레이션 진행 중이면 변경 불가
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
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        Settings
      </h3>

      {/* LLM Vendor Selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">LLM Provider</label>
        <div className="flex gap-1">
          {VENDOR_OPTIONS.map(v => (
            <button
              key={v.value}
              onClick={() => onSelectVendor(v.value)}
              disabled={disabled}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${vendor === v.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {v.label.split(' ')[0]}
            </button>
          ))}
        </div>
        {disabled && (
          <p className="text-[10px] text-gray-600 mt-1">시뮬레이션 중에는 변경이 불가합니다. 리셋 후 변경하세요.</p>
        )}
      </div>

      {/* API Key Input */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          API Key <span className="text-gray-600">({currentVendor.label})</span>
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => onChangeApiKey(e.target.value)}
            placeholder={currentVendor.placeholder}
            disabled={disabled}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-16 text-sm text-white
                       placeholder:text-gray-600
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:border-blue-500 transition-colors
                       font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 hover:text-gray-300 transition-colors px-1"
          >
            {showApiKey ? '숨기기' : '보기'}
          </button>
        </div>
        {!apiKey && (
          <p className="text-[10px] text-amber-500/70 mt-1">
            API 키를 입력해야 시뮬레이션을 실행할 수 있습니다.
          </p>
        )}
      </div>

      {/* Model Selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Model</label>
        {modelsLoading ? (
          <div className="text-xs text-gray-600 animate-pulse">Loading models...</div>
        ) : (
          <select
            value={selectedModel}
            onChange={e => onSelectModel(e.target.value)}
            disabled={disabled}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:border-blue-500 transition-colors"
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
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-500">Agent Prompt</label>
          <button
            onClick={() => {
              setEditingPrompt(agentPrompt);
              setIsPromptOpen(!isPromptOpen);
            }}
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isPromptOpen ? '닫기' : '편집'}
          </button>
        </div>

        {!isPromptOpen ? (
          <div className="bg-gray-800 rounded-lg p-2 text-[11px] text-gray-400 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {agentPrompt.slice(0, 200)}
            {agentPrompt.length > 200 && '...'}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={editingPrompt}
              onChange={e => setEditingPrompt(e.target.value)}
              rows={12}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200
                         font-mono leading-relaxed resize-y
                         focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="에이전트의 역할, 성격, 행동 패턴을 자유롭게 작성하세요..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleSavePrompt}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium transition-colors"
              >
                적용
              </button>
              <button
                onClick={handleResetPrompt}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition-colors"
              >
                기본값 복원
              </button>
              <button
                onClick={() => setIsPromptOpen(false)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition-colors"
              >
                취소
              </button>
            </div>
            <p className="text-[10px] text-gray-600">
              역할, 성격, 행동 패턴을 편집할 수 있습니다. 환경 규칙과 도구 사용법은 시스템에서 자동으로 추가됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
