# Kanban Board with AI Assistant

A personal, login-protected Kanban board styled after your reference images: dark app shell, left sidebar, horizontally scrolling columns of task cards with colored priority labels and avatars.

## What you'll get

**Sign in**
- Email + password sign-in. Everything you create is private to your account.

**Boards and columns**
- Multiple boards listed in the left sidebar; create, rename, delete.
- Columns are fully editable: add, rename, reorder, delete. New boards start with To Do / In Progress / Review / Done.
- Card count per column, "+ Add Card" at the bottom of each column.

**Task cards**
- Title and description.
- Colored labels and a priority tag (Low / Medium / High / Urgent), matching the pill styling in your references.
- Due date shown on the card, with overdue dates highlighted.
- Checklist with a progress indicator, and a comment thread.
- Clicking a card opens a detail panel for editing everything.

**Interaction**
- Drag cards between and within columns; drag columns to reorder. Position saves instantly.
- Smooth motion on drag, hover lift on cards, animated panel open/close.

**AI assistant**
- A chat panel available from anywhere in the app.
- It can read your board and answer questions like "what's overdue?" or "summarise In Progress".
- It can also act: create tasks, move them between columns, set due dates, priorities and labels. Actions appear in the board immediately.
- Conversation stays in one thread per board, saved so you can pick it back up.

**Saved for good**
- Boards, columns, cards, labels, checklists, comments and chat history all live in the database, tied to your account.

## Design direction

Taking cues from all three references: the dark surface and quiet typography of the second, the label pills and avatar clusters of the first and third, and the sidebar structure common to all. Accent colors reserved for priority and label pills so the board stays calm until something needs attention. Light mode included.

## Technical notes

- Lovable Cloud for auth, database and server logic.
- Tables: `boards`, `columns`, `cards`, `labels`, `card_labels`, `checklist_items`, `comments`, `chat_messages` — each row scoped to the owner with row-level security policies on `auth.uid()`.
- Card and column ordering stored as a numeric `position`; drag-and-drop via `@dnd-kit`.
- Board reads/writes through authenticated server functions; protected pages under the authenticated route layout.
- AI chat streams from a server route using the Lovable AI Gateway with tool calling for the create/move/update actions; tools execute against the signed-in user's own rows only.

## Build order

1. Enable Cloud, auth, and the database schema.
2. Design system and app shell (sidebar, header, dark/light).
3. Board view with columns and cards, reading real data.
4. Card detail panel: labels, priority, due date, checklist, comments.
5. Drag and drop with persisted ordering.
6. AI chat panel with board-aware answers and action tools.
7. End-to-end pass: sign in, create a board, add and move cards, ask the assistant to add and move one, reload to confirm everything persists.
