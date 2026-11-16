import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { SearchField } from './SearchField';

afterEach(() => vi.useRealTimers());

describe('SearchField', () => {
  it('debounces onChange by 300ms and emits only the last value', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderWithProviders(<SearchField onChange={onChange} />);
    const input = screen.getByRole('searchbox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'a' } });
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.change(input, { target: { value: 'ab' } });
    act(() => { vi.advanceTimersByTime(299); });
    expect(onChange).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('ab');
  });

  it('does not emit on mount', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderWithProviders(<SearchField onChange={onChange} defaultValue="x" />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clear button empties the field and emits immediately', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderWithProviders(<SearchField onChange={onChange} defaultValue="abc" />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  });

  it('cancels a pending emit on unmount', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { unmount } = renderWithProviders(<SearchField onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'q' } });
    unmount();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onChange).not.toHaveBeenCalled();
  });
});
