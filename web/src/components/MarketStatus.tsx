'use client';

import { TurnLog, SimulationState } from '@/simulation/types';
import { weatherLabel, seasonLabel, dayOfWeekLabel } from '@/simulation/market';

interface Props {
  state: SimulationState;
  log: TurnLog | null;
}

export default function MarketStatus({ state, log }: Props) {
  const market = log?.market;
  const visibleEvents = state.marketEvents.filter(e => e.visible && e.expiresDay > state.day);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
        Market Status
      </h3>

      {market ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">Date</span>
            <span className="text-white text-sm font-mono">{market.date}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">Day of Week</span>
            <span className="text-white text-sm">
              {dayOfWeekLabel(market.dayOfWeek)}
              {(market.dayOfWeek === 'sat' || market.dayOfWeek === 'sun') && (
                <span className="ml-1 text-[10px] text-amber-400">(Weekend +30%)</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">Weather</span>
            <span className="text-white text-sm">{weatherLabel(market.weather)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs">Season</span>
            <span className="text-white text-sm">{seasonLabel(market.season)}</span>
          </div>

          <div className="border-t border-gray-800 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs">Progress</span>
              <span className="text-gray-400 text-xs">
                Day {state.day} / {state.maxDays}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(state.day / state.maxDays) * 100}%` }}
              />
            </div>
          </div>

          {/* 시장 뉴스 */}
          {visibleEvents.length > 0 && (
            <div className="border-t border-gray-800 pt-3 space-y-2">
              <div className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">
                Market News
              </div>
              {visibleEvents.map(event => (
                <div key={event.id} className="bg-gray-800 rounded-lg p-2.5">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {event.headline}
                  </div>
                  <div className="text-[10px] text-blue-400 mt-0.5">
                    {event.subheadline}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {event.body}
                  </div>
                  <div className="text-[9px] text-gray-600 mt-1">
                    {event.day}일차 ~ {event.expiresDay}일차
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-600 text-sm">Waiting for simulation to start...</p>
      )}
    </div>
  );
}
