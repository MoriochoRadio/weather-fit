import type { City } from '../types';
import { cityKey } from '../data/regions';
import { isFavorite } from '../services/geo';

interface Props {
  favorites: City[];
  current: City | null;
  onSelect: (city: City) => void;
  onToggleCurrent: () => void;
}

/** 즐겨찾는 지역 빠른 전환 바 — 시·군 단위 검색보다 세밀한 지점(역·동 등)도 등록 가능 */
export default function FavoriteBar({ favorites, current, onSelect, onToggleCurrent }: Props) {
  if (favorites.length === 0 && !current) return null;

  const currentSaved = current ? isFavorite(current, favorites) : false;

  return (
    <div className="favorites">
      {favorites.length > 0 && (
        <div className="tabs favorites-tabs" role="group" aria-label="즐겨찾는 지역">
          {favorites.map((f) => {
            const active = !!current && cityKey(current) === cityKey(f);
            return (
              <button
                key={cityKey(f)}
                type="button"
                className={active ? 'tab active' : 'tab'}
                aria-pressed={active}
                onClick={() => onSelect(f)}
              >
                {f.name}
              </button>
            );
          })}
        </div>
      )}
      {current && (
        <button type="button" className="text-btn fav-toggle" aria-pressed={currentSaved} onClick={onToggleCurrent}>
          {currentSaved ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        </button>
      )}
    </div>
  );
}
