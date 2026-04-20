/**
 * SearchBar - Debounced search input component.
 */
import React, { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export default function SearchBar({
  value: externalValue, onChange, placeholder = 'Search...', debounceMs = 300,
}: SearchBarProps) {
  const [value, setValue] = useState(externalValue || '');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (externalValue !== undefined) setValue(externalValue);
  }, [externalValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), debounceMs);
  };

  const handleClear = () => {
    setValue('');
    onChange('');
  };

  const s: Record<string, React.CSSProperties> = {
    wrapper: { position: 'relative', display: 'inline-block', width: '300px' },
    input: { width: '100%', padding: '10px 36px 10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#1e293b', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' },
    clear: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', padding: '2px' },
  };

  return (
    <div style={s.wrapper}>
      <input style={s.input} type="text" value={value} onChange={handleChange} placeholder={placeholder}
        onFocus={e => (e.currentTarget.style.borderColor = '#3b82f6')}
        onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')} />
      {value && <button style={s.clear} onClick={handleClear}>✕</button>}
    </div>
  );
}
