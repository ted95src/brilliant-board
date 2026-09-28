import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppShell, useBoards } from "@/components/app-shell";
import { createBoard } from "@/lib/board.functions";

export const Route = createFileRoute("/_authenticated/boards/")({
  component: BoardsIndex,
});

function BoardsIndex() {
  const navigate = useNavigate();
  const boards = useBoards();
  const queryClient = useQueryClient();
  const addBoard = useServerFn(createBoard);
  const bootstrapped = useRef(false);

  const createMutation = useMutation({
    mutationFn: () => addBoard({ data: { name: "My board" } }),
    onSuccess: async (board) => {
      await queryClient.invalidateQueries({ queryKey: ["boards"] });
      if (board?.id) navigate({ to: "/boards/$boardId", params: { boardId: board.id } });
    },
  });

  useEffect(() => {
    if (!boards.data || bootstrapped.current) return;
    bootstrapped.current = true;
    const first = boards.data[0];
    if (first) {
      navigate({ to: "/boards/$boardId", params: { boardId: first.id }, replace: true });
    } else {
      createMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards.data]);

  return (
    <AppShell>
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Opening your board…
      </div>
    </AppShell>
  );
}
