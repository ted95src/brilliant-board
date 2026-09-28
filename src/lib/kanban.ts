export type Priority = "low" | "medium" | "high" | "urgent";

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_CLASS: Record<Priority, string> = {
  low: "bg-prio-low text-prio-low-foreground",
  medium: "bg-prio-medium text-prio-medium-foreground",
  high: "bg-prio-high text-prio-high-foreground",
  urgent: "bg-prio-urgent text-prio-urgent-foreground",
};

export const TAG_COLORS = ["lime", "sky", "violet", "amber", "rose", "teal"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export const TAG_CLASS: Record<TagColor, string> = {
  lime: "bg-tag-lime text-tag-lime-foreground",
  sky: "bg-tag-sky text-tag-sky-foreground",
  violet: "bg-tag-violet text-tag-violet-foreground",
  amber: "bg-tag-amber text-tag-amber-foreground",
  rose: "bg-tag-rose text-tag-rose-foreground",
  teal: "bg-tag-teal text-tag-teal-foreground",
};

export function tagClass(color: string): string {
  return TAG_CLASS[(color as TagColor) in TAG_CLASS ? (color as TagColor) : "violet"];
}

export const COLUMN_ACCENTS = ["slate", "sky", "amber", "lime", "violet", "rose"] as const;

export const COLUMN_DOT: Record<string, string> = {
  slate: "bg-muted-foreground",
  sky: "bg-tag-sky-foreground",
  amber: "bg-tag-amber-foreground",
  lime: "bg-tag-lime-foreground",
  violet: "bg-tag-violet-foreground",
  rose: "bg-tag-rose-foreground",
};

export function columnDot(accent: string): string {
  return COLUMN_DOT[accent] ?? COLUMN_DOT["slate"]!;
}

export interface BoardSummary {
  id: string;
  name: string;
  position: number;
}

export interface LabelRow {
  id: string;
  name: string;
  color: string;
}

export interface CardRow {
  id: string;
  column_id: string;
  title: string;
  description: string;
  priority: Priority;
  due_date: string | null;
  position: number;
  labelIds: string[];
  checklistDone: number;
  checklistTotal: number;
  commentCount: number;
}

export interface ColumnRow {
  id: string;
  name: string;
  accent: string;
  position: number;
}

export interface BoardPayload {
  board: BoardSummary;
  columns: ColumnRow[];
  cards: CardRow[];
  labels: LabelRow[];
}

export function dueState(due: string | null): "none" | "overdue" | "today" | "soon" | "later" {
  if (!due) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${due}T00:00:00`);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 3) return "soon";
  return "later";
}

export function formatDue(due: string): string {
  const d = new Date(`${due}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
