import { useQuery } from '@tanstack/react-query';
import { projectQuery } from '../../api/queries';
import { getProjectEstimation } from '../../api/estimation';
import { configApi, resourcesApi, suppliersApi } from '../../api/admin';

const isValid = (id: number) => Number.isFinite(id) && id > 0;

export function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null)?.response?.status === 404;
}

// Shares its key and fetch with the shell's breadcrumb lookup (api/queries.ts): one request per project.
export function useProject(id: number) {
  return useQuery({
    ...projectQuery(id),
    enabled: isValid(id),
    // The page renders its own not-found / retry state, so skip the global toast.
    meta: { silent: true },
    retry: (count, error) => !isNotFound(error) && count < 1,
  });
}

export function useProjectEstimation(id: number, enabled = true) {
  return useQuery({
    queryKey: ['projects', id, 'estimation'],
    queryFn: () => getProjectEstimation(id),
    enabled: enabled && isValid(id),
    // Stat cards fall back to a dash; the Summary tab reports its own failures.
    meta: { silent: true },
  });
}

export interface CodeDescription {
  code: string;
  description: string;
}
export interface CodeWeight extends CodeDescription {
  weight: number;
}
export interface ReferenceData {
  /** `supplier_code` is the resource's default supplier, used to pre-fill the assignment form. */
  resources: (CodeDescription & { supplier_code: string | null })[];
  suppliers: { code: string; name: string }[];
  costTypes: CodeDescription[];
  regions: CodeDescription[];
  businessAreas: CodeDescription[];
  estimatingTechniques: CodeDescription[];
  riskCategories: CodeDescription[];
  probabilityLevels: CodeWeight[];
  severityLevels: CodeWeight[];
}

type Item = { code?: string; description?: string; weight?: number };
const plain = (items: Item[]): CodeDescription[] =>
  items.map((i) => ({ code: i.code ?? '', description: i.description ?? '' }));
const weighted = (items: Item[]): CodeWeight[] =>
  items.map((i) => ({ code: i.code ?? '', description: i.description ?? '', weight: i.weight || 0 }));

/**
 * Every signed-in user may read these lists (the API only restricts writes), so nothing here is role-gated.
 * Each list loads independently: one failing request leaves that dropdown empty instead of blanking every form.
 */
export async function loadReferenceData(): Promise<ReferenceData> {
  const active = { is_active: true };
  const items = <T>(p: Promise<{ items: T[] }>) => p.then((r) => r.items).catch((): T[] => []);
  const [resources, suppliers, costTypes, regions, businessAreas, techniques, riskCategories, probability, severity] =
    await Promise.all([
      items(resourcesApi.list({ ...active, limit: 1000 })),
      items(suppliersApi.list({ ...active, limit: 1000 })),
      items(configApi.listItems('cost-types', active)),
      items(configApi.listItems('regions', active)),
      items(configApi.listItems('business-areas', active)),
      items(configApi.listItems('estimating-techniques', active)),
      items(configApi.listItems('risk-categories', active)),
      items(configApi.listItems('probability-levels', active)),
      items(configApi.listItems('severity-levels', active)),
    ]);
  return {
    resources: resources.map((r) => ({
      code: r.resource_code,
      description: r.description,
      supplier_code: r.supplier_code ?? null,
    })),
    suppliers: suppliers.map((s) => ({ code: s.supplier_code ?? '', name: s.name })),
    costTypes: plain(costTypes),
    regions: plain(regions),
    businessAreas: plain(businessAreas),
    estimatingTechniques: plain(techniques),
    riskCategories: plain(riskCategories),
    probabilityLevels: weighted(probability),
    severityLevels: weighted(severity),
  };
}

/** Dropdown data for the estimation forms. Optional: the forms still work with empty lists if it fails. */
export function useReferenceData(enabled: boolean) {
  return useQuery({
    queryKey: ['reference', 'estimation-lookups'],
    queryFn: loadReferenceData,
    enabled,
    staleTime: 5 * 60_000,
    meta: { silent: true },
  });
}
