// What a #4471 report shows, not what intake guessed or what its subject says. causes.ts places a report
// by its tenant; a report whose date moved by one day (desk-notes.json) is a problem of its own,
// because a day/month swap cannot move a date by one day. The desk counts those where they are filed
// (by tenant, see readAs in causes.ts), so they count under their cause and again as `one-day`.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'one-day'];

export const PROBLEM_TITLE: Record<Problem, string> = {
  parser: 'Shared parser reads day-first dates month first',
  hint: 'booking-v3 hint says MM/DD/YYYY, the form reads DD/MM',
  'one-day': 'Dates shift by one day across time zones',
};

export function problemsOf(r: Report, t: Tenant | undefined, oneDay: readonly string[]): Problem[] {
  const filed = causeOf(r, t);
  return [...(filed ? [filed] : []), ...(oneDay.includes(r.id) ? (['one-day'] as const) : [])];
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

export function splitTicket(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDay: readonly string[],
): { merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const by = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of merged) {
    const ps = problemsOf(r, tenantOf(r), oneDay);
    for (const p of ps.length ? ps : (['unplaced'] as const)) by.set(p, [...(by.get(p) ?? []), r]);
  }
  const groups = [...by.entries()].map(([problem, rs]) => {
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports: rs,
      tenants: new Set(rs.map((r) => r.tenant)).size,
      channels: tally(rs, (r) => r.channel),
      taggedAs: tally(rs, (r) => r.meta.intakeTag),
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
    };
  });
  const order = (p: ProblemGroup['problem']) => (p === 'unplaced' ? PROBLEMS.length : PROBLEMS.indexOf(p));
  return { merged, groups: groups.sort((a, b) => order(a.problem) - order(b.problem)) };
}
