import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

export interface TableSkeletonProps {
  /** Body rows. Default 5. */
  rows?: number;
  /** Columns. Default 4. */
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <Box aria-busy="true" aria-label="Loading table" role="status" sx={{ width: '100%' }}>
      {Array.from({ length: rows + 1 }, (_, r) => (
        <Box
          key={r}
          data-testid="skeleton-row"
          sx={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} animation="wave" variant="text" height={r === 0 ? 16 : 20} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export default TableSkeleton;
