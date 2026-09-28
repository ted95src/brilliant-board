import { useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { columnDot, COLUMN_ACCENTS, type CardRow, type ColumnRow, type LabelRow } from "@/lib/kanban";
import { SortableTaskCard } from "./task-card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function BoardColumn({
  column,
  cards,
  labels,
  onOpenCard,
  onAddCard,
  onRename,
  onAccent,
  onDelete,
}: {
  column: ColumnRow;
  cards: CardRow[];
  labels: LabelRow[];
  onOpenCard: (cardId: string) => void;
  onAddCard: (columnId: string, title: string) => void;
  onRename: (columnId: string, name: string) => void;
  onAccent: (columnId: string, accent: string) => void;
  onDelete: (columnId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(column.name);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column" },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `col-drop-${column.id}`,
    data: { type: "column-drop", columnId: column.id },
  });

  function submitCard() {
    if (draft.trim()) onAddCard(column.id, draft.trim());
    setDraft("");
    setAdding(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("flex w-[19rem] shrink-0 flex-col", isDragging && "opacity-50")}
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          className="cursor-grab text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
          aria-label="Reorder column"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <span className={cn("size-2 rounded-full", columnDot(column.accent))} />
        {renaming ? (
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              onRename(column.id, nameDraft);
              setRenaming(false);
            }}
          >
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                onRename(column.id, nameDraft);
                setRenaming(false);
              }}
              className="h-7 text-sm"
            />
          </form>
        ) : (
          <button
            onDoubleClick={() => setRenaming(true)}
            className="text-sm font-semibold tracking-wide uppercase"
            title="Double-click to rename"
          >
            {column.name}
          </button>
        )}
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {cards.length}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-auto text-muted-foreground transition-colors hover:text-foreground">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setRenaming(true)}>Rename column</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Color</DropdownMenuLabel>
            <div className="flex gap-1.5 px-2 pb-2">
              {COLUMN_ACCENTS.map((a) => (
                <button
                  key={a}
                  onClick={() => onAccent(column.id, a)}
                  aria-label={a}
                  className={cn(
                    "size-4 rounded-full ring-offset-2 ring-offset-popover",
                    columnDot(a),
                    column.accent === a && "ring-2 ring-ring",
                  )}
                />
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(column.id)}
            >
              <Trash2 className="size-3.5" /> Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setDropRef}
        className={cn(
          "scrollbar-slim flex min-h-32 flex-1 flex-col gap-2.5 overflow-y-auto rounded-2xl border border-transparent bg-surface/60 p-2.5 transition-colors",
          isOver && "border-primary/40 bg-primary/5",
        )}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableTaskCard key={card.id} card={card} labels={labels} onOpen={onOpenCard} />
          ))}
        </SortableContext>

        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitCard();
            }}
          >
            <Input
              autoFocus
              placeholder="Task title…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submitCard}
              className="bg-card"
            />
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="size-3.5" /> Add card
          </button>
        )}
      </div>
    </div>
  );
}
