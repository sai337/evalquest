/** Optional cloud features (GitHub sign-in, sync, leaderboard). Disabled when env vars are absent. */
import { createClient, type Session } from '@supabase/supabase-js';
import { totalXp, type Progress } from './progress';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true } }) : null;
export const cloudEnabled = supabase !== null;
export type { Session };

export async function signInWithGitHub() {
  if (!supabase) return { error: 'Cloud features are not configured.' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: location.origin + location.pathname },
  });
  return { error: error?.message };
}

export async function signOut() {
  await supabase?.auth.signOut();
}

export async function pullProgress(userId: string): Promise<{ progress: Progress; showOnBoard: boolean } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('players').select('solved, show_on_leaderboard').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return { progress: { solved: data.solved ?? {} }, showOnBoard: data.show_on_leaderboard };
}

export async function pushProgress(userId: string, progress: Progress) {
  if (!supabase) return;
  await supabase.from('players').upsert({ user_id: userId, xp: totalXp(progress), solved: progress.solved });
}

export async function setShowOnBoard(userId: string, show: boolean) {
  if (!supabase) return;
  await supabase.from('players').update({ show_on_leaderboard: show }).eq('user_id', userId);
}

export interface BoardRow { username: string; avatar_url: string | null; xp: number; solved_count: number; updated_at: string }

export async function fetchLeaderboard(): Promise<BoardRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_leaderboard', { max_rows: 50 });
  return error ? null : (data as BoardRow[]);
}
