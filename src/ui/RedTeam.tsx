import { useState } from 'react';
import type { RedTeam } from '../engine/schema';
import { evaluateDefence, gradeRedTeam, renderPayload, runAttack, type Attack } from '../engine/redteam';
import { Feedback } from './common';
import type { OnScore } from './ChallengeView';

const STATE_ICON = { deliver: '📬', filter: '🧹', obey: '🧠', act: '🛠', goal: '🏴', end: '⏹' } as const;
const KIND = ['channel', 'instruction', 'disguise'] as const;
const KIND_LABEL = { channel: 'Where you plant it', instruction: 'What it tells the agent', disguise: 'How it is dressed up' } as const;

function Log({ lines }: { lines: ReturnType<typeof runAttack>['log'] }) {
  return (
    <ol className="fsm">
      {lines.map((l, i) => (
        <li key={i} className={l.ok ? 'ok' : 'stop'}>
          <span className="fsm-state">{STATE_ICON[l.state]} {l.state}</span>
          <span>{l.msg}</span>
        </li>
      ))}
    </ol>
  );
}

/** Stage 1: assemble an injection from tiles and run it through the agent FSM. Stage 2: pick the defence that blocks it without breaking utility. */
export function RedTeamPlayer({ ch, onScore }: { ch: RedTeam; onScore: OnScore }) {
  const [pick, setPick] = useState<Attack>({ channel: '', instruction: '', disguise: '' });
  const [run, setRun] = useState<ReturnType<typeof runAttack> | null>(null);
  const [defence, setDefence] = useState('');
  const [result, setResult] = useState<ReturnType<typeof gradeRedTeam> | null>(null);
  const ready = KIND.every((k) => pick[k]);
  const payload = ready ? renderPayload(ch, pick) : null;
  const reset = () => { setPick({ channel: '', instruction: '', disguise: '' }); setRun(null); setDefence(''); setResult(null); };
  const submit = () => {
    const r = gradeRedTeam(ch, { attack: pick, defence });
    setResult(r);
    onScore(ch, r.score);
  };
  const total = successfulCount(ch);

  return (
    <>
      <div className="panel small redteam-brief">
        <div><b>User's task:</b> {ch.simulator.task}</div>
        <div><b>Your goal as attacker:</b> {ch.simulator.goal}</div>
        <div><b>Already in place:</b> {ch.simulator.defences.length ? ch.simulator.defences.map((d) => d.label).join(', ') : 'nothing'}</div>
      </div>

      <h3>1 · Build the attack</h3>
      {KIND.map((k) => (
        <div key={k}>
          <div className="eyebrow">{KIND_LABEL[k]}</div>
          <div className="cats">
            {ch.tiles[k].map((t) => (
              <button key={t.id} className={`cat ${pick[k] === t.id ? 'picked' : ''}`} disabled={!!run} onClick={() => setPick({ ...pick, [k]: t.id })} aria-pressed={pick[k] === t.id}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {payload && (
        <div className="code-block payload">
          <div className="eyebrow">Planted text{payload.shown !== payload.decoded ? ' (what a filter sees)' : ''}</div>
          <code>{payload.shown}</code>
          {payload.shown !== payload.decoded && <><div className="eyebrow">What the agent decodes</div><code>{payload.decoded}</code></>}
        </div>
      )}
      {!run ? (
        <button className="btn primary" disabled={!ready} onClick={() => setRun(runAttack(ch, pick))}>Run attack</button>
      ) : (
        <>
          <Log lines={run.log} />
          <p className="small">{run.reached ? '🏴 Attack landed. Now switch sides.' : '🛡 Attack failed. You can still pick the defence; the attack half scores 0.'}</p>

          <h3>2 · Switch sides: pick one defence</h3>
          <p className="muted small">It must stop every attack that works today, not just yours, and keep these tasks working:</p>
          <ul className="small">{ch.utility_tasks.map((u) => <li key={u.id}>{u.label}</li>)}</ul>
          <div className="cats">
            {ch.defence_options.map((d) => {
              const cls = result ? (d.id === ch.answer.defence ? 'ans' : d.id === defence ? 'wrong' : '') : d.id === defence ? 'picked' : '';
              return (
                <button key={d.id} className={`cat ${cls}`} onClick={() => !result && setDefence(d.id)} aria-pressed={d.id === defence} title={d.note}>
                  {d.label}{d.note && <span className="muted small"> · {d.note}</span>}
                </button>
              );
            })}
          </div>
          {!result ? (
            <button className="btn primary" disabled={!defence} onClick={submit}>Deploy defence</button>
          ) : (
            <Feedback ok={result.correct} score={result.score}>
              <p className="small">
                Attack: {result.attackOk ? '✓ reached the goal' : '✗ did not reach the goal'} · Defence: {result.defenceOk ? '✓' : '✗'}{' '}
                blocks {total - result.defence.stillOpen.length} of {total} working attacks
              </p>
              <ul className="small">
                {result.defence.utility.map((u) => <li key={u.id}>{u.ok ? '✅' : '❌'} {u.label}{u.ok ? '' : `: ${u.reason}`}</li>)}
              </ul>
              {result.defence.stillOpen.length > 0 && (
                <p className="small">Still open: {result.defence.stillOpen.map((a) => `${label(ch, 'channel', a.channel)} + ${label(ch, 'disguise', a.disguise)}`).join('; ')}</p>
              )}
              <p>{ch.explanation}</p>
              {!result.correct && <button className="btn" onClick={reset}>Try again</button>}
            </Feedback>
          )}
        </>
      )}
    </>
  );
}

const successfulCount = (ch: RedTeam) => evaluateDefence(ch, '__none__').stillOpen.length;
const label = (ch: RedTeam, k: (typeof KIND)[number], id: string) => ch.tiles[k].find((t) => t.id === id)?.label ?? id;
