import React, { useCallback, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useQueryClient } from '@tanstack/react-query';
import type { WBSItem } from '../../api/projects';
import EmptyState from '../../components/common/EmptyState';
import WBSDetailPanel from '../../components/estimation/WBSDetailPanel';
import WBSTree from '../../components/project/WBSTree';
import { useWbsTree } from '../../components/project/useWbsTree';
import { findNode } from '../../components/project/wbsTreeLogic';
import { invalidateEstimation } from '../../components/estimation/queryKeys';
import { useWbsPanelState } from '../../components/estimation/useWbsPanelState';
import type { ReferenceData } from './useProjectData';

const SplitGroup = styled(Group)({ height: '100%', width: '100%' });
const Handle = styled(Separator)(({ theme }) => {
  const p = (theme.vars ?? theme).palette;
  return {
    width: 6,
    flexShrink: 0,
    backgroundColor: p.divider,
    transition: 'background-color 120ms',
    '&[data-separator="hover"], &[data-separator="active"]': { backgroundColor: p.secondary.main },
    '&:focus-visible': { outline: `2px solid ${p.secondary.main}`, outlineOffset: -2 },
  };
});

export interface WBSWorkspaceProps {
  projectId: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  pertTotals: Record<number, number>;
  reference: ReferenceData | undefined;
  onOpenImports: () => void;
}

/**
 * Tree plus detail. At md and above the tree and the estimate editor (WBSDetailPanel, inline) sit in a
 * resizable split; below md the tree is full width and the editor opens in a drawer.
 */
const WBSWorkspace: React.FC<WBSWorkspaceProps> = ({
  projectId,
  selectedId,
  onSelect,
  pertTotals,
  reference,
  onOpenImports,
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const queryClient = useQueryClient();
  const { data } = useWbsTree(projectId);
  const [detailOpen, setDetailOpen] = useState(selectedId !== null);
  // The panel remounts when the layout crosses the md breakpoint; its tab, open forms and typed drafts live here.
  const { state: panelUi, patch: patchPanelUi, reset: resetPanelUi } = useWbsPanelState();

  const selected = useMemo(
    () => (selectedId !== null && data ? findNode(data.items, selectedId) : undefined),
    [data, selectedId],
  );

  const handleSelect = useCallback(
    (node: WBSItem) => {
      onSelect(node.id);
      setDetailOpen(true);
    },
    [onSelect],
  );

  const handleClose = useCallback(() => {
    setDetailOpen(false);
    resetPanelUi();
  }, [resetPanelUi]);

  // Refresh the tree (approval status, PERT totals) and the project estimation after every change in the panel.
  const handleChanged = useCallback(() => {
    void invalidateEstimation(queryClient, projectId);
  }, [queryClient, projectId]);

  const panelProps = {
    onClose: handleClose,
    onChanged: handleChanged,
    uiState: panelUi,
    onUiStateChange: patchPanelUi,
    projectId,
    wbs: selected ?? null,
    resources: reference?.resources,
    suppliers: reference?.suppliers,
    costTypes: reference?.costTypes,
    regions: reference?.regions,
    businessAreas: reference?.businessAreas,
    estimatingTechniques: reference?.estimatingTechniques,
    riskCategories: reference?.riskCategories,
    probabilityLevels: reference?.probabilityLevels,
    severityLevels: reference?.severityLevels,
  };
  const panelOpen = detailOpen && selected !== undefined;

  const tree = (
    <WBSTree
      projectId={projectId}
      onNodeClick={handleSelect}
      selectedId={selectedId}
      pertTotals={pertTotals}
      emptyAction={
        <Button variant="contained" color="secondary" onClick={onOpenImports}>
          Import a project file
        </Button>
      }
    />
  );

  return (
    <Card sx={{ overflow: 'hidden' }}>
      {isDesktop ? (
        <Box sx={{ height: 'clamp(480px, calc(100vh - 220px), 800px)' }}>
          <SplitGroup orientation="horizontal" id="wbs-split">
            <Panel id="wbs-tree" minSize={280} defaultSize="32%">
              {tree}
            </Panel>
            <Handle id="wbs-handle" aria-label="Resize tree and detail panes" />
            <Panel id="wbs-detail" minSize={280}>
              <Box sx={{ height: '100%', overflowY: 'auto' }}>
                {panelOpen ? (
                  <WBSDetailPanel {...panelProps} variant="inline" open />
                ) : (
                  <Box sx={{ p: 3 }}>
                    <EmptyState
                      icon={<TouchAppOutlinedIcon />}
                      title="Select a WBS item"
                      description="Choose an item in the tree to see its estimate, risks and approval."
                    />
                  </Box>
                )}
              </Box>
            </Panel>
          </SplitGroup>
        </Box>
      ) : (
        tree
      )}

      {!isDesktop && <WBSDetailPanel {...panelProps} open={panelOpen} />}
    </Card>
  );
};

export default WBSWorkspace;
