/**
 * Project-level risk register API client.
 *
 * Mirrors the WBS-scoped risk client in api/estimation.ts but for the
 * project-level cross-cutting risk register at
 *   GET /api/v1/projects/{project_id}/risks
 *
 * Distinct from WBS-scoped risks:
 *   - project_id is set; wbs_id is NULL (XOR invariant at the DB layer)
 *   - title is required (every project-level risk has a name)
 *   - status (open / mitigated / closed) is part of the lifecycle
 *
 * Endpoints:
 *   list       — GET    /projects/{project_id}/risks
 *   totalCost  — GET    /projects/{project_id}/risks/total-cost
 *   get        — GET    /projects/{project_id}/risks/{risk_id}
 *   create     — POST   /projects/{project_id}/risks
 *   update     — PUT    /projects/{project_id}/risks/{risk_id}
 *   delete     — DELETE /projects/{project_id}/risks/{risk_id}
 */
import client from './client';
import { toNumber, toNumberOr0 } from '../utils/number';

export interface ProjectRisk {
  id: number;
  project_id: number;
  title: string;
  status: string;
  risk_category_code: string | null;
  risk_cost: number; // Decimal arrives as a string; normalised to a number in this API layer
  probability_code: string | null;
  severity_code: string | null;
  mitigation_plan: string | null;
  date_identified: string;
  risk_exposure: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectRiskCreate {
  title: string;
  risk_cost?: number | string;
  risk_category_code?: string;
  probability_code?: string;
  severity_code?: string;
  mitigation_plan?: string;
  status?: string;
}

export interface ProjectRiskUpdate {
  title?: string;
  risk_cost?: number | string;
  risk_category_code?: string;
  probability_code?: string;
  severity_code?: string;
  mitigation_plan?: string;
  status?: string;
}

export interface ProjectRiskListResponse {
  items: ProjectRisk[];
  total: number;
}

type RawProjectRisk = Omit<ProjectRisk, 'risk_cost' | 'risk_exposure'> & {
  risk_cost: number | string | null | undefined;
  risk_exposure: number | string | null | undefined;
};

export function normalizeProjectRisk(raw: RawProjectRisk): ProjectRisk {
  return { ...raw, risk_cost: toNumberOr0(raw.risk_cost), risk_exposure: toNumber(raw.risk_exposure) };
}

const base = (projectId: number) => `/projects/${projectId}/risks`;

export const projectRiskApi = {
  list: (projectId: number) =>
    client
      .get<{ items: RawProjectRisk[]; total: number }>(base(projectId))
      .then((r): ProjectRiskListResponse => ({ ...r.data, items: r.data.items.map(normalizeProjectRisk) })),

  totalCost: (projectId: number) =>
    client
      .get<{ total_risk_cost: number | string }>(`${base(projectId)}/total-cost`)
      .then((r) => ({ ...r.data, total_risk_cost: toNumberOr0(r.data.total_risk_cost) })),

  get: (projectId: number, riskId: number) =>
    client
      .get<RawProjectRisk>(`${base(projectId)}/${riskId}`)
      .then((r) => normalizeProjectRisk(r.data)),

  create: (projectId: number, data: ProjectRiskCreate) =>
    client
      .post<RawProjectRisk>(base(projectId), data)
      .then((r) => normalizeProjectRisk(r.data)),

  update: (projectId: number, riskId: number, data: ProjectRiskUpdate) =>
    client
      .put<RawProjectRisk>(`${base(projectId)}/${riskId}`, data)
      .then((r) => normalizeProjectRisk(r.data)),

  delete: (projectId: number, riskId: number) =>
    client.delete<{ ok: boolean }>(`${base(projectId)}/${riskId}`).then((r) => r.data),
};
