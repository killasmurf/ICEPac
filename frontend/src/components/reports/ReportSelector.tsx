/**
 * ReportSelector - report cards grouped by catalog category, with radio-group semantics.
 */
import React, { useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckCircle from '@mui/icons-material/CheckCircle';
import type { ReportCatalog, ReportType } from '../../api/reports';

interface ReportSelectorProps {
  catalog: ReportCatalog;
  selected: ReportType | null;
  onSelect: (type: ReportType) => void;
}

export default function ReportSelector({ catalog, selected, onSelect }: ReportSelectorProps) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const types = Object.values(catalog).flatMap((c) => c.reports.map((r) => r.type));
  // Roving tabindex: the selected card is the tab stop, or the first card when nothing is selected.
  const tabStop = selected && types.includes(selected) ? selected : types[0];

  const move = (from: string, delta: number) => {
    const next = types[(types.indexOf(from) + delta + types.length) % types.length];
    onSelect(next as ReportType);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, type: string) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        move(type, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        move(type, -1);
        break;
      case 'Home':
        e.preventDefault();
        move(types[types.length - 1], 1);
        break;
      case 'End':
        e.preventDefault();
        move(types[0], -1);
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        onSelect(type as ReportType);
        break;
    }
  };

  return (
    <Box role="radiogroup" aria-label="Report type" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {Object.entries(catalog).map(([catKey, cat]) => (
        <Box key={catKey} role="group" aria-labelledby={`report-cat-${catKey}`}>
          <Typography id={`report-cat-${catKey}`} variant="subtitle1" component="h3" sx={{ mb: 1.5 }}>
            {cat.label}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1.5 }}>
            {cat.reports.map((report) => {
              const isSelected = selected === report.type;
              return (
                <Box
                  key={report.type}
                  ref={(el: HTMLDivElement | null) => {
                    refs.current[report.type] = el;
                  }}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={report.type === tabStop ? 0 : -1}
                  onClick={() => onSelect(report.type as ReportType)}
                  onKeyDown={(e) => onKeyDown(e, report.type)}
                  sx={{
                    position: 'relative',
                    p: 2,
                    pr: 5,
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    border: 2,
                    borderStyle: 'solid',
                    borderColor: isSelected ? 'secondary.main' : 'divider',
                    cursor: 'pointer',
                    '&:hover': { borderColor: isSelected ? 'secondary.main' : 'text.secondary' },
                    '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main', outlineOffset: 2 },
                  }}
                >
                  <Typography variant="subtitle2" component="div">
                    {report.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                    {report.description}
                  </Typography>
                  {isSelected && (
                    <CheckCircle
                      aria-hidden="true"
                      fontSize="small"
                      sx={{ position: 'absolute', top: 12, right: 12, color: 'secondary.dark' }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
