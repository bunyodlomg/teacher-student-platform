# Teacher · Student — Design System & Architecture

A premium learning-experience platform connecting teachers and students through
beautiful lessons, assignments and feedback. This document covers the design
deliverables behind the implementation.

---

## 1. Product principles

1. **Calm over crowded.** One thing matters at a time. No ERP density, no admin clutter.
2. **1–3 clicks to anything.** Today's tasks, deadlines and posts are visible on arrival.
3. **Feedback feels human.** Grades come with a kind, specific note — never a bare number.
4. **Motion with meaning.** Transitions orient the user; they never decorate for its own sake.

---

## 2. Information Architecture

```
Teacher · Student
├── Landing (role select)
├── Student
│   ├── Today (dashboard)        → stats · up-next · recent feed
│   ├── Assignments              → filter: all / to-do / submitted / graded
│   │   └── Assignment detail    → brief · submit / draft · feedback
│   ├── Progress                 → completion ring · per-class · recent grades
│   └── Class                    → group hero · lesson feed
└── Teacher
    ├── Overview (dashboard)     → stats · review queue · classes
    ├── Review desk              → filter: to-review / reviewed / all → grade modal
    ├── Classes                  → class grid
    └── Class                    → group hero · feed · composer · assignment progress
```

Cross-cutting: **Notifications** (top-bar panel) and **Search** (top bar) on every app screen.

---

## 3. Core user flows

**Student — submit work (3 clicks):**
Today → assignment card → write/attach → **Submit**. Teacher is notified instantly.

**Student — read feedback:**
Notification "Graded" → assignment detail → score + note shown in a green feedback card.

**Teacher — publish a lesson/assignment (1 modal):**
Class → **Share** → pick type (Lesson / Announcement / Assignment) → attach → **Publish**.
Every student in the group receives a notification.

**Teacher — review (2 clicks):**
Overview / Review desk → **Review** → set score + note → **Approve & grade** or **Request changes**.

---

## 4. Sitemap (routes)

| Route | Screen |
|---|---|
| `/` | Landing / role select |
| `/student` | Student dashboard |
| `/student/assignments` | Assignment list (filterable) |
| `/student/assignments/[id]` | Assignment detail + submission |
| `/student/progress` | Progress profile |
| `/student/groups/[id]` | Class feed |
| `/teacher` | Teacher dashboard |
| `/teacher/review` | Review desk |
| `/teacher/classes` | Classes grid |
| `/teacher/groups/[id]` | Class management + feed |

---

## 5. Design system

**Color** — token-driven via CSS variables (light + dark), consumed by Tailwind as
`bg / surface / elevated / border / ink / muted / faint / accent / success / warning / danger`.
A single indigo accent (`--accent`) carries brand and interaction; semantic colors are used
sparingly for status only. No rainbow gradients — gradients are reserved for class identity
covers and the brand mark.

**Typography** — `Sora` for display/headings (tight tracking), `Inter` for UI/body,
`JetBrains Mono` for numerals where useful. Strong hierarchy: oversized display headings,
quiet muted supporting text.

**Spacing & shape** — generous padding, `rounded-xl/2xl/3xl` radii, hairline borders,
layered soft shadows (`xs → soft → card → lift → glow`). Optional `.glass` (blur) used only
on the sticky top bar.

**Motion** — Framer Motion. Signature easing `cubic-bezier(0.16, 1, 0.3, 1)`. Entrances are
small fade-up + stagger; controls use spring `whileTap`. Shared-layout animations power the
segmented control and active nav pill.

---

## 6. Component library (`src/components/ui`)

`Avatar` / `AvatarStack`, `Button` / `IconButton`, `Badge`, `Card`, `EmptyState`,
`Skeleton` / `SkeletonCard`, `Progress` (`ProgressRing`, `ProgressBar`), `AttachmentChip`,
`Modal`, `Field` (`Input`, `Textarea`), `SegmentedControl`, `Logo`, `ThemeToggle`,
`StatCard`, `StatusBadge`.

Composite: `AppShell`, `PageHeader`, `GroupHero`, `NotificationsPanel`, `PostCard`,
`AssignmentCard`, `Composer` (teacher), `ReviewModal` (teacher).

---

## 7. Layouts

- **Desktop:** fixed 264px sidebar (brand · primary nav · classes · user) + sticky glass top
  bar (search · notifications · theme · avatar) + max-w-6xl content. Dashboards use a
  2-/5-column split (focus list + feed).
- **Mobile:** sidebar collapses into an animated drawer; top bar gains a menu button; grids
  reflow to single column; modals dock to the bottom as sheets.

---

## 8. Empty & loading states

- **Empty:** dedicated illustrated `EmptyState` (glow + icon) with warm copy and an action,
  e.g. "Inbox zero, scholar", "Review queue is clear", "Start the conversation".
- **Loading:** shimmer `Skeleton` / `SkeletonCard` and route-level `loading.tsx` for student
  and teacher sections; progress visuals animate from zero on mount.

---

## 9. Tech & data

Next.js (App Router) · TypeScript · Tailwind · Framer Motion · Zustand.

State lives in two stores: `useSession` (role/identity + theme, persisted) and `useData`
(groups, posts, assignments, submissions, notifications + all mutations). Pure derivations
live in `src/lib/selectors.ts`. The data layer is intentionally API-shaped: each store action
maps cleanly onto a future Express + MongoDB + JWT endpoint, with `AttachmentKind` ready for
S3-backed uploads.

> Demo note: data is seeded in-memory (`src/lib/seed.ts`) so both roles are fully explorable
> with no backend. Role is chosen on the landing screen — no login required.
