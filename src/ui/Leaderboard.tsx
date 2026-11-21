import { useEffect, useState } from 'react';
import { cloudEnabled, fetchLeaderboard, setShowOnBoard, type BoardRow, type Session } from '../engine/cloud';
import { rankFor } from '../engine/progress';

export function Leaderboard({ session, showOnBoard, onToggle, onSignIn }: { session: Session | null; showOnBoard: boolean; onToggle: (v: boolean) => void; onSignIn: () => void }) {
  const [rows, setRows] = useState<BoardRow[] | null | undefined>(undefined);
  useEffect(() => {
    fetchLeaderboard().then(setRows);
  }, [showOnBoard]);

  if (!cloudEnabled) return <div className="panel">The leaderboard isn't configured on this deployment.</div>;
  const me = session?.user.user_metadata?.user_name as string | undefined;

  return (
    <>
      <a href="#/" className="back">← Map</a>
      <h1>🏆 Leaderboard</h1>
      <p className="muted small">
        Top 50 by XP. Signed-in players only: GitHub username, avatar, XP and challenges solved are shown. Scores are
        graded in your browser, so treat this as bragging rights, not a certification.
      </p>
      {session ? (
        <label className="check">
          <input
            type="checkbox"
            checked={showOnBoard}
            onChange={(e) => {
              onToggle(e.target.checked);
              setShowOnBoard(session.user.id, e.target.checked);
            }}
          />{' '}
          Show me on the leaderboard
        </label>
      ) : (
        <button className="btn primary" onClick={onSignIn}>Sign in with GitHub to join</button>
      )}
      {rows === undefined && <p className="muted">Loading…</p>}
      {rows === null && <p className="muted">Couldn't load the leaderboard right now.</p>}
      {rows && rows.length === 0 && <p className="muted">No one yet. Be the first!</p>}
      {rows && rows.length > 0 && (
        <div className="list board">
          {rows.map((r, i) => (
            <div key={r.username + i} className={`row ${r.username === me ? 'me' : ''}`}>
              <span className="pos">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
              {r.avatar_url && <img src={r.avatar_url} alt="" width={28} height={28} className="avatar" />}
              <span className="grow">
                <b>{r.username}</b> <span className="muted small">· {rankFor(r.xp).name}</span>
              </span>
              <span className="small muted">{r.solved_count} solved</span>
              <b>{r.xp} XP</b>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
