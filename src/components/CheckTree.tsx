import { useMemo } from 'react';
import { IconCheck, IconMinus } from '@tabler/icons-react';
import styles from './CheckTree.module.css';

export interface CheckItem {
  key: string;
  label: string;
}

interface CheckTreeProps {
  rootLabel?: string;
  items: CheckItem[];
  state: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
  onToggleAll: (value: boolean) => void;
}

type TriState = 'on' | 'off' | 'mixed';

function Box({ status }: { status: TriState }) {
  const cls = status === 'on' ? styles.on : status === 'mixed' ? styles.mixed : '';
  return (
    <span className={`${styles.box} ${cls}`} role="checkbox" aria-checked={status === 'on'}>
      {status === 'on' && <IconCheck size={12} stroke={3} />}
      {status === 'mixed' && <IconMinus size={12} stroke={3} />}
    </span>
  );
}

export function CheckTree({ rootLabel = 'Все', items, state, onChange, onToggleAll }: CheckTreeProps) {
  const root: TriState = useMemo(() => {
    const vals = items.map((i) => state[i.key]);
    if (vals.length > 0 && vals.every(Boolean)) return 'on';
    if (vals.every((v) => !v)) return 'off';
    return 'mixed';
  }, [items, state]);

  return (
    <div>
      <div className={`${styles.row} ${styles.rowRoot}`} onClick={() => onToggleAll(root !== 'on')}>
        <Box status={root} />
        <span>{rootLabel}</span>
      </div>
      <div className={styles.children}>
        {items.map((it) => (
          <div className={styles.row} key={it.key} onClick={() => onChange(it.key, !state[it.key])}>
            <Box status={state[it.key] ? 'on' : 'off'} />
            <span>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
