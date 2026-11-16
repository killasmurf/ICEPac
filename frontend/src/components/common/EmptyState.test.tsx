import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import { renderWithProviders } from '../../test/renderWithProviders';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title, description, icon and action', () => {
    renderWithProviders(
      <EmptyState icon={<InboxOutlined data-testid="icon" />} title="Nothing here" description="Add one" action={<button>Add</button>} />,
    );
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByText('Add one')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});
