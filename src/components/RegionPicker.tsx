import { useEffect, useRef, useState } from 'react';
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
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);

  // 패널이 열리면 곧바로 select로 포커스를 옮긴다 (키보드/스크린리더 사용자가 트리거 버튼 뒤를 헤매지 않도록)
  // RegionPicker는 App에 항상 렌더링되고 open=false일 때만 null을 반환하는 구조라, deps를 []로 두면
  // 최초 마운트(닫힌 상태) 시 단 한 번만 실행되고 이후 열 때마다 재실행되지 않는다 (QA: 포커스 이동 안 됨)
  useEffect(() => {
    if (open) selectRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const currentKey = current ? cityKey(current) : '';
  const knownKey = findCityByKey(currentKey) ? currentKey : '';

  // 위치 권한이 거부되면 getCurrentPosition이 조용히 null을 주고 끝나 버튼이 고장난 것처럼 보였다 (QA)
  const useMyLocation = async () => {
    setLocateFailed(false);
    setLocating(true);
    const here = await getCurrentPosition();
    setLocating(false);
    if (here) onSelect(here);
    else setLocateFailed(true);
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
        <button type="button" className="text-btn" onClick={useMyLocation} disabled={locating}>
          {locating ? '위치 확인 중…' : '현재 위치'}
        </button>
        <button type="button" className="text-btn" onClick={onClose}>
          닫기
        </button>
      </div>
      {locateFailed && (
        <p className="picker-error" role="alert">
          위치를 가져오지 못했어요. 브라우저의 위치 권한을 허용했는지 확인하거나, 위에서 지역을 직접 골라 주세요.
        </p>
      )}
      <p className="picker-note">전국 시·군 단위로 오늘 날씨를 조회합니다. 선택한 지역은 다음 방문에도 유지돼요.</p>
    </div>
  );
}
