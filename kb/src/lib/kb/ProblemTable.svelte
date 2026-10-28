<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { PROBLEM_TITLE, splitTicket, type Problem } from '#lib/kb/problems';

  // issues: where each problem is filed, problem → link.
  let { ticket, issues = {} }: { ticket: number; issues?: Partial<Record<Problem, string>> } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const counts = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
  const twice = $derived(split.merged.filter((r) => notes.oneDayMove.includes(r.id)).length);
  const issueNo = (href: string) => `#${href.split('/').pop()}`;
</script>

<p class="sum">
  <strong>{split.merged.length}</strong> reports merged into #{ticket} ·
  <strong>{split.groups.length}</strong>
  {split.groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>came in by</th><th>intake tagged</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      <tr class:unplaced={g.problem === 'unplaced'}>
        <td><code>{g.problem}</code>{#if g.problem !== 'unplaced'}<br /><span class="title">{PROBLEM_TITLE[g.problem]}</span>{/if}</td>
        <td><strong>{g.reports.length}</strong></td>
        <td>{g.tenants}</td>
        <td class="small">{counts(g.channels)}</td>
        <td class="small">{counts(g.taggedAs)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if g.problem !== 'unplaced' && issues[g.problem]}
            <a href={issues[g.problem]}>{issueNo(issues[g.problem] ?? '')}</a>
          {:else}
            <span class="none">no ticket</span>
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#if twice}
  <p class="small">{twice} reports read as a one-day move count twice: where the desk files them by tenant, and under <code>one-day</code>.</p>
{/if}

<style>
  .sum { font-size: 1.1rem; }
  .title { color: var(--muted); font-size: 0.85em; }
  .small { color: var(--muted); font-size: 0.85em; }
  .none, .unplaced td { color: var(--warn); }
</style>
