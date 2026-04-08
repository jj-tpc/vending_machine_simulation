'use client';

import { useState } from 'react';
import { SimulationState, Email } from '@/simulation/types';

interface Props {
  state: SimulationState;
  selectedEmailId: string | null;
  onSelectEmail: (id: string | null) => void;
}

type TabType = 'received' | 'sent';

export default function EmailPanel({ state, selectedEmailId, onSelectEmail }: Props) {
  const [tab, setTab] = useState<TabType>('received');

  const receivedEmails = state.emails.filter(e => e.type === 'received').reverse();
  const sentEmails = state.emails.filter(e => e.type === 'sent').reverse();
  const pendingOrders = state.orders.filter(o => !o.delivered);
  const unreadCount = receivedEmails.filter(e => !e.read).length;

  const displayEmails = tab === 'received' ? receivedEmails : sentEmails;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col" style={{ maxHeight: '600px' }}>
      <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
        Email & Orders
      </h3>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="mb-3 flex-shrink-0">
          <div className="text-[10px] text-amber-400 font-medium mb-1">
            배송 대기 ({pendingOrders.length})
          </div>
          {pendingOrders.map(order => {
            const items = order.items.map(i => `${i.productName} x${i.quantity}`).join(', ');
            const daysLeft = order.deliveryDay - state.day;
            return (
              <div key={order.id} className="bg-gray-800 rounded-lg p-2 mb-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-mono">{order.id}</span>
                  <span className="text-amber-400 text-[10px]">
                    {daysLeft > 0 ? `${daysLeft}일 후` : '도착 중...'}
                  </span>
                </div>
                <div className="text-gray-500 mt-0.5 truncate">{items}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-2 flex-shrink-0">
        <button
          onClick={() => setTab('received')}
          className={`flex-1 text-[11px] py-1.5 rounded-lg font-medium transition-colors ${
            tab === 'received'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
              : 'bg-gray-800 text-gray-500 border border-transparent hover:text-gray-300'
          }`}
        >
          수신함 ({receivedEmails.length})
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-[9px] rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`flex-1 text-[11px] py-1.5 rounded-lg font-medium transition-colors ${
            tab === 'sent'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40'
              : 'bg-gray-800 text-gray-500 border border-transparent hover:text-gray-300'
          }`}
        >
          보낸 메일 ({sentEmails.length})
        </button>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {displayEmails.length === 0 ? (
          <p className="text-gray-600 text-xs py-4 text-center">
            {tab === 'received' ? '수신함이 비어있습니다.' : '보낸 메일이 없습니다.'}
          </p>
        ) : (
          displayEmails.map(email => (
            <EmailRow
              key={email.id}
              email={email}
              isSelected={selectedEmailId === email.id}
              onClick={() => onSelectEmail(selectedEmailId === email.id ? null : email.id)}
            />
          ))
        )}
      </div>

      {/* Storage */}
      {state.storage.length > 0 && (
        <div className="mt-3 border-t border-gray-800 pt-2 flex-shrink-0">
          <div className="text-[10px] text-gray-500 font-medium mb-1">창고 재고</div>
          <div className="flex flex-wrap gap-1">
            {state.storage.map(item => (
              <span
                key={item.productName}
                className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 rounded"
              >
                {item.productName} x{item.quantity}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmailRow({ email, isSelected, onClick }: { email: Email; isSelected: boolean; onClick: () => void }) {
  const isSent = email.type === 'sent';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg p-2 text-xs transition-colors ${
        isSelected
          ? 'bg-blue-900/30 border border-blue-700/50'
          : 'bg-gray-800 border border-transparent hover:bg-gray-750 hover:border-gray-700'
      } ${!email.read && !isSent ? 'border-l-2 border-l-blue-500' : ''}`}
    >
      <div className="flex justify-between items-center gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ${
            isSent ? 'bg-emerald-900/50 text-emerald-400' : 'bg-blue-900/50 text-blue-400'
          }`}>
            {isSent ? '발신' : '수신'}
          </span>
          <span className="text-gray-400 text-[10px] truncate">
            {isSent ? email.to : email.from}
          </span>
        </div>
        <span className="text-gray-600 text-[10px] flex-shrink-0">{email.day}일</span>
      </div>
      <div className={`mt-0.5 truncate ${!email.read && !isSent ? 'text-white font-medium' : 'text-gray-300'}`}>
        {email.subject}
      </div>
    </button>
  );
}
