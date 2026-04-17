'use client';

import { memo, useState } from 'react';
import { SimulationState, Email } from '@/simulation/types';

interface Props {
  state: SimulationState;
  selectedEmailId: string | null;
  onSelectEmail: (id: string | null) => void;
  onSwitchToEmailTab?: () => void;
}

type TabType = 'received' | 'sent';

function EmailPanelImpl({ state, selectedEmailId, onSelectEmail, onSwitchToEmailTab }: Props) {
  const [tab, setTab] = useState<TabType>('received');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const receivedEmails = state.emails.filter(e => e.type === 'received').reverse();
  const sentEmails = state.emails.filter(e => e.type === 'sent').reverse();
  const pendingOrders = state.orders.filter(o => !o.delivered);
  const unreadCount = receivedEmails.filter(e => !e.read).length;

  const displayEmails = tab === 'received' ? receivedEmails : sentEmails;

  return (
    <div className="surface-rail p-3 flex flex-col" style={{ maxHeight: '500px' }}>
      <h3 className="section-heading" style={{ marginBottom: '8px' }}>
        Email & Orders
      </h3>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div style={{ marginBottom: '8px', flexShrink: 0 }}>
          <div className="section-heading" style={{ marginBottom: '4px', color: 'var(--surface-pending-text)' }}>
            배송 대기 ({pendingOrders.length})
          </div>
          {pendingOrders.map(order => {
            const items = order.items.map(i => `${i.productName} x${i.quantity}`).join(', ');
            const daysLeft = order.deliveryDay - state.day;
            const isExpanded = expandedOrderId === order.id;
            const supplier = state.suppliers.find(s => s.id === order.supplierId);
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                aria-expanded={isExpanded}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'var(--surface-pending)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px',
                  marginBottom: '4px',
                  border: '1px solid var(--surface-pending-border)',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {order.id}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--surface-pending-text)', fontWeight: 600 }}>
                    {daysLeft > 0 ? `${daysLeft}일 후` : '도착 중...'}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {items}
                </div>
                {isExpanded && (
                  <div style={{
                    marginTop: '6px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--surface-pending-border)',
                    fontSize: '10px',
                  }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>공급업체:</span> {supplier?.name || order.supplierId}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>주문일:</span> {order.orderDay}일차 &rarr; <span style={{ fontWeight: 600 }}>배송 예정:</span> {order.deliveryDay}일차
                    </div>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between" style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        <span>{item.productName} x{item.quantity}</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between" style={{
                      marginTop: '4px',
                      paddingTop: '4px',
                      borderTop: '1px dashed var(--surface-pending-border)',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}>
                      <span>합계</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>${order.totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Segmented Tab */}
      <div className="segmented" style={{ marginBottom: '8px', flexShrink: 0 }}>
        <button onClick={() => setTab('received')} className={`segmented-item ${tab === 'received' ? 'active' : ''}`}>
          수신함 ({receivedEmails.length})
          {unreadCount > 0 && (
            <span style={{
              marginLeft: '4px',
              padding: '0 5px',
              background: 'var(--accent-primary)',
              color: 'var(--text-on-accent)',
              fontSize: '9px',
              borderRadius: '6px',
              fontWeight: 700,
            }}>
              {unreadCount}
            </span>
          )}
        </button>
        <button onClick={() => setTab('sent')} className={`segmented-item ${tab === 'sent' ? 'active' : ''}`}>
          보낸 메일 ({sentEmails.length})
        </button>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto space-y-0.5" style={{ minHeight: 0 }}>
        {displayEmails.length === 0 ? (
          <p style={{ color: 'var(--text-quaternary)', fontSize: '12px', padding: '16px 0', textAlign: 'center' }}>
            {tab === 'received' ? '수신함이 비어있습니다.' : '보낸 메일이 없습니다.'}
          </p>
        ) : (
          displayEmails.map(email => (
            <EmailRow
              key={email.id}
              email={email}
              isSelected={selectedEmailId === email.id}
              onClick={() => {
                onSelectEmail(email.id);
                onSwitchToEmailTab?.();
              }}
            />
          ))
        )}
      </div>

      {/* Storage */}
      {state.storage.length > 0 && (
        <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '8px', flexShrink: 0 }}>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '4px' }}>
            창고 재고
          </div>
          <div className="flex flex-wrap gap-1">
            {state.storage.map(item => (
              <span key={item.productName} style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: 'var(--fill-light)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
              }}>
                {item.productName} x{item.quantity}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const EmailPanel = memo(EmailPanelImpl);
export default EmailPanel;

function EmailRow({ email, isSelected, onClick }: { email: Email; isSelected: boolean; onClick: () => void }) {
  const isSent = email.type === 'sent';
  const isUnread = !email.read && !isSent;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 8px',
        fontSize: '11px',
        transition: 'background var(--transition-fast)',
        border: 'none',
        cursor: 'pointer',
        background: isSelected ? 'var(--accent-primary)' : 'transparent',
        color: isSelected ? 'var(--text-on-accent)' : 'var(--text-primary)',
        display: 'block',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--fill-light)'; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div className="flex justify-between items-center gap-1">
        <div className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
          <span className="badge" style={{
            fontSize: '9px',
            background: isSelected ? 'rgba(255,255,255,0.2)' : isSent ? 'var(--surface-success)' : 'var(--surface-info)',
            color: isSelected ? 'var(--text-on-accent)' : isSent ? 'var(--surface-success-text)' : 'var(--surface-info-text)',
          }}>
            {isSent ? '발신' : '수신'}
          </span>
          <span style={{
            fontSize: '10px',
            color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {isSent ? email.to : email.from}
          </span>
        </div>
        <span style={{
          fontSize: '10px',
          color: isSelected ? 'rgba(255,255,255,0.5)' : 'var(--text-quaternary)',
          flexShrink: 0,
        }}>
          {email.day}일
        </span>
      </div>
      <div style={{
        marginTop: '2px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontWeight: isUnread ? 600 : 400,
        color: isSelected ? 'var(--text-on-accent)' : isUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}>
        {email.subject}
      </div>
    </button>
  );
}
