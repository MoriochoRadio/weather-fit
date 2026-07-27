import type { City } from '../types';
import { PROVINCES, cityKey, findCityByKey } from '../data/regions';
import { getCurrentPosition } from '../services/geo';

interface Props {
  open: boolean;
  current: City | null;
  onSelect: (city: City) => void;
  onClose: () => void;
}

export default function RegionPicker({ open, current, onSelect, onClose }: Props) {
  if (!open) return null;

  const currentKey = current ? cityKey(current) : '';
  const knownKey = findCityByKey(currentKey) ? currentKey : '';

  const useMyLocation = async () => {
    const here = await getCurrentPosition();
    if (here) onSelect(here);
  };

  return (
    <div className="picker">
      <div className="picker-row">
        <label className="picker-label" htmlFor="region-select">
          지역
        </label>
        <select
          id="region-select"
          value={knownKey}
          onChange={(e) => {
            const city = findCityByKey(e.target.value);
            if (city) onSelect(city);
          }}
        >
          <option value="" disabled>
            시·군을 선택하세요
          </option>
          {PROVINCES.map((p) => (
            <optgroup key={p.name} label={p.name}>
              {p.cities.map((city) => (
                <option key={cityKey(city)} value={cityKey(city)}>
                  {city.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" className="text-btn" onClick={useMyLocation}>
          현재 위치
        </button>
        <button type="button" className="text-btn" onClick={onClose}>
          닫기
        </button>
      </div>
      <p className="picker-note">전국 시·군 단위로 오늘 날씨를 조회합니다. 선택한 지역은 다음 방문에도 유지돼요.</p>
    </div>
  );
}
