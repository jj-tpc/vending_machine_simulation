'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { SimulationState, TurnLog, TurnResponse, StartResponse, ModelInfo, LlmVendor } from '@/simulation/types';
import { DEFAULT_AGENT_PROMPT } from '@/simulation/agent';

// API 키 입력 전 폴백 목록. 키를 넣으면 /api/models가 Anthropic SDK로 실제 카탈로그를 불러와 덮어씁니다.
const DEFAULT_MODELS: Record<LlmVendor, ModelInfo[]> = {
  anthropic: [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', createdAt: '' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', createdAt: '' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', createdAt: '' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', createdAt: '' },
    { id: 'claude-haiku-4-20250414', name: 'Claude Haiku 4', createdAt: '' },
  ],
  openai: [
    { id: 'gpt-5.4', name: 'GPT-5.4', createdAt: '' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', createdAt: '' },
    { id: 'gpt-5', name: 'GPT-5', createdAt: '' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', createdAt: '' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', createdAt: '' },
    { id: 'gpt-4.1', name: 'GPT-4.1', createdAt: '' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', createdAt: '' },
    { id: 'gpt-4o', name: 'GPT-4o', createdAt: '' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', createdAt: '' },
  ],
  gemini: [
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (preview)', createdAt: '' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (preview)', createdAt: '' },
    { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite (preview)', createdAt: '' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', createdAt: '' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', createdAt: '' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', createdAt: '' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', createdAt: '' },
  ],
};

const DEFAULT_MODEL: Record<LlmVendor, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5.4-mini',
  gemini: 'gemini-3.1-flash-lite-preview',
};

export interface LoadingStep {
  label: string;
  status: 'pending' | 'loading' | 'done';
}

// No longer needed - steps come from server

interface UseSimulationReturn {
  state: SimulationState | null;
  currentLog: TurnLog | null;
  allLogs: TurnLog[];
  isLoading: boolean;
  loadingSteps: LoadingStep[];
  error: string | null;
  finished: boolean;
  finishReason: string | null;
  // 설정
  vendor: LlmVendor;
  setVendor: (v: LlmVendor) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  models: ModelInfo[];
  modelsLoading: boolean;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  agentPrompt: string;
  setAgentPrompt: (p: string) => void;
  // 액션
  startSimulation: (maxDays?: number, startDate?: string) => Promise<void>;
  nextTurn: () => Promise<void>;
  skipTurns: (count: number) => Promise<void>;
  reset: () => void;
}

export { DEFAULT_AGENT_PROMPT };

export function useSimulation(): UseSimulationReturn {
  const [state, setState] = useState<SimulationState | null>(null);
  const [currentLog, setCurrentLog] = useState<TurnLog | null>(null);
  const [allLogs, setAllLogs] = useState<TurnLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [finishReason, setFinishReason] = useState<string | null>(null);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([]);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleProgress = useCallback((step: string, status: 'start' | 'done', doneLabel?: string) => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }

    setLoadingSteps(prev => {
      const isThinking = step === '생각중...';

      if (status === 'start') {
        if (isThinking) {
          const existing = prev.find(s => s.label === step || s.label === '생각 완료');
          if (existing) {
            return prev.map(s => (s.label === step || s.label === '생각 완료') ? { ...s, label: step, status: 'loading' } : s);
          }
        }
        const existingOther = prev.find(s => s.label === step);
        if (existingOther) {
          return prev.map(s => s.label === step ? { ...s, status: 'loading' } : s);
        }
        return [...prev, { label: step, status: 'loading' }];
      } else {
        const newLabel = doneLabel || step;
        return prev.map(s => s.label === step ? { ...s, label: newLabel, status: 'done' } : s);
      }
    });
  }, []);

  const clearSteps = useCallback(() => {
    clearTimerRef.current = setTimeout(() => setLoadingSteps([]), 1500);
  }, []);

  // 설정
  const [vendor, setVendorState] = useState<LlmVendor>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<ModelInfo[]>(DEFAULT_MODELS.anthropic);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL.anthropic);
  const [agentPrompt, setAgentPrompt] = useState(DEFAULT_AGENT_PROMPT);

  // vendor 변경 시 모델 목록 및 기본 모델 갱신
  const setVendor = useCallback((v: LlmVendor) => {
    setVendorState(v);
    setModels(DEFAULT_MODELS[v]);
    setSelectedModel(DEFAULT_MODEL[v]);
  }, []);

  // API 키가 있을 때 Anthropic 모델 목록 동적 로드
  useEffect(() => {
    if (vendor !== 'anthropic' || !apiKey) {
      setModels(DEFAULT_MODELS[vendor]);
      return;
    }

    let cancelled = false;
    async function fetchModels() {
      setModelsLoading(true);
      try {
        const res = await fetch('/api/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor, apiKey }),
        });
        const data = await res.json();
        if (!cancelled && data.models && data.models.length > 0) {
          setModels(data.models);
          if (!data.models.find((m: ModelInfo) => m.id === selectedModel)) {
            setSelectedModel(data.models[0].id);
          }
        }
      } catch {
        if (!cancelled) setModels(DEFAULT_MODELS[vendor]);
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    }
    fetchModels();
    return () => { cancelled = true; };
  }, [vendor, apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const startSimulation = useCallback(async (maxDays: number = 30, startDate?: string) => {
    setIsLoading(true);
    setError(null);
    setFinished(false);
    setFinishReason(null);
    setAllLogs([]);
    setCurrentLog(null);

    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDays, startDate }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start');
      }

      const data: StartResponse = await res.json();
      setState(data.state);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const nextTurn = useCallback(async () => {
    if (!state || finished) return;

    setIsLoading(true);
    setError(null);
    setLoadingSteps([]);

    try {
      const res = await fetch('/api/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, model: selectedModel, agentPrompt, vendor, apiKey }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to execute turn');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalReceived = false;

      const processLine = (rawLine: string) => {
        const dataLine = rawLine.trim();
        if (!dataLine.startsWith('data: ')) return;
        let json: { type: string; [key: string]: unknown };
        try {
          json = JSON.parse(dataLine.slice(6));
        } catch (parseErr) {
          const snippet = dataLine.slice(0, 200);
          throw new Error(`서버 응답 JSON 파싱 실패: ${parseErr instanceof Error ? parseErr.message : 'unknown'} (원본: "${snippet}")`);
        }

        if (json.type === 'progress') {
          handleProgress(json.step as string, json.status as 'start' | 'done', json.doneLabel as string | undefined);
        } else if (json.type === 'result') {
          finalReceived = true;
          const data = json as unknown as TurnResponse;
          setState(data.state);
          setCurrentLog(data.log);
          setAllLogs(prev => [...prev, data.log]);

          if (data.finished) {
            setFinished(true);
            setFinishReason(data.finishReason || null);
          }
        } else if (json.type === 'error') {
          finalReceived = true;
          throw new Error(json.error as string);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // 스트림 종료 시 디코더와 버퍼를 flush — 마지막 `\n\n`이 유실되거나
          // 네트워크에서 줄바꿈이 잘려도 최종 메시지를 놓치지 않도록 방어.
          buffer += decoder.decode();
          const tail = buffer.split(/\n\n|\r\n\r\n/);
          for (const line of tail) {
            if (line.trim().startsWith('data: ')) processLine(line);
          }
          buffer = '';
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processLine(line);
        }
      }

      if (!finalReceived) {
        throw new Error(
          '서버가 최종 결과(result/error) 이벤트를 보내지 않고 스트림을 종료했습니다. ' +
          '서버 타임아웃(maxDuration 초과) 또는 네트워크 중단이 원인일 수 있습니다. ' +
          '이번 턴은 서버에서 일부 실행되었을 수 있으니, 결과가 UI에 반영되지 않았다면 같은 상태로 다시 시도하세요.'
        );
      }

      clearSteps();
    } catch (e) {
      clearSteps();
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [state, finished, selectedModel, agentPrompt, vendor, apiKey, handleProgress, clearSteps]);

  const skipTurns = useCallback(async (count: number) => {
    if (!state || finished) return;

    setIsLoading(true);
    setError(null);

    let currentState = state;
    const newLogs: TurnLog[] = [];

    try {
      for (let i = 0; i < count; i++) {
        if (currentState.bankrupt || currentState.day >= currentState.maxDays) break;

        const res = await fetch('/api/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: currentState, model: selectedModel, agentPrompt, vendor, apiKey }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Turn ${i + 1} failed`);
        }

        const data: TurnResponse = await res.json();
        currentState = data.state;
        newLogs.push(data.log);

        if (data.finished) {
          setFinished(true);
          setFinishReason(data.finishReason || null);
          break;
        }
      }

      setState(currentState);
      if (newLogs.length > 0) {
        setCurrentLog(newLogs[newLogs.length - 1]);
        setAllLogs(prev => [...prev, ...newLogs]);
      }
    } catch (e) {
      setState(currentState);
      if (newLogs.length > 0) {
        setCurrentLog(newLogs[newLogs.length - 1]);
        setAllLogs(prev => [...prev, ...newLogs]);
      }
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [state, finished, selectedModel, agentPrompt, vendor, apiKey]);

  const reset = useCallback(() => {
    setState(null);
    setCurrentLog(null);
    setAllLogs([]);
    setIsLoading(false);
    setError(null);
    setFinished(false);
    setFinishReason(null);
  }, []);

  return {
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
  };
}
