import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  createCard,
  createColumn,
  deleteColumn,
  moveCards,
  reorderColumns,
  updateColumn,
} from "@/lib/board.functions";
import type { BoardPayload, CardRow, ColumnRow } from "@/lib/kanban";
import { BoardColumn } from "./board-column";
import { CardBody } from "./task-card";
import { CardDetailSheet } from "./card-detail";

export function BoardCanvas({ boardId, data }: { boardId: string; data: BoardPayload }) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<ColumnRow[]>(data.columns);
  const [cards, setCards] = useState<CardRow[]>(data.cards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  useEffect(() => {
    setColumns(data.columns);
    setCards(data.cards);
  }, [data]);

  const addCardFn = useServerFn(createCard);
  const addColumnFn = useServerFn(createColumn);
  const updateColumnFn = useServerFn(updateColumn);
  const deleteColumnFn = useServerFn(deleteColumn);
  const moveCardsFn = useServerFn(moveCards);
  const reorderColumnsFn = useServerFn(reorderColumns);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["board", boardId] });

  const addCard = useMutation({
    mutationFn: (vars: { columnId: string; title: string }) =>
      addCardFn({ data: { boardId, columnId: vars.columnId, title: vars.title } }),
    onSuccess: refresh,
    onError: () => toast.error("Could not add the card"),
  });

  const addColumn = useMutation({
    mutationFn: () => addColumnFn({ data: { boardId, name: "New column" } }),
    onSuccess: refresh,
  });

  const patchColumn = useMutation({
    mutationFn: (vars: { columnId: string; name?: string; accent?: string }) =>
      updateColumnFn({ data: vars }),
    onSuccess: refresh,
  });

  const removeColumn = useMutation({
    mutationFn: (columnId: string) => deleteColumnFn({ data: { columnId } }),
    onSuccess: refresh,
  });

  const persistMoves = useMutation({
    mutationFn: (moves: { cardId: string; columnId: string; position: number }[]) =>
      moveCardsFn({ data: { moves } }),
    onSuccess: refresh,
    onError: () => {
      toast.error("Could not save the new order");
      void refresh();
    },
  });

  const persistColumnOrder = useMutation({
    mutationFn: (ids: string[]) => reorderColumnsFn({ data: { ids } }),
    onSuccess: refresh,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeCard = useMemo(() => cards.find((c) => c.id === activeId), [cards, activeId]);
  const cardsByColumn = useMemo(() => {
    const map = new Map<string, CardRow[]>();
    for (const col of columns) map.set(col.id, []);
    for (const card of [...cards].sort((a, b) => a.position - b.position)) {
      map.get(card.column_id)?.push(card);
    }
    return map;
  }, [columns, cards]);

  function columnIdOf(id: string | null): string | null {
    if (!id) return null;
    if (id.startsWith("col-drop-")) return id.replace("col-drop-", "");
    const card = cards.find((c) => c.id === id);
    if (card) return card.column_id;
    if (columns.some((c) => c.id === id)) return id;
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.["type"] !== "card") return;
    const activeCardId = String(active.id);
    const fromColumn = columnIdOf(activeCardId);
    const toColumn = columnIdOf(String(over.id));
    if (!toColumn || !fromColumn || fromColumn === toColumn) return;

    setCards((prev) => {
      const moving = prev.find((c) => c.id === activeCardId);
      if (!moving) return prev;
      const target = prev
        .filter((c) => c.column_id === toColumn)
        .sort((a, b) => a.position - b.position);
      const overIndex = target.findIndex((c) => c.id === String(over.id));
      const insertAt = overIndex >= 0 ? overIndex : target.length;
      const reordered = [...target.slice(0, insertAt), moving, ...target.slice(insertAt)];
      return prev.map((c) => {
        if (c.id === activeCardId) {
          return {
            ...c,
            column_id: toColumn,
            position: reordered.findIndex((r) => r.id === activeCardId),
          };
        }
        if (c.column_id === toColumn) {
          const idx = reordered.findIndex((r) => r.id === c.id);
          return idx >= 0 ? { ...c, position: idx } : c;
        }
        return c;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    if (active.data.current?.["type"] === "column") {
      const oldIndex = columns.findIndex((c) => c.id === String(active.id));
      const newIndex = columns.findIndex((c) => c.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const next = arrayMove(columns, oldIndex, newIndex).map((c, i) => ({ ...c, position: i }));
      setColumns(next);
      persistColumnOrder.mutate(next.map((c) => c.id));
      return;
    }

    const activeCardId = String(active.id);
    const targetColumn = columnIdOf(String(over.id)) ?? columnIdOf(activeCardId);
    if (!targetColumn) return;

    const inColumn = cards
      .filter((c) => c.column_id === targetColumn)
      .sort((a, b) => a.position - b.position);
    const oldIndex = inColumn.findIndex((c) => c.id === activeCardId);
    const overIndex = inColumn.findIndex((c) => c.id === String(over.id));
    const ordered =
      oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex
        ? arrayMove(inColumn, oldIndex, overIndex)
        : inColumn;

    const moves = ordered.map((c, i) => ({ cardId: c.id, columnId: targetColumn, position: i }));
    setCards((prev) =>
      prev.map((c) => {
        const m = moves.find((x) => x.cardId === c.id);
        return m ? { ...c, column_id: m.columnId, position: m.position } : c;
      }),
    );
    persistMoves.mutate(moves);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="scrollbar-slim flex h-full items-start gap-5 overflow-x-auto px-6 pb-6">
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                cards={cardsByColumn.get(column.id) ?? []}
                labels={data.labels}
                onOpenCard={setOpenCardId}
                onAddCard={(columnId, title) => addCard.mutate({ columnId, title })}
                onRename={(columnId, name) => patchColumn.mutate({ columnId, name })}
                onAccent={(columnId, accent) => patchColumn.mutate({ columnId, accent })}
                onDelete={(columnId) => {
                  if (window.confirm("Delete this column and its cards?"))
                    removeColumn.mutate(columnId);
                }}
              />
            ))}
          </SortableContext>

          <button
            onClick={() => addColumn.mutate()}
            className="mt-9 flex w-[15rem] shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="size-4" /> Add column
          </button>
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2,0,0,1)" }}>
          {activeCard ? (
            <div className="w-[17.5rem]">
              <CardBody card={activeCard} labels={data.labels} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CardDetailSheet
        boardId={boardId}
        cardId={openCardId}
        cards={cards}
        labels={data.labels}
        onClose={() => setOpenCardId(null)}
      />
    </>
  );
}
