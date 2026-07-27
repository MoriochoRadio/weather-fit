import type { Advice } from '../types';

interface Props {
  advice: Advice[];
}

export default function AdviceList({ advice }: Props) {
  if (advice.length === 0) return null;
  return (
    <ul className="advice" aria-label="날씨 대응 조언">
      {advice.map((a) => (
        <li key={a.id} className={a.emphasis ? 'advice-item emphasis' : 'advice-item'}>
          {a.text}
        </li>
      ))}
    </ul>
  );
}
