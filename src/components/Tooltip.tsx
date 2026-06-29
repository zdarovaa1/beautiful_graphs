import { memo, type ReactNode } from 'react';
import styles from './Tooltip.module.css';

export const Tooltip = memo(function Tooltip({
  title,
  children,
  block = false,
}: {
  title: string;
  children: ReactNode;
  block?: boolean;
}) {
  return (
    <span className={`${styles.tooltip} ${block ? styles.block : ''}`} data-tooltip={title}>
      {children}
    </span>
  );
});
