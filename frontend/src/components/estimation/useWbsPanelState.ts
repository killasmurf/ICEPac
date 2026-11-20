import { useCallback, useState } from 'react';
import type { Assignment, Risk } from '../../api/estimation';
import type { AssignmentFormDraft } from './AssignmentForm';
import type { RiskFormDraft } from './RiskForm';

export type WbsDeleteTarget = { kind: 'assignment'; item: Assignment } | { kind: 'risk'; item: Risk } | null;

/** Everything in WBSDetailPanel that the user can lose by the panel remounting (layout change at the md breakpoint). */
export interface WbsPanelUiState {
  tab: number;
  assignmentFormOpen: boolean;
  editingAssignment: Assignment | null;
  /** Typed values of the open assignment form; null when the form is closed or untouched. */
  assignmentDraft: AssignmentFormDraft | null;
  riskFormOpen: boolean;
  editingRisk: Risk | null;
  riskDraft: RiskFormDraft | null;
  deleteTarget: WbsDeleteTarget;
}

export const INITIAL_WBS_PANEL_STATE: WbsPanelUiState = {
  tab: 0,
  assignmentFormOpen: false,
  editingAssignment: null,
  assignmentDraft: null,
  riskFormOpen: false,
  editingRisk: null,
  riskDraft: null,
  deleteTarget: null,
};

export type WbsPanelUiPatch = (patch: Partial<WbsPanelUiState>) => void;

/** Holds the panel state in a component that stays mounted across layout changes. */
export function useWbsPanelState() {
  const [state, setState] = useState<WbsPanelUiState>(INITIAL_WBS_PANEL_STATE);
  const patch = useCallback<WbsPanelUiPatch>((p) => setState((prev) => ({ ...prev, ...p })), []);
  const reset = useCallback(() => setState(INITIAL_WBS_PANEL_STATE), []);
  return { state, patch, reset };
}
