import { PackSchema, type Challenge, type Pack } from './schema';

const raw = import.meta.glob('../../packs/[!_]*.yaml', { eager: true, import: 'default' }) as Record<string, unknown>;

export function loadPacks(): { packs: Pack[]; errors: { file: string; message: string }[] } {
  const packs: Pack[] = [];
  const errors: { file: string; message: string }[] = [];
  for (const [file, data] of Object.entries(raw)) {
    const r = PackSchema.safeParse(data);
    if (r.success) packs.push(r.data);
    else errors.push({ file, message: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n') });
  }
  packs.sort((a, b) => a.title.localeCompare(b.title));
  return { packs, errors };
}

export const rawPackFiles = raw;

export function allChallenges(packs: Pack[]): (Challenge & { packId: string })[] {
  return packs.flatMap((p) => p.challenges.map((c) => ({ ...c, packId: p.id })));
}
