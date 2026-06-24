import { GraphView } from './GraphView';
import { CollapsedPanelsProvider } from './CollapsedPanels';
import { SnapLayoutProvider } from './SnapLayout';
import styles from './App.module.css';

export default function App() {
  return (
    <div className={styles.app}>
      <SnapLayoutProvider>
        <CollapsedPanelsProvider>
          <GraphView />
        </CollapsedPanelsProvider>
      </SnapLayoutProvider>
    </div>
  );
}
