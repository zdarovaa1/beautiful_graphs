import { useEffect, useRef } from 'react';
import type { SelectedEntity } from '../types';
import { useFocusEntity } from '../utils/focusEntity';

interface FocusEntityBridgeProps {
  onReady: (focus: (entity: SelectedEntity) => void) => void;
}

export function FocusEntityBridge({ onReady }: FocusEntityBridgeProps) {
  const focus = useFocusEntity();
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    onReadyRef.current(focus);
  }, [focus]);

  return null;
}
