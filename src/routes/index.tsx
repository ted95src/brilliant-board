import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  KanbanSquare,
  Sparkles,
  CalendarClock,
  Tags,
  ListChecks,
  MoveRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowdeck — a Kanban board with an AI copilot" },
      {
        name: "description",
        content:
          "Drag-and-drop Kanban columns, colored labels, due dates, checklists and comments — plus an AI assistant that can create and move tasks for you.",
      },
      { property: "og:title", content: "Flowdeck — a Kanban board with an AI copilot" },
      {
        property: "og:description",
        content: "Plan your work on a beautiful board with an AI assistant built in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: KanbanSquare,
    title: "Columns you control",
    body: "Add, rename, recolor and reorder columns. Drag cards anywhere — positions save instantly.",
  },
  {
    icon: Tags,
    title: "Labels and priority",
    body: "Tag work with colored labels and mark it Low through Urgent at a glance.",
  },
  {
    icon: CalendarClock,
    title: "Due dates that nag",
    body: "Overdue cards light up so nothing quietly slips past you.",
  },
  {
    icon: ListChecks,
    title: "Checklists and comments",
    body: "Break a card into steps, track progress, and leave notes for later.",
  },
];

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -top-60 left-1/2 h-[34rem] w-[70rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[160px]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <KanbanSquare className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">Flowdeck</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="relative mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          AI assistant that edits your board
        </span>
        <h1 className="mt-6 text-5xl leading-[1.05] font-semibold text-balance sm:text-6xl">
          Your work, in motion.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          A private Kanban board built for focus — drag-and-drop columns, colored labels, checklists,
          and an assistant you can just talk to.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/boards">
              Open your board <MoveRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-20 grid gap-4 text-left sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-surface p-5 shadow-card"
            >
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
