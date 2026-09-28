import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, X } from "lucide-react";
import {
  addChecklistItem,
  addComment,
  deleteCard,
  deleteChecklistItem,
  deleteComment,
  getCardDetail,
  setChecklistItem,
  toggleCardLabel,
  updateCard,
} from "@/lib/board.functions";
import { PRIORITIES, PRIORITY_LABEL, tagClass, type CardRow, type LabelRow, type Priority } from "@/lib/kanban";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function CardDetailSheet({
  boardId,
  cardId,
  cards,
  labels,
  onClose,
}: {
  boardId: string;
  cardId: string | null;
  cards: CardRow[];
  labels: LabelRow[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const card = cards.find((c) => c.id === cardId) ?? null;

  const detailFn = useServerFn(getCardDetail);
  const updateFn = useServerFn(updateCard);
  const deleteFn = useServerFn(deleteCard);
  const toggleLabelFn = useServerFn(toggleCardLabel);
  const addItemFn = useServerFn(addChecklistItem);
  const setItemFn = useServerFn(setChecklistItem);
  const delItemFn = useServerFn(deleteChecklistItem);
  const addCommentFn = useServerFn(addComment);
  const delCommentFn = useServerFn(deleteComment);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [item, setItem] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
    }
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const detail = useQuery({
    queryKey: ["card", cardId],
    queryFn: () => detailFn({ data: { cardId: cardId! } }),
    enabled: !!cardId,
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
      queryClient.invalidateQueries({ queryKey: ["card", cardId] }),
    ]);
  };

  const patch = useMutation({
    mutationFn: (vars: {
      title?: string;
      description?: string;
      priority?: Priority;
      dueDate?: string | null;
    }) => updateFn({ data: { cardId: cardId!, ...vars } }),
    onSuccess: refreshAll,
  });

  const removeCard = useMutation({
    mutationFn: () => deleteFn({ data: { cardId: cardId! } }),
    onSuccess: async () => {
      onClose();
      await refreshAll();
    },
  });

  const toggleLabel = useMutation({
    mutationFn: (vars: { labelId: string; on: boolean }) =>
      toggleLabelFn({ data: { cardId: cardId!, ...vars } }),
    onSuccess: refreshAll,
  });

  const addItem = useMutation({
    mutationFn: (content: string) => addItemFn({ data: { cardId: cardId!, content } }),
    onSuccess: refreshAll,
  });
  const setItemDone = useMutation({
    mutationFn: (vars: { itemId: string; done: boolean }) => setItemFn({ data: vars }),
    onSuccess: refreshAll,
  });
  const delItem = useMutation({
    mutationFn: (itemId: string) => delItemFn({ data: { itemId } }),
    onSuccess: refreshAll,
  });
  const postComment = useMutation({
    mutationFn: (body: string) => addCommentFn({ data: { cardId: cardId!, body } }),
    onSuccess: refreshAll,
  });
  const delComment = useMutation({
    mutationFn: (commentId: string) => delCommentFn({ data: { commentId } }),
    onSuccess: refreshAll,
  });

  const checklist = detail.data?.checklist ?? [];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <Sheet open={!!cardId && !!card} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="scrollbar-slim w-full overflow-y-auto sm:max-w-xl">
        {card && (
          <>
            <SheetHeader className="pr-10">
              <SheetTitle className="sr-only">Task details</SheetTitle>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title !== card.title && patch.mutate({ title })}
                className="h-auto border-0 bg-transparent px-0 font-display text-xl font-semibold shadow-none focus-visible:ring-0"
              />
            </SheetHeader>

            <div className="space-y-7 px-4 pb-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        onClick={() => patch.mutate({ priority: p })}
                        className={cn(
                          "rounded-md border px-2 py-1 text-xs transition-colors",
                          card.priority === p
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {PRIORITY_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due" className="text-xs text-muted-foreground">
                    Due date
                  </Label>
                  <Input
                    id="due"
                    type="date"
                    value={card.due_date ?? ""}
                    onChange={(e) => patch.mutate({ dueDate: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Labels</Label>
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((l) => {
                    const on = card.labelIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() => toggleLabel.mutate({ labelId: l.id, on: !on })}
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-medium transition-opacity",
                          tagClass(l.color),
                          on ? "opacity-100 ring-1 ring-ring" : "opacity-45 hover:opacity-80",
                        )}
                      >
                        {l.name}
                      </button>
                    );
                  })}
                  {labels.length === 0 && (
                    <p className="text-xs text-muted-foreground">No labels on this board yet.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  id="desc"
                  rows={4}
                  value={description}
                  placeholder="What needs to happen?"
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => description !== card.description && patch.mutate({ description })}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Checklist</Label>
                  {checklist.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {doneCount}/{checklist.length}
                    </span>
                  )}
                </div>
                {checklist.length > 0 && (
                  <Progress value={(doneCount / checklist.length) * 100} className="h-1.5" />
                )}
                <ul className="space-y-1.5">
                  {checklist.map((c) => (
                    <li key={c.id} className="group flex items-center gap-2.5">
                      <Checkbox
                        checked={c.done}
                        onCheckedChange={(v) =>
                          setItemDone.mutate({ itemId: c.id, done: v === true })
                        }
                      />
                      <span
                        className={cn(
                          "flex-1 text-sm",
                          c.done && "text-muted-foreground line-through",
                        )}
                      >
                        {c.content}
                      </span>
                      <button
                        onClick={() => delItem.mutate(c.id)}
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        aria-label="Remove item"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (item.trim()) addItem.mutate(item.trim());
                    setItem("");
                  }}
                >
                  <Input
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    placeholder="Add a step…"
                    className="h-9"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    <Plus className="size-4" />
                  </Button>
                </form>
              </div>

              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Comments</Label>
                <ul className="space-y-2">
                  {(detail.data?.comments ?? []).map((c) => (
                    <li
                      key={c.id}
                      className="group rounded-xl border border-border bg-card p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="whitespace-pre-wrap">{c.body}</p>
                        <button
                          onClick={() => delComment.mutate(c.id)}
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          aria-label="Delete comment"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
                        {new Date(c.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (comment.trim()) postComment.mutate(comment.trim());
                    setComment("");
                  }}
                >
                  <Textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Leave a note…"
                  />
                  <Button type="submit" size="sm" variant="secondary" disabled={!comment.trim()}>
                    Comment
                  </Button>
                </form>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  if (window.confirm("Delete this card?")) removeCard.mutate();
                }}
              >
                <Trash2 className="size-4" /> Delete card
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
