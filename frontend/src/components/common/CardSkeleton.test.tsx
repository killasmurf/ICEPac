import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { CardSkeleton } from './CardSkeleton';

describe('CardSkeleton', () => {
  it('is marked busy and uses wave skeletons', () => {
    const { container } = renderWithProviders(<CardSkeleton lines={2} />);
    expect(screen.getByLabelText('Loading')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.MuiSkeleton-wave')).toHaveLength(3);
  });
});
