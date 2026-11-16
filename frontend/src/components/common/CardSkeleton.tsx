import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';

export interface CardSkeletonProps {
  /** Number of body text lines. Default 3. */
  lines?: number;
}

export function CardSkeleton({ lines = 3 }: CardSkeletonProps) {
  return (
    <Card aria-busy="true" aria-label="Loading">
      <CardContent>
        <Skeleton animation="wave" variant="text" width="40%" height={28} />
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} animation="wave" variant="text" width={i === lines - 1 ? '60%' : '100%'} />
        ))}
      </CardContent>
    </Card>
  );
}

export default CardSkeleton;
