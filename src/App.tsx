import { useEffect, useMemo, useState } from 'react';
import { loadPacks } from './engine/packs';
import { loadProgress, mergeProgress, rankFor, record, saveProgress, tierMastery, totalXp, type Progress } from './engine/progress';
import { addConfidence, loadConfidence, saveConfidence, type ConfidenceEntry } from './engine/calibration';
import { loadReview, saveReview, updateReview, type ReviewState } from './engine/review';
import { Profile } from './ui/Profile';
import { cloudEnabled, pullProgress, pushProgress, signInWithGitHub, signOut, supabase, type Session } from './engine/cloud';
import { Leaderboard } from './ui/Leaderboard';
import type { Challenge } from './engine/schema';
import { Home } from './ui/Home';
import { PackView } from './ui/PackView';
import { ChallengeView, type AttemptMeta } from './ui/ChallengeView';
import { Glossary } from './ui/Glossary';
import { TierView } from './ui/TierView';
import { TIERS, type Tier } from './engine/taxonomy';

const REPO = 'https://github.com/sai337/evalquest';

function useHash() {
  const [hash, setHash] = useState(() => location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => {
      setHash(location.hash.slice(1) || '/');
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const { packs, errors } = useMemo(loadPacks, []);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [confLog, setConfLog] = useState<ConfidenceEntry[]>(loadConfidence);
  const [review, setReview] = useState<ReviewState>(loadReview);
  const mastery = useMemo(() => tierMastery(packs, progress), [packs, progress]);
  const route = useHash();

  const [toast, setToast] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showOnBoard, setShowOnBoard] = useState(true);

  // Sign-in state + one-time merge of this browser's progress with the cloud copy.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);
    return () => data.subscription.unsubscribe();
  }, []);
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    pullProgress(userId).then((remote) => {
      setProgress((local) => {
        const merged = remote ? mergeProgress(local, remote.progress) : local;
        saveProgress(merged);
        pushProgress(userId, merged);
        return merged;
      });
      if (remote) setShowOnBoard(remote.showOnBoard);
    });
  }, [userId]);
  const signIn = async () => {
    const { error } = await signInWithGitHub();
    if (error) setToast(`Sign-in unavailable: ${error}`);
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const onScore = (ch: Challenge, score: number, meta: AttemptMeta) => {
    if (meta.review) {
      const r = updateReview(review, ch.id, meta.review === 'correct');
      if (r !== review) { saveReview(r); setReview(r); }
    }
    if (meta.confidence !== null) {
      const log = addConfidence(confLog, { id: ch.id, p: meta.confidence, correct: meta.correct, at: new Date().toISOString() });
      saveConfidence(log);
      setConfLog(log);
    }
    const next = record(progress, ch, score);
    if (next === progress) return;
    const before = totalXp(progress), after = totalXp(next);
    const r0 = rankFor(before).name, r1 = rankFor(after).name;
    setToast(r1 !== r0 ? `🎉 Rank up: ${r1}! (+${after - before} XP)` : `+${after - before} XP`);
    saveProgress(next);
    setProgress(next);
    if (userId) pushProgress(userId, next);
  };
  const resetProgress = () => {
    if (!window.confirm('Reset all progress?')) return;
    const empty = { solved: {} };
    saveProgress(empty);
    setProgress(empty);
    saveReview({}); setReview({});
    saveConfidence([]); setConfLog([]);
    if (userId) pushProgress(userId, empty);
  };

  const [, view, arg] = route.split('/');
  let body;
  if (view === 'pack') {
    const pack = packs.find((p) => p.id === arg);
    body = pack ? <PackView pack={pack} progress={progress} /> : <NotFound />;
  } else if (view === 'c') {
    const pack = packs.find((p) => p.challenges.some((c) => c.id === arg));
    const ch = pack?.challenges.find((c) => c.id === arg);
    const ti = ch ? TIERS.indexOf(ch.tier) : 0;
    const below = TIERS.slice(0, ti).reverse().find((t) => mastery[t].total > 0);
    const gate = ch ? { unlocked: mastery[ch.tier].unlocked, below, mastery: below ? mastery[below].mastery : 1 } : { unlocked: true, mastery: 1 };
    body = pack && ch ? <ChallengeView key={ch.id} pack={pack} packs={packs} challenge={ch} progress={progress} gate={gate} onScore={onScore} /> : <NotFound />;
  } else if (view === 'tier' && TIERS.includes(arg as Tier)) {
    body = <TierView tier={arg as Tier} packs={packs} progress={progress} mastery={mastery} />;
  } else if (view === 'profile') {
    body = <Profile packs={packs} progress={progress} mastery={mastery} review={review} confLog={confLog} />;
  } else if (view === 'leaderboard') {
    body = <Leaderboard session={session} showOnBoard={showOnBoard} onToggle={setShowOnBoard} onSignIn={signIn} />;
  } else if (view === 'glossary') {
    body = <Glossary />;
  } else {
    body = <Home packs={packs} progress={progress} mastery={mastery} review={review} onReset={resetProgress} />;
  }

  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand">
          <img src="/favicon.svg" alt="" width={26} height={26} /> EvalQuest
        </a>
        <nav>
          {cloudEnabled && <a href="#/leaderboard">🏆 Board</a>}
          <a href="#/profile">Practice</a>
          <a href="#/glossary">Glossary</a>
          <a href={REPO} target="_blank" rel="noreferrer">★ Star</a>
          {cloudEnabled &&
            (session ? (
              <button className="linkbtn" onClick={() => signOut()} title="Sign out">
                {session.user.user_metadata?.avatar_url && <img src={session.user.user_metadata.avatar_url} alt="" width={22} height={22} className="avatar" />}{' '}
                {session.user.user_metadata?.user_name ?? 'Signed in'}
              </button>
            ) : (
              <button className="linkbtn" onClick={signIn}>Sign in</button>
            ))}
        </nav>
      </header>
      {errors.length > 0 && (
        <div className="panel bad wrap">
          <b>Some packs failed validation:</b>
          {errors.map((e) => (
            <pre key={e.file}>{e.file}{'\n'}{e.message}</pre>
          ))}
        </div>
      )}
      <main className="wrap">{body}</main>
      {toast && <div className="toast" role="status">{toast}</div>}
      <footer className="wrap foot">
        Free and open source · no tracking · progress saved in your browser (optional GitHub sign-in to sync and join the leaderboard) ·{' '}
        <a href={`${REPO}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">add a scenario pack</a>
      </footer>
    </>
  );
}

function NotFound() {
  return (
    <div className="panel">
      Not found. <a href="#/">Back to the map</a>
    </div>
  );
}
