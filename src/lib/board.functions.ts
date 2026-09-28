import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BoardPayload, CardRow, Priority } from "./kanban";

const DEFAULT_COLUMNS = [
  { name: "To Do", accent: "slate" },
  { name: "In Progress", accent: "sky" },
  { name: "Review", accent: "amber" },
  { name: "Done", accent: "lime" },
];

const DEFAULT_LABELS = [
  { name: "Design", color: "violet" },
  { name: "Frontend", color: "sky" },
  { name: "Research", color: "teal" },
  { name: "Blocked", color: "rose" },
];

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export const listBoards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("boards")
      .select("id, name, position")
      .order("position")
      .order("created_at");
    fail(error);
    return data ?? [];
  });

export const createBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name?: string }) => ({ name: (input?.name ?? "").trim() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("boards")
      .select("id", { count: "exact", head: true });
    const { data: board, error } = await supabase
      .from("boards")
      .insert({
        user_id: userId,
        name: data.name || "Untitled board",
        position: count ?? 0,
      })
      .select("id, name, position")
      .single();
    fail(error);
    if (!board) throw new Error("Could not create the board");

    fail(
      (
        await supabase.from("board_columns").insert(
          DEFAULT_COLUMNS.map((c, i) => ({
            board_id: board.id,
            user_id: userId,
            name: c.name,
            accent: c.accent,
            position: i,
          })),
        )
      ).error,
    );
    fail(
      (
        await supabase.from("labels").insert(
          DEFAULT_LABELS.map((l) => ({
            board_id: board.id,
            user_id: userId,
            name: l.name,
            color: l.color,
          })),
        )
      ).error,
    );
    return board;
  });

export const renameBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { boardId: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    fail(
      (
        await context.supabase
          .from("boards")
          .update({ name: data.name.trim() || "Untitled board" })
          .eq("id", data.boardId)
      ).error,
    );
    return { ok: true };
  });

export const deleteBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { boardId: string }) => input)
  .handler(async ({ data, context }) => {
    fail((await context.supabase.from("boards").delete().eq("id", data.boardId)).error);
    return { ok: true };
  });

