import { useQuery } from '@tanstack/react-query';
import { getProject } from '../../api/projects';
import { getProjectEstimation } from '../../api/estimation';
import { configApi, resourcesApi, suppliersApi } from '../../api/admin';

const isValid = (id: number) => Number.isFinite(id) && id > 0;

export function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null)?.response?.status === 404;
}

// NOTE: not ['projects', id]: the shell's breadcrumb hook caches only the project *name* under that key.
// This key sits under the same prefix, so invalidating ['projects', id] still refreshes it.
export function useProject(id: number) {
  return useQuery({
    queryKey: ['projects', id, 'detail'],
    queryFn: () => getProject(id),
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
  resources: CodeDescription[];
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

export async function loadReferenceData(): Promise<ReferenceData> {
  const active = { is_active: true };
  const [resources, suppliers, costTypes, regions, businessAreas, techniques, riskCategories, probability, severity] =
    await Promise.all([
      resourcesApi.list({ ...active, limit: 1000 }),
      suppliersApi.list({ ...active, limit: 1000 }),
      configApi.listItems('cost-types', active),
      configApi.listItems('regions', active),
      configApi.listItems('business-areas', active),
      configApi.listItems('estimating-techniques', active),
      configApi.listItems('risk-categories', active),
      configApi.listItems('probability-levels', active),
      configApi.listItems('severity-levels', active),
    ]);
  return {
    resources: resources.items.map((r) => ({ code: r.resource_code, description: r.description })),
    suppliers: suppliers.items.map((s) => ({ code: s.supplier_code ?? '', name: s.name })),
    costTypes: plain(costTypes.items),
    regions: plain(regions.items),
    businessAreas: plain(businessAreas.items),
    estimatingTechniques: plain(techniques.items),
    riskCategories: plain(riskCategories.items),
    probabilityLevels: weighted(probability.items),
    severityLevels: weighted(severity.items),
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
