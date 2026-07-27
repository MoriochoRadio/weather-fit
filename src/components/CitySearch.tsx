import { useEffect, useRef, useState } from 'react';
import type { City } from '../types';
import { searchCities } from '../services/geo';

interface Props {
  open: boolean;
  onSelect: (city: City) => void;
  onClose: () => void;
}

export default function CitySearch({ open, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setStatus('idle');
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setStatus('idle');
      return;
    }
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const cities = await searchCities(query.trim());
        setResults(cities);
        setStatus(cities.length === 0 ? 'empty' : 'idle');
      } catch {
        setStatus('error');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  return (
    <div className="search" role="search">
      <div className="search-row">
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="도시 이름 (예: 서울, 부산, Tokyo)"
          aria-label="도시 검색"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && results.length > 0) onSelect(results[0]);
          }}
        />
        <button type="button" className="text-btn" onClick={onClose}>
          닫기
        </button>
      </div>
      {status === 'loading' && <p className="search-note">검색 중…</p>}
      {status === 'error' && <p className="search-note">검색에 실패했어요. 잠시 후 다시 시도해 주세요.</p>}
      {status === 'empty' && <p className="search-note">‘{query}’ 검색 결과가 없어요. 도시 이름을 확인해 주세요.</p>}
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((c) => (
            <li key={`${c.latitude},${c.longitude}`}>
              <button type="button" onClick={() => onSelect(c)}>
                <strong>{c.name}</strong>
                {c.region && <span> — {c.region}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