export const getBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { boardId: string }) => input)
  .handler(async ({ data, context }): Promise<BoardPayload> => {
    const { supabase } = context;
    const [boardRes, columnsRes, cardsRes, labelsRes, cardLabelsRes] = await Promise.all([
      supabase.from("boards").select("id, name, position").eq("id", data.boardId).maybeSingle(),
      supabase
        .from("board_columns")
        .select("id, name, accent, position")
        .eq("board_id", data.boardId)
        .order("position"),
      supabase
        .from("cards")
        .select("id, column_id, title, description, priority, due_date, position")
        .eq("board_id", data.boardId)
        .order("position"),
      supabase
        .from("labels")
        .select("id, name, color")
        .eq("board_id", data.boardId)
        .order("created_at"),
      supabase.from("card_labels").select("card_id, label_id"),
    ]);
    fail(boardRes.error);
    fail(columnsRes.error);
    fail(cardsRes.error);
    fail(labelsRes.error);
    fail(cardLabelsRes.error);
    if (!boardRes.data) throw new Error("Board not found");

    const cardIds = (cardsRes.data ?? []).map((c) => c.id);
    const [checkRes, commentRes] = await Promise.all([
      cardIds.length
        ? supabase.from("checklist_items").select("card_id, done").in("card_id", cardIds)
        : Promise.resolve({ data: [], error: null }),
      cardIds.length
        ? supabase.from("comments").select("card_id").in("card_id", cardIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const labelMap = new Map<string, string[]>();
    for (const row of cardLabelsRes.data ?? []) {
      const list = labelMap.get(row.card_id) ?? [];
      list.push(row.label_id);
      labelMap.set(row.card_id, list);
    }
    const checkMap = new Map<string, { done: number; total: number }>();
    for (const row of (checkRes.data ?? []) as { card_id: string; done: boolean }[]) {
      const agg = checkMap.get(row.card_id) ?? { done: 0, total: 0 };
      agg.total += 1;
      if (row.done) agg.done += 1;
      checkMap.set(row.card_id, agg);
    }
    const commentMap = new Map<string, number>();
    for (const row of (commentRes.data ?? []) as { card_id: string }[]) {
      commentMap.set(row.card_id, (commentMap.get(row.card_id) ?? 0) + 1);
    }

    const cards: CardRow[] = (cardsRes.data ?? []).map((c) => ({
      id: c.id,
      column_id: c.column_id,
      title: c.title,
      description: c.description,
      priority: c.priority as Priority,
      due_date: c.due_date,
      position: c.position,
      labelIds: labelMap.get(c.id) ?? [],
      checklistDone: checkMap.get(c.id)?.done ?? 0,
      checklistTotal: checkMap.get(c.id)?.total ?? 0,
      commentCount: commentMap.get(c.id) ?? 0,
    }));

    return {
      board: boardRes.data,
      columns: columnsRes.data ?? [],
      cards,
      labels: labelsRes.data ?? [],
    };
  });

/* ---------------- columns ---------------- */

export const createColumn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { boardId: string; name?: string; accent?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("board_columns")
      .select("id", { count: "exact", head: true })
      .eq("board_id", data.boardId);
    const { data: row, error } = await supabase
      .from("board_columns")
      .insert({
        board_id: data.boardId,
        user_id: userId,
        name: (data.name ?? "").trim() || "New column",
        accent: data.accent ?? "slate",
        position: count ?? 0,
      })
      .select("id")
      .single();
    fail(error);
    return row;
  });

export const updateColumn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { columnId: string; name?: string; accent?: string }) => input)
  .handler(async ({ data, context }) => {
    const patch: Record<string, string> = {};
    if (typeof data.name === "string") patch["name"] = data.name.trim() || "Untitled";
    if (typeof data.accent === "string") patch["accent"] = data.accent;
    if (Object.keys(patch).length) {
      fail(
        (
          await context.supabase
            .from("board_columns")
            .update(patch as never)
            .eq("id", data.columnId)
        ).error,
      );
    }
    return { ok: true };
  });

export const deleteColumn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { columnId: string }) => input)
  .handler(async ({ data, context }) => {
    fail((await context.supabase.from("board_columns").delete().eq("id", data.columnId)).error);
    return { ok: true };
  });

export const reorderColumns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => input)
  .handler(async ({ data, context }) => {
    for (const [i, id] of data.ids.entries()) {
      fail((await context.supabase.from("board_columns").update({ position: i }).eq("id", id)).error);
    }
    return { ok: true };
  });

/* ---------------- cards ---------------- */

export const createCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      boardId: string;
      columnId: string;
      title: string;
      description?: string;
      priority?: Priority;
      dueDate?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("column_id", data.columnId);
    const { data: row, error } = await supabase
      .from("cards")
      .insert({
        board_id: data.boardId,
        column_id: data.columnId,
        user_id: userId,
        title: data.title.trim() || "Untitled task",
        description: data.description ?? "",
        priority: data.priority ?? "medium",
        due_date: data.dueDate ?? null,
        position: count ?? 0,
      })
      .select("id")
      .single();
    fail(error);
    return row;
  });

export const updateCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      cardId: string;
      title?: string;
      description?: string;
      priority?: Priority;
      dueDate?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof data.title === "string") patch["title"] = data.title.trim() || "Untitled task";
    if (typeof data.description === "string") patch["description"] = data.description;
    if (data.priority) patch["priority"] = data.priority;
    if (data.dueDate !== undefined) patch["due_date"] = data.dueDate;
    fail((await context.supabase.from("cards").update(patch).eq("id", data.cardId)).error);
    return { ok: true };
  });

