import type { ReactNode } from 'react';
import type { Step } from '../engine/schema';

export function Feedback({ ok, score, children }: { ok: boolean; score: number; children: ReactNode }) {
  return (
    <div className={`panel feedback ${ok ? 'good' : score > 0 ? 'meh' : 'bad'}`}>
      <b>{ok ? '✅ Nailed it.' : score > 0 ? `🟡 Partly right (${Math.round(score * 100)}%).` : '❌ Not quite.'}</b>
      {children}
    </div>
  );
}

export const roleLabel: Record<string, string> = { user: '👤 User', agent: '🤖 Agent', tool_call: '🛠 Tool call', tool_result: '📦 Tool result', system: '⚙️ System' };

export function StepBody({ s }: { s: Step }) {
  return (
    <>
      <span className="step-role">{roleLabel[s.role]} <span className="muted">{s.id}</span></span>
      {s.role === 'tool_call' ? <code>{s.tool}({JSON.stringify(s.args ?? {})})</code> : s.role === 'tool_result' ? <code>{s.content}</code> : <span>{s.content}</span>}
    </>
  );
}
