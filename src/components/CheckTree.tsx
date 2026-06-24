import { memo, useCallback, useMemo } from 'react';
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

const Box = memo(function Box({ status }: { status: TriState }) {
  const cls = status === 'on' ? styles.on : status === 'mixed' ? styles.mixed : '';
  return (
    <span className={`${styles.box} ${cls}`} role="checkbox" aria-checked={status === 'on'}>
      {status === 'on' && <IconCheck size={12} stroke={3} />}
      {status === 'mixed' && <IconMinus size={12} stroke={3} />}
    </span>
  );
});

export const CheckTree = memo(function CheckTree({
  rootLabel = 'Все', items, state, onChange, onToggleAll,
}: CheckTreeProps) {
  const root: TriState = useMemo(() => {
    const vals = items.map((i) => state[i.key]);
    if (vals.length > 0 && vals.every(Boolean)) return 'on';
    if (vals.every((v) => !v)) return 'off';
    return 'mixed';
  }, [items, state]);

  const handleToggleAll = useCallback(() => onToggleAll(root !== 'on'), [onToggleAll, root]);

  return (
    <div>
      <div className={`${styles.row} ${styles.rowRoot}`} onClick={handleToggleAll}>
        <Box status={root} />
        <span>{rootLabel}</span>
      </div>
      <div className={styles.children}>
        {items.map((it) => (
          <CheckRow key={it.key} item={it} checked={state[it.key]} onChange={onChange} />
        ))}
      </div>
    </div>
  );
});

const CheckRow = memo(function CheckRow({
  item, checked, onChange,
}: { item: CheckItem; checked: boolean; onChange: (key: string, value: boolean) => void }) {
  const handleClick = useCallback(
    () => onChange(item.key, !checked),
    [item.key, checked, onChange],
  );
  return (
    <div className={styles.row} onClick={handleClick}>
      <Box status={checked ? 'on' : 'off'} />
      <span>{item.label}</span>
    </div>
  );
});
