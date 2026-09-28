import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, CheckSquare2, MessageSquare } from "lucide-react";
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  dueState,
  formatDue,
  tagClass,
  type CardRow,
  type LabelRow,
} from "@/lib/kanban";
import { cn } from "@/lib/utils";

export function CardBody({
  card,
  labels,
  dragging,
}: {
  card: CardRow;
  labels: LabelRow[];
  dragging?: boolean;
}) {
  const cardLabels = labels.filter((l) => card.labelIds.includes(l.id));
  const due = dueState(card.due_date);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 text-left shadow-card transition-all",
        dragging ? "rotate-1 shadow-lift" : "hover:-translate-y-0.5 hover:border-primary/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase",
            PRIORITY_CLASS[card.priority],
          )}
        >
          {PRIORITY_LABEL[card.priority]}
        </span>
        {cardLabels.map((l) => (
          <span
            key={l.id}
            className={cn("rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium", tagClass(l.color))}
          >
            {l.name}
          </span>
        ))}
      </div>

      <p className="mt-2.5 text-sm leading-snug font-medium text-card-foreground">{card.title}</p>
      {card.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{card.description}</p>
      )}

      {(card.due_date || card.checklistTotal > 0 || card.commentCount > 0) && (
        <div className="mt-3 flex items-center gap-3 text-[0.7rem] text-muted-foreground">
          {card.due_date && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
                due === "overdue" && "bg-destructive/15 font-medium text-destructive",
                due === "today" && "bg-prio-high font-medium text-prio-high-foreground",
              )}
            >
              <CalendarClock className="size-3" />
              {formatDue(card.due_date)}
            </span>
          )}
          {card.checklistTotal > 0 && (
            <span className="inline-flex items-center gap-1">
              <CheckSquare2 className="size-3" />
              {card.checklistDone}/{card.checklistTotal}
            </span>
          )}
          {card.commentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3" />
              {card.commentCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function SortableTaskCard({
  card,
  labels,
  onOpen,
}: {
  card: CardRow;
  labels: LabelRow[];
  onOpen: (cardId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", columnId: card.column_id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(card.id);
      }}
    >
      <CardBody card={card} labels={labels} />
    </div>
  );
}
