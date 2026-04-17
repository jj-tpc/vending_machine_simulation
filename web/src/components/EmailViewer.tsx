'use client';

import { Email } from '@/simulation/types';

interface Props {
  email: Email | null;
}

export default function EmailViewer({ email }: Props) {
  if (!email) {
    return (
      <div className="card p-6 h-full flex items-center justify-center">
        <div className="text-center">
          {/* 1-stroke envelope — ✉ 유니코드 이모지 대체, opacity로 subtle anchor 유지 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--text-quaternary)', opacity: 0.5 }}>
            <svg
              viewBox="0 0 32 32"
              width="32"
              height="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4" y="9" width="24" height="16" rx="1.5" />
              <path d="M4 10 L16 19 L28 10" />
            </svg>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-quaternary)' }}>
            좌측에서 이메일을 선택하세요
          </p>
        </div>
      </div>
    );
  }

  const isSent = email.type === 'sent';

  return (
    <div className="card p-5 h-full overflow-y-auto">
      <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '14px' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
          <span className="badge" style={{
            background: isSent ? 'var(--surface-success)' : 'var(--surface-info)',
            color: isSent ? 'var(--surface-success-text)' : 'var(--surface-info-text)',
            fontSize: '11px',
          }}>
            {isSent ? '보낸 메일' : '받은 메일'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{email.day}일차</span>
          <span style={{ fontSize: '11px', color: 'var(--text-quaternary)' }}>{email.id}</span>
        </div>

        <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
          {email.subject}
        </h2>

        <div className="space-y-1">
          <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
            <span style={{ color: 'var(--text-tertiary)', width: '32px', flexShrink: 0 }}>From</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: isSent ? 'var(--accent-green)' : 'var(--text-secondary)',
            }}>
              {email.from}
            </span>
          </div>
          <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
            <span style={{ color: 'var(--text-tertiary)', width: '32px', flexShrink: 0 }}>To</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: isSent ? 'var(--text-secondary)' : 'var(--accent-blue)',
            }}>
              {email.to}
            </span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
        {email.body}
      </div>
    </div>
  );
}