export const deleteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => input)
  .handler(async ({ data, context }) => {
    fail((await context.supabase.from("cards").delete().eq("id", data.cardId)).error);
    return { ok: true };
  });

export const moveCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { moves: { cardId: string; columnId: string; position: number }[] }) => input)
  .handler(async ({ data, context }) => {
    for (const move of data.moves) {
      fail(
        (
          await context.supabase
            .from("cards")
            .update({ column_id: move.columnId, position: move.position })
            .eq("id", move.cardId)
        ).error,
      );
    }
    return { ok: true };
  });

/* ---------------- labels ---------------- */

export const createLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { boardId: string; name: string; color: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("labels")
      .insert({
        board_id: data.boardId,
        user_id: context.userId,
        name: data.name.trim() || "Label",
        color: data.color,
      })
      .select("id, name, color")
      .single();
    fail(error);
    return row;
  });

export const deleteLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { labelId: string }) => input)
  .handler(async ({ data, context }) => {
    fail((await context.supabase.from("labels").delete().eq("id", data.labelId)).error);
    return { ok: true };
  });

export const toggleCardLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string; labelId: string; on: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.on) {
      fail(
        (
          await supabase
            .from("card_labels")
            .upsert({ card_id: data.cardId, label_id: data.labelId, user_id: userId })
        ).error,
      );
    } else {
      fail(
        (
          await supabase
            .from("card_labels")
            .delete()
            .eq("card_id", data.cardId)
            .eq("label_id", data.labelId)
        ).error,
      );
    }
    return { ok: true };
  });

/* ---------------- card detail ---------------- */

export const getCardDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => input)
  .handler(async ({ data, context }) => {
    const [checklist, comments] = await Promise.all([
      context.supabase
        .from("checklist_items")
        .select("id, content, done, position")
        .eq("card_id", data.cardId)
        .order("position"),
      context.supabase
        .from("comments")
        .select("id, body, created_at")
        .eq("card_id", data.cardId)
        .order("created_at"),
    ]);
    fail(checklist.error);
    fail(comments.error);
    return { checklist: checklist.data ?? [], comments: comments.data ?? [] };
  });

export const addChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string; content: string }) => input)
  .handler(async ({ data, context }) => {
    const { count } = await context.supabase
      .from("checklist_items")
      .select("id", { count: "exact", head: true })
      .eq("card_id", data.cardId);
    fail(
      (
        await context.supabase.from("checklist_items").insert({
          card_id: data.cardId,
          user_id: context.userId,
          content: data.content.trim(),
          position: count ?? 0,
        })
      ).error,
    );
    return { ok: true };
  });

export const setChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string; done?: boolean; content?: string }) => input)
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (typeof data.done === "boolean") patch["done"] = data.done;
    if (typeof data.content === "string") patch["content"] = data.content;
    if (Object.keys(patch).length) {
      fail((await context.supabase.from("checklist_items").update(patch).eq("id", data.itemId)).error);
    }
    return { ok: true };
  });

export const deleteChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    fail((await context.supabase.from("checklist_items").delete().eq("id", data.itemId)).error);
    return { ok: true };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    fail(
      (
        await context.supabase.from("comments").insert({
          card_id: data.cardId,
          user_id: context.userId,
          body: data.body.trim(),
        })
      ).error,
    );
    return { ok: true };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { commentId: string }) => input)
  .handler(async ({ data, context }) => {
    fail((await context.supabase.from("comments").delete().eq("id", data.commentId)).error);
    return { ok: true };
  });

/* ---------------- chat history ---------------- */

export const listChatMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { boardId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("board_id", data.boardId)
      .order("created_at");
    fail(error);
    return rows ?? [];
  });

export const clearChatMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { boardId: string }) => input)
  .handler(async ({ data, context }) => {
    fail(
      (await context.supabase.from("chat_messages").delete().eq("board_id", data.boardId)).error,
    );
    return { ok: true };
  });
