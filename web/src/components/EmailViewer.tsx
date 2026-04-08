'use client';

import { Email } from '@/simulation/types';

interface Props {
  email: Email | null;
}

export default function EmailViewer({ email }: Props) {
  if (!email) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2 opacity-30">&#9993;</div>
          <p className="text-gray-600 text-xs">좌측에서 이메일을 선택하세요</p>
        </div>
      </div>
    );
  }

  const isSent = email.type === 'sent';

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-gray-800 pb-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isSent ? 'bg-emerald-900/50 text-emerald-400' : 'bg-blue-900/50 text-blue-400'
          }`}>
            {isSent ? '보낸 메일' : '받은 메일'}
          </span>
          <span className="text-gray-600 text-[10px]">{email.day}일차</span>
          <span className="text-gray-700 text-[10px]">{email.id}</span>
        </div>

        <h2 className="text-sm font-semibold text-white mb-2">{email.subject}</h2>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 w-10 flex-shrink-0">From</span>
            <span className={`font-mono ${isSent ? 'text-emerald-400' : 'text-gray-300'}`}>
              {email.from}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 w-10 flex-shrink-0">To</span>
            <span className={`font-mono ${isSent ? 'text-gray-300' : 'text-blue-400'}`}>
              {email.to}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
        {email.body}
      </div>
    </div>
  );
}
