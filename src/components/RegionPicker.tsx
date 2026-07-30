import { useEffect, useRef } from 'react';
import type { City } from '../types';
import { PROVINCES, cityKey, findCityByKey } from '../data/regions';
import { getCurrentPosition } from '../services/geo';

interface Props {
  open: boolean;
  current: City | null;
  onSelect: (city: City) => void;
  onClose: () => void;
}

export const REGION_PICKER_ID = 'region-picker';

export default function RegionPicker({ open, current, onSelect, onClose }: Props) {
  const selectRef = useRef<HTMLSelectElement>(null);

  // 패널이 열리면 곧바로 select로 포커스를 옮긴다 (키보드/스크린리더 사용자가 트리거 버튼 뒤를 헤매지 않도록)
  // RegionPicker는 App에 항상 렌더링되고 open=false일 때만 null을 반환하는 구조라, deps를 []로 두면
  // 최초 마운트(닫힌 상태) 시 단 한 번만 실행되고 이후 열 때마다 재실행되지 않는다 (QA: 포커스 이동 안 됨)
  useEffect(() => {
    if (open) selectRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const currentKey = current ? cityKey(current) : '';
  const knownKey = findCityByKey(currentKey) ? currentKey : '';

  const useMyLocation = async () => {
    const here = await getCurrentPosition();
    if (here) onSelect(here);
  };

  return (
    <div
      id={REGION_PICKER_ID}
      className="picker"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="picker-row">
        <label className="picker-label" htmlFor="region-select">
          지역
        </label>
        <select
          id="region-select"
          ref={selectRef}
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
