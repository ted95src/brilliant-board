import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  KanbanSquare,
  Plus,
  LogOut,
  Moon,
  Sun,
  Trash2,
  Pencil,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createBoard, deleteBoard, listBoards, renameBoard } from "@/lib/board.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function useBoards() {
  const fetchBoards = useServerFn(listBoards);
  return useQuery({ queryKey: ["boards"], queryFn: () => fetchBoards() });
}

export function AppShell({
  activeBoardId,
  children,
}: {
  activeBoardId?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const boards = useBoards();
  const [open, setOpen] = useState(true);
  const [dark, setDark] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const addBoard = useServerFn(createBoard);
  const rename = useServerFn(renameBoard);
  const remove = useServerFn(deleteBoard);

  useEffect(() => {
    const stored = window.localStorage.getItem("flowdeck-theme");
    const isDark = stored !== "light";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("flowdeck-theme", next ? "dark" : "light");
  }

  const createMutation = useMutation({
    mutationFn: () => addBoard({ data: { name: "New board" } }),
    onSuccess: async (board) => {
      await queryClient.invalidateQueries({ queryKey: ["boards"] });
      if (board?.id) navigate({ to: "/boards/$boardId", params: { boardId: board.id } });
    },
    onError: () => toast.error("Could not create the board"),
  });

  const renameMutation = useMutation({
    mutationFn: (vars: { boardId: string; name: string }) => rename({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (boardId: string) => remove({ data: { boardId } }),
    onSuccess: async (_r, boardId) => {
      await queryClient.invalidateQueries({ queryKey: ["boards"] });
      if (boardId === activeBoardId) navigate({ to: "/boards" });
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
          open ? "w-64" : "w-[4.25rem]",
        )}
      >
        <div className="flex items-center gap-2 px-4 py-5">
          <Link to="/" className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <KanbanSquare className="size-5" />
          </Link>
          {open && <span className="font-display text-base font-semibold">Flowdeck</span>}
          <button
            onClick={() => setOpen(!open)}
            className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            {open ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          {open && (
            <span className="text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase">
              Boards
            </span>
          )}
          <button
            onClick={() => createMutation.mutate()}
            className="grid size-5 place-items-center rounded-md bg-primary/15 text-primary transition-colors hover:bg-primary/25"
            aria-label="New board"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <nav className="scrollbar-slim flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {boards.data?.map((b) => (
            <div key={b.id} className="group/board relative">
              {editingId === b.id ? (
                <form
                  className="px-1 py-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    renameMutation.mutate({ boardId: b.id, name: draftName });
                    setEditingId(null);
                  }}
                >
                  <Input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => setEditingId(null)}
                    className="h-8 text-sm"
                  />
                </form>
              ) : (
                <Link
                  to="/boards/$boardId"
                  params={{ boardId: b.id }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    b.id === activeBoardId
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                  title={b.name}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      b.id === activeBoardId ? "bg-primary" : "bg-muted-foreground/50",
                    )}
                  />
                  {open && <span className="truncate">{b.name}</span>}
                </Link>
              )}
              {open && editingId !== b.id && (
                <div className="absolute top-1.5 right-1.5 hidden gap-0.5 group-hover/board:flex">
                  <button
                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                    onClick={() => {
                      setEditingId(b.id);
                      setDraftName(b.name);
                    }}
                    aria-label="Rename board"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(`Delete "${b.name}" and all its cards?`))
                        deleteMutation.mutate(b.id);
                    }}
                    aria-label="Delete board"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {boards.isLoading && (
            <div className="space-y-2 px-2 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-sidebar-accent/60" />
              ))}
            </div>
          )}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={toggleTheme}
          >
            {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            {open && <span>{dark ? "Dark" : "Light"} theme</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="size-4" />
            {open && <span>Sign out</span>}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
