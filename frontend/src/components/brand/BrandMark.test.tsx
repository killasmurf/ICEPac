import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { BrandMark, AdalexLogo } from './BrandMark';

describe('BrandMark', () => {
  it('requests the white files on a dark surface', () => {
    renderWithProviders(<BrandMark variant="dark" />);
    expect(document.querySelector('img')?.getAttribute('src')).toBe('/brand/adalex-mark-white.png');
    expect(screen.getByText('ICEPac')).toBeInTheDocument();
    expect(screen.getByText('by Adalex Consulting')).toBeInTheDocument();
  });

  it('requests the blue files on a light surface', () => {
    renderWithProviders(<BrandMark variant="light" />);
    expect(document.querySelector('img')?.getAttribute('src')).toBe('/brand/adalex-mark.png');
  });

  it('collapsed renders one image and no text', () => {
    renderWithProviders(<BrandMark variant="dark" collapsed />);
    expect(document.querySelectorAll('img')).toHaveLength(1);
    expect(screen.getByAltText('ICEPac by Adalex Consulting')).toBeInTheDocument();
    expect(screen.queryByText('ICEPac')).not.toBeInTheDocument();
  });

  it('falls back to text when the image errors', () => {
    renderWithProviders(<BrandMark variant="light" />);
    fireEvent.error(document.querySelector('img') as HTMLImageElement);
    expect(document.querySelectorAll('img')).toHaveLength(0);
    expect(screen.getByText('ICEPac')).toBeInTheDocument();
  });
});

describe('AdalexLogo', () => {
  it('picks the file by surface and sets alt text', () => {
    const { rerender } = renderWithProviders(<AdalexLogo variant="dark" />);
    expect(screen.getByAltText('Adalex Consulting')).toHaveAttribute('src', '/brand/adalex-logo-white.png');
    rerender(<AdalexLogo variant="light" />);
    expect(screen.getByAltText('Adalex Consulting')).toHaveAttribute('src', '/brand/adalex-logo.png');
  });

  it('renders nothing when the image errors', () => {
    renderWithProviders(<AdalexLogo variant="light" />);
    fireEvent.error(screen.getByAltText('Adalex Consulting'));
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
});
