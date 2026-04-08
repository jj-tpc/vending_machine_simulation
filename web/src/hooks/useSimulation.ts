'use client';

import { useState, useCallback, useEffect } from 'react';
import { SimulationState, TurnLog, TurnResponse, StartResponse, ModelInfo } from '@/simulation/types';
import { DEFAULT_AGENT_PROMPT } from '@/simulation/agent';

interface UseSimulationReturn {
  state: SimulationState | null;
  currentLog: TurnLog | null;
  allLogs: TurnLog[];
  isLoading: boolean;
  error: string | null;
  finished: boolean;
  finishReason: string | null;
  // 설정
  models: ModelInfo[];
  modelsLoading: boolean;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  agentPrompt: string;
  setAgentPrompt: (p: string) => void;
  // 액션
  startSimulation: (maxDays?: number) => Promise<void>;
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

  // 설정
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514');
  const [agentPrompt, setAgentPrompt] = useState(DEFAULT_AGENT_PROMPT);

  // 모델 목록 로드
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('/api/models');
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          setModels(data.models);
          // 첫 번째 모델을 기본으로 선택 (최신순)
          if (!data.models.find((m: ModelInfo) => m.id === selectedModel)) {
            setSelectedModel(data.models[0].id);
          }
        }
      } catch {
        // 폴백은 API에서 처리
      } finally {
        setModelsLoading(false);
      }
    }
    fetchModels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startSimulation = useCallback(async (maxDays: number = 30) => {
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
        body: JSON.stringify({ maxDays }),
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

    try {
      const res = await fetch('/api/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, model: selectedModel, agentPrompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to execute turn');
      }

      const data: TurnResponse = await res.json();
      setState(data.state);
      setCurrentLog(data.log);
      setAllLogs(prev => [...prev, data.log]);

      if (data.finished) {
        setFinished(true);
        setFinishReason(data.finishReason || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [state, finished, selectedModel, agentPrompt]);

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
          body: JSON.stringify({ state: currentState, model: selectedModel, agentPrompt }),
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
  }, [state, finished, selectedModel, agentPrompt]);

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
  };
}
