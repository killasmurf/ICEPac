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

export interface ProjectRisk {
  id: number;
  project_id: number;
  title: string;
  status: string;
  risk_category_code: string | null;
  risk_cost: string; // Decimal serialized as string by FastAPI
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

const base = (projectId: number) => `/projects/${projectId}/risks`;

export const projectRiskApi = {
  list: (projectId: number) =>
    client
      .get<ProjectRiskListResponse>(base(projectId))
      .then((r) => r.data),

  totalCost: (projectId: number) =>
    client
      .get<{ total_risk_cost: number }>(`${base(projectId)}/total-cost`)
      .then((r) => r.data),

  get: (projectId: number, riskId: number) =>
    client
      .get<ProjectRisk>(`${base(projectId)}/${riskId}`)
      .then((r) => r.data),

  create: (projectId: number, data: ProjectRiskCreate) =>
    client
      .post<ProjectRisk>(base(projectId), data)
      .then((r) => r.data),

  update: (projectId: number, riskId: number, data: ProjectRiskUpdate) =>
    client
      .put<ProjectRisk>(`${base(projectId)}/${riskId}`, data)
      .then((r) => r.data),

  delete: (projectId: number, riskId: number) =>
    client.delete<{ ok: boolean }>(`${base(projectId)}/${riskId}`).then((r) => r.data),
};
