'use client';

import { SimulationState } from '@/simulation/types';

interface Props {
  state: SimulationState | null;
  isLoading: boolean;
  finished: boolean;
  finishReason: string | null;
  onStart: (maxDays: number) => void;
  onNextTurn: () => void;
  onSkipTurns: (count: number) => void;
  onReset: () => void;
}

export default function ControlPanel({
  state,
  isLoading,
  finished,
  finishReason,
  onStart,
  onNextTurn,
  onSkipTurns,
  onReset,
}: Props) {
  const notStarted = !state;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center gap-4 flex-wrap">
      {notStarted ? (
        <>
          <span className="text-gray-400 text-sm">Simulation Duration:</span>
          <button
            onClick={() => onStart(15)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            15 Days
          </button>
          <button
            onClick={() => onStart(30)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            30 Days
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Day</span>
            <span className="text-white font-bold text-lg">{state.day}</span>
            <span className="text-gray-500">/ {state.maxDays}</span>
          </div>

          <div className="h-6 w-px bg-gray-700" />

          {finished ? (
            <div className="flex items-center gap-3">
              <span className="text-yellow-400 font-medium">
                {finishReason === 'bankrupt' ? 'BANKRUPT' : 'SIMULATION COMPLETE'}
              </span>
              <button
                onClick={onReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
              >
                Reset
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onNextTurn}
                disabled={isLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">&#9696;</span>
                    Processing...
                  </>
                ) : (
                  'Next Turn'
                )}
              </button>

              <button
                onClick={() => onSkipTurns(15)}
                disabled={isLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                Skip 15 Turns
              </button>

              <div className="ml-auto">
                <button
                  onClick={onReset}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-sm transition-colors"
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </>
      )}

      {isLoading && (
        <span className="text-blue-400 text-xs animate-pulse ml-2">
          Claude is thinking...
        </span>
      )}
    </div>
  );
}
