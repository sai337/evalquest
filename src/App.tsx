import { useEffect, useMemo, useState } from 'react';
import { loadPacks } from './engine/packs';
import { loadProgress, record, saveProgress, type Progress } from './engine/progress';
import type { Challenge } from './engine/schema';
import { Home } from './ui/Home';
import { PackView } from './ui/PackView';
import { ChallengeView } from './ui/ChallengeView';
import { Glossary } from './ui/Glossary';

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
  const route = useHash();

  const onScore = (ch: Challenge, score: number) =>
    setProgress((p) => {
      const next = record(p, ch, score);
      saveProgress(next);
      return next;
    });

  const [, view, arg] = route.split('/');
  let body;
  if (view === 'pack') {
    const pack = packs.find((p) => p.id === arg);
    body = pack ? <PackView pack={pack} progress={progress} /> : <NotFound />;
  } else if (view === 'c') {
    const pack = packs.find((p) => p.challenges.some((c) => c.id === arg));
    const ch = pack?.challenges.find((c) => c.id === arg);
    body = pack && ch ? <ChallengeView key={ch.id} pack={pack} challenge={ch} progress={progress} onScore={onScore} /> : <NotFound />;
  } else if (view === 'glossary') {
    body = <Glossary />;
  } else {
    body = <Home packs={packs} progress={progress} />;
  }

  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand">
          <img src="/favicon.svg" alt="" width={26} height={26} /> EvalQuest
        </a>
        <nav>
          <a href="#/glossary">Glossary</a>
          <a href={REPO} target="_blank" rel="noreferrer">★ GitHub</a>
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
      <footer className="wrap foot">
        Free and open source · no accounts, no tracking · progress stays in your browser ·{' '}
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
