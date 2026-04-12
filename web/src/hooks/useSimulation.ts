'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { SimulationState, TurnLog, TurnResponse, StartResponse, ModelInfo, LlmVendor } from '@/simulation/types';
import { DEFAULT_AGENT_PROMPT } from '@/simulation/agent';

const DEFAULT_MODELS: Record<LlmVendor, ModelInfo[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', createdAt: '' },
    { id: 'claude-haiku-4-20250414', name: 'Claude Haiku 4', createdAt: '' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', createdAt: '' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', createdAt: '' },
    { id: 'gpt-4.1', name: 'GPT-4.1', createdAt: '' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', createdAt: '' },
  ],
  gemini: [
    { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', createdAt: '' },
    { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash', createdAt: '' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', createdAt: '' },
  ],
};

const DEFAULT_MODEL: Record<LlmVendor, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-flash-preview-04-17',
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith('data: ')) continue;
          const json = JSON.parse(dataLine.slice(6));

          if (json.type === 'progress') {
            handleProgress(json.step, json.status, json.doneLabel);
          } else if (json.type === 'result') {
            const data = json as TurnResponse;
            setState(data.state);
            setCurrentLog(data.log);
            setAllLogs(prev => [...prev, data.log]);

            if (data.finished) {
              setFinished(true);
              setFinishReason(data.finishReason || null);
            }
          } else if (json.type === 'error') {
            throw new Error(json.error);
          }
        }
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
