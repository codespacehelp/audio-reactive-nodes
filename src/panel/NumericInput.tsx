import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '../store/project-store';
import type { ParamDef } from '../types/node-def';

interface Props {
  nodeId: string;
  def: ParamDef;
  value: number;
}

function clampValue(def: ParamDef, val: number): number {
  let v = val;
  if (def.min !== undefined) v = Math.max(def.min, v);
  if (def.max !== undefined) v = Math.min(def.max, v);
  if (def.type === 'int') v = Math.round(v);
  return v;
}

function getStep(def: ParamDef): number {
  return def.step ?? (def.type === 'int' ? 1 : 0.1);
}

function formatValue(def: ParamDef, val: number): string {
  if (def.type === 'int') return String(Math.round(val));
  // Show enough decimal places to reflect the step
  const step = getStep(def);
  const decimals = Math.max(1, Math.ceil(-Math.log10(step)));
  return val.toFixed(decimals);
}

export default function NumericInput({ nodeId, def, value }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [prevValue, setPrevValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    startX: number;
    startValue: number;
    undoPushed: boolean;
  } | null>(null);

  const commit = useCallback(
    (numVal: number, pushUndo: boolean) => {
      const clamped = clampValue(def, numVal);
      if (pushUndo) {
        useProjectStore.getState().pushUndo();
      }
      useProjectStore.getState().setParamValue(nodeId, def.name, {
        mode: 'literal',
        value: clamped,
      });
    },
    [nodeId, def],
  );

  // Focus + select all when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // --- Drag handlers ---
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (editing) return; // Already in text edit mode
      e.preventDefault();

      dragRef.current = {
        startX: e.clientX,
        startValue: value,
        undoPushed: false,
      };

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
    },
    [editing, value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startX;

      // Need at least 2px of movement to start dragging
      if (Math.abs(dx) < 2 && !drag.undoPushed) return;

      if (!drag.undoPushed) {
        useProjectStore.getState().pushUndo();
        drag.undoPushed = true;
      }

      const baseStep = getStep(def);
      let step = baseStep;
      if (e.shiftKey) step = baseStep * 10;
      if (e.altKey) step = baseStep / 10;

      const newVal = drag.startValue + dx * step;
      const clamped = clampValue(def, newVal);

      useProjectStore.getState().setParamValue(nodeId, def.name, {
        mode: 'literal',
        value: clamped,
      });
    },
    [nodeId, def],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = Math.abs(e.clientX - drag.startX);

      // If no drag happened (click), enter text edit mode
      if (dx < 2) {
        setPrevValue(value);
        setEditText(formatValue(def, value));
        setEditing(true);
      }

      dragRef.current = null;
    },
    [value, def],
  );

  // --- Text edit handlers ---
  const confirmEdit = useCallback(() => {
    const num = parseFloat(editText);
    if (!isNaN(num)) {
      commit(num, true);
    }
    setEditing(false);
  }, [editText, commit]);

  const cancelEdit = useCallback(() => {
    // Restore previous value
    commit(prevValue, false);
    setEditing(false);
  }, [prevValue, commit]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="w-full rounded bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 outline-none ring-1 ring-zinc-500 tabular-nums"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={confirmEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmEdit();
          if (e.key === 'Escape') cancelEdit();
        }}
      />
    );
  }

  return (
    <div
      className="flex w-full cursor-ew-resize select-none items-center rounded bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 ring-1 ring-zinc-700 tabular-nums hover:ring-zinc-500"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {formatValue(def, value)}
    </div>
  );
}
