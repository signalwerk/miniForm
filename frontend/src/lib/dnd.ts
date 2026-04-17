import type { UniqueIdentifier } from "@dnd-kit/core";

export type DropIndicatorPosition = "before" | "after" | null;

export const getDropIndicator = (
  itemIds: UniqueIdentifier[],
  itemId: UniqueIdentifier,
  activeId: UniqueIdentifier | null,
  overId: UniqueIdentifier | null,
): DropIndicatorPosition => {
  if (!activeId || !overId || activeId === overId || overId !== itemId) {
    return null;
  }

  const activeIndex = itemIds.indexOf(activeId);
  const overIndex = itemIds.indexOf(overId);

  if (activeIndex === -1 || overIndex === -1) {
    return null;
  }

  return activeIndex < overIndex ? "after" : "before";
};
