import { useEffect, useRef, useState } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';

export const SEARCH_DEBOUNCE_MS = 300;

export interface SearchFieldProps {
  /** Receives the debounced value (300ms after the last keystroke). Clearing fires immediately. */
  onChange: (value: string) => void;
  /** Initial text. */
  defaultValue?: string;
  placeholder?: string;
  /** Accessible name. Default "Search". */
  label?: string;
  fullWidth?: boolean;
}

export function SearchField({ onChange, defaultValue = '', placeholder = 'Search', label = 'Search', fullWidth }: SearchFieldProps) {
  const [text, setText] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  const handle = (value: string) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(value), SEARCH_DEBOUNCE_MS);
  };
  const clear = () => {
    setText('');
    clearTimeout(timer.current);
    latest.current('');
  };

  return (
    <TextField
      size="small"
      type="search"
      value={text}
      placeholder={placeholder}
      fullWidth={fullWidth}
      onChange={(e) => handle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && text) clear();
      }}
      slotProps={{
        htmlInput: { 'aria-label': label },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: text ? (
            <InputAdornment position="end">
              <IconButton size="small" aria-label="Clear search" onClick={clear} edge="end">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
    />
  );
}

export default SearchField;
