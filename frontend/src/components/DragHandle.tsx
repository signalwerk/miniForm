import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";

interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  label: string;
}

export function DragHandle({
  attributes,
  listeners,
  setActivatorNodeRef,
  label,
}: DragHandleProps) {
  return (
    <button
      ref={setActivatorNodeRef}
      type="button"
      className="drag-handle"
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <span />
      <span />
      <span />
    </button>
  );
}
