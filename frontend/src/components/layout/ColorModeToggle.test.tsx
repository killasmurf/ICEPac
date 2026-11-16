import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useColorScheme } from '@mui/material/styles';
import { renderWithProviders } from '../../test/renderWithProviders';
import ColorModeToggle from './ColorModeToggle';

const ModeProbe = () => <output data-testid="mode">{useColorScheme().mode}</output>;

describe('ColorModeToggle', () => {
  beforeEach(() => window.localStorage.setItem('mui-mode', 'light'));
  afterEach(() => window.localStorage.clear());

  it('cycles light, dark, system', async () => {
    const user = userEvent.setup();
    renderWithProviders(<><ColorModeToggle /><ModeProbe /></>);
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    const button = screen.getByRole('button', { name: 'Switch colour mode' });
    await user.click(button);
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    await user.click(button);
    expect(screen.getByTestId('mode')).toHaveTextContent('system');
  });
});
