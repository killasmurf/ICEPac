/**
 * ExportOptions - split button (PDF default, menu for XLSX, DOCX, CSV) that downloads the generated report.
 */
import React, { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import { reportsApi, saveBlob, type ExportFormat, type ReportRequest } from '../../api/reports';
import { useToast } from '../feedback/ToastProvider';

interface ExportOptionsProps {
  /** The request that produced the previewed result. */
  request: ReportRequest | null;
  disabled?: boolean;
}

const FORMATS: { format: ExportFormat; label: string; hint: string }[] = [
  { format: 'pdf', label: 'PDF', hint: 'Formatted document' },
  { format: 'xlsx', label: 'XLSX', hint: 'Excel workbook' },
  { format: 'docx', label: 'DOCX', hint: 'Word document' },
  { format: 'csv', label: 'CSV', hint: 'Plain data' },
];

export default function ExportOptions({ request, disabled }: ExportOptionsProps) {
  const toast = useToast();
  const groupRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = anchor !== null;
  const [pending, setPending] = useState<ExportFormat | null>(null);

  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) => {
      if (!request) throw new Error('No report to export');
      return reportsApi.export({ ...request, export_format: format });
    },
    onMutate: (format) => setPending(format),
    onSuccess: ({ blob, filename }, format) => {
      saveBlob(blob, filename);
      toast.success(`Exported ${filename} (${format.toUpperCase()})`);
    },
    onSettled: () => setPending(null),
  });

  const busy = exportMutation.isPending;
  const blocked = disabled || !request || busy;
  const run = (format: ExportFormat) => {
    setAnchor(null);
    exportMutation.mutate(format);
  };

  return (
    <>
      <ButtonGroup ref={groupRef} variant="outlined" aria-label="Export report" disabled={blocked}>
        <Button
          onClick={() => run('pdf')}
          aria-busy={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : <FileDownloadOutlined />}
        >
          {busy ? `Exporting ${pending?.toUpperCase() ?? ''}` : 'Export PDF'}
        </Button>
        <Tooltip title={blocked ? '' : 'Choose export format'}>
          <Button
            size="small"
            aria-label="Choose export format"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setAnchor(groupRef.current)}
          >
            <ArrowDropDown />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <Menu anchorEl={anchor} open={open} onClose={() => setAnchor(null)}>
        {FORMATS.map((f) => (
          <MenuItem key={f.format} onClick={() => run(f.format)}>
            <ListItemText primary={f.label} secondary={f.hint} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
