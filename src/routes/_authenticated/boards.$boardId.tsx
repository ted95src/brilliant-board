import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BoardCanvas } from "@/components/kanban/board-canvas";
import { getBoard } from "@/lib/board.functions";

export const Route = createFileRoute("/_authenticated/boards/$boardId")({
  component: BoardPage,
});

function BoardPage() {
  const { boardId } = useParams({ from: "/_authenticated/boards/$boardId" });
  const fetchBoard = useServerFn(getBoard);
  const board = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => fetchBoard({ data: { boardId } }),
  });

  return (
    <AppShell activeBoardId={boardId} title={board.data?.board.name ?? "Board"}>
      {board.isPending ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : board.data ? (
        <BoardCanvas boardId={boardId} data={board.data} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          This board could not be loaded.
        </div>
      )}
    </AppShell>
  );
}
