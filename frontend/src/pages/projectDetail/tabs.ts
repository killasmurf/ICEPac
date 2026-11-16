export const PROJECT_TABS = ['wbs', 'summary', 'risks', 'imports'] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];
export const DEFAULT_TAB: ProjectTab = 'wbs';

/** Unknown, missing or tampered values fall back to the default tab. */
export function parseTab(value: string | null | undefined): ProjectTab {
  return (PROJECT_TABS as readonly string[]).includes(value ?? '') ? (value as ProjectTab) : DEFAULT_TAB;
}

/** Parse the `wbs` search param into a positive integer id. */
export function parseWbsId(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

/** Map of WBS id to PERT estimate from the estimation summary. */
export function pertByWbsId(summaries: { wbs_id: number; total_pert_estimate: number }[] | undefined) {
  const out: Record<number, number> = {};
  for (const s of summaries ?? []) out[s.wbs_id] = s.total_pert_estimate;
  return out;
}
