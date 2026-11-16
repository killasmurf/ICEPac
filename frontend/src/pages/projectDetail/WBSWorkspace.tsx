import React, { useCallback, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useQueryClient } from '@tanstack/react-query';
import type { WBSItem } from '../../api/projects';
import EmptyState from '../../components/common/EmptyState';
import StatusChip from '../../components/common/StatusChip';
import WBSDetailPanel from '../../components/estimation/WBSDetailPanel';
import WBSTree from '../../components/project/WBSTree';
import { useWbsTree } from '../../components/project/useWbsTree';
import { findNode } from '../../components/project/wbsTreeLogic';
import { formatCurrency, formatDate } from '../../utils/format';
import type { ReferenceData } from './useProjectData';

const SplitGroup = styled(Group)({ height: '100%', width: '100%' });
const Handle = styled(Separator)(({ theme }) => ({
  width: 6,
  flexShrink: 0,
  backgroundColor: theme.palette.divider,
  transition: 'background-color 120ms',
  '&[data-separator="hover"], &[data-separator="active"]': { backgroundColor: theme.palette.primary.main },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
}));

interface SummaryProps {
  node: WBSItem;
  pert: number | undefined;
  onOpen: () => void;
}

const NodeSummary: React.FC<SummaryProps> = ({ node, pert, onOpen }) => (
  <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Box>
      <Typography variant="caption" color="text.secondary" className="tabular-nums">
        {node.wbs_code ?? `WBS #${node.id}`}
      </Typography>
      <Typography variant="h5" component="h2">
        {node.wbs_title}
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      <StatusChip kind="approval" value={node.approval_status} />
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Start
        </Typography>
        <Typography variant="body2">{formatDate(node.schedule_start)}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Finish
        </Typography>
        <Typography variant="body2">{formatDate(node.schedule_finish)}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          PERT estimate
        </Typography>
        <Typography variant="body2" className="tabular-nums">
          {pert !== undefined ? formatCurrency(pert) : '—'}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Progress
        </Typography>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, node.percent_complete ?? 0))}
          aria-label="Percent complete"
          sx={{ mt: 1 }}
        />
      </Box>
    </Box>
    <Box>
      <Button variant="contained" color="secondary" onClick={onOpen}>
        Open estimate details
      </Button>
    </Box>
  </Box>
);

export interface WBSWorkspaceProps {
  projectId: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  pertTotals: Record<number, number>;
  reference: ReferenceData | undefined;
  onOpenImports: () => void;
}

/**
 * Tree plus detail. At md and above the tree and a node summary sit in a resizable split;
 * below md the tree is full width. The estimate editor (WBSDetailPanel) is a drawer in both cases.
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

  // The detail panel edits assignments, risks and approvals itself and has no change callback,
  // so refresh what depends on them when it closes.
  const handleClose = useCallback(() => {
    setDetailOpen(false);
    void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'wbs-tree'] });
    void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'estimation'] });
  }, [queryClient, projectId]);

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
            <Panel id="wbs-tree" minSize={280} defaultSize="42%">
              {tree}
            </Panel>
            <Handle id="wbs-handle" aria-label="Resize tree and detail panes" />
            <Panel id="wbs-detail" minSize={280}>
              <Box sx={{ height: '100%', overflowY: 'auto' }}>
                {selected ? (
                  <NodeSummary node={selected} pert={pertTotals[selected.id]} onOpen={() => setDetailOpen(true)} />
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

      <WBSDetailPanel
        open={detailOpen && selected !== undefined}
        onClose={handleClose}
        projectId={projectId}
        wbs={selected ?? null}
        resources={reference?.resources}
        suppliers={reference?.suppliers}
        costTypes={reference?.costTypes}
        regions={reference?.regions}
        businessAreas={reference?.businessAreas}
        estimatingTechniques={reference?.estimatingTechniques}
        riskCategories={reference?.riskCategories}
        probabilityLevels={reference?.probabilityLevels}
        severityLevels={reference?.severityLevels}
      />
    </Card>
  );
};

export default WBSWorkspace;
