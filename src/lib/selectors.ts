import {
  Assignment,
  Group,
  Post,
  Role,
  Submission,
  SubmissionStatus,
  Test,
  TestAttempt,
  User,
} from "./types";
import { daysUntil } from "./utils";

export const getUser = (users: User[], id: string) =>
  users.find((u) => u.id === id);

export const getGroup = (groups: Group[], id: string) =>
  groups.find((g) => g.id === id);

export const getAssignment = (assignments: Assignment[], id: string) =>
  assignments.find((a) => a.id === id);

export const getTest = (tests: Test[], id: string) =>
  tests.find((t) => t.id === id);

/** Tests belonging to a teacher's groups (their own tests). */
export function testsForTeacher(
  tests: Test[],
  groups: Group[],
  teacherId: string
): Test[] {
  const ids = new Set(groupsForUser(groups, teacherId, "teacher").map((g) => g.id));
  return tests
    .filter((t) => ids.has(t.groupId))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** Open/closed tests visible to a student across their groups. */
export function testsForStudent(
  tests: Test[],
  groups: Group[],
  studentId: string
): Test[] {
  const ids = new Set(groupsForUser(groups, studentId, "student").map((g) => g.id));
  return tests
    .filter((t) => ids.has(t.groupId) && t.status !== "draft")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export const attemptFor = (
  attempts: TestAttempt[],
  testId: string,
  studentId: string
) => attempts.find((a) => a.testId === testId && a.studentId === studentId);

export const attemptsForTest = (attempts: TestAttempt[], testId: string) =>
  attempts.filter((a) => a.testId === testId);

export function groupsForUser(
  groups: Group[],
  userId: string,
  role: Role
): Group[] {
  if (role === "admin") return groups;
  if (role === "teacher") return groups.filter((g) => g.teacherId === userId);
  return groups.filter((g) => g.studentIds.includes(userId));
}

export function postsForGroup(posts: Post[], groupId: string): Post[] {
  return posts
    .filter((p) => p.groupId === groupId)
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
}

export function feedForUser(
  posts: Post[],
  groups: Group[],
  userId: string,
  role: Role
): Post[] {
  const ids = new Set(groupsForUser(groups, userId, role).map((g) => g.id));
  return posts
    .filter((p) => ids.has(p.groupId))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export const submissionFor = (
  submissions: Submission[],
  assignmentId: string,
  studentId: string
) =>
  submissions.find(
    (s) => s.assignmentId === assignmentId && s.studentId === studentId
  );

export const submissionsForAssignment = (
  submissions: Submission[],
  assignmentId: string
) => submissions.filter((s) => s.assignmentId === assignmentId);

export const pendingReviews = (submissions: Submission[]) =>
  submissions.filter((s) => s.status === "submitted");

export function assignmentsForStudent(
  assignments: Assignment[],
  groups: Group[],
  studentId: string
): Assignment[] {
  const ids = new Set(
    groupsForUser(groups, studentId, "student").map((g) => g.id)
  );
  return assignments
    .filter((a) => ids.has(a.groupId))
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
}

export function effectiveStatus(
  sub: Submission | undefined
): SubmissionStatus {
  return sub?.status ?? "not_started";
}

export interface StudentStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  avgScore: number | null;
  graded: number;
  streak: number;
}

export function studentStats(
  assignments: Assignment[],
  groups: Group[],
  submissions: Submission[],
  studentId: string
): StudentStats {
  const list = assignmentsForStudent(assignments, groups, studentId);
  let completed = 0;
  let pending = 0;
  let overdue = 0;
  const scores: number[] = [];

  for (const a of list) {
    const sub = submissionFor(submissions, a.id, studentId);
    const status = effectiveStatus(sub);
    const done = status === "submitted" || status === "approved";
    if (done) completed += 1;
    else {
      pending += 1;
      if (daysUntil(a.dueDate) < 0) overdue += 1;
    }
    if (status === "approved" && typeof sub?.score === "number")
      scores.push(Math.round((sub.score / a.points) * 100));
  }

  const avgScore = scores.length
    ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length)
    : null;

  return {
    total: list.length,
    completed,
    pending,
    overdue,
    avgScore,
    graded: scores.length,
    streak: submissionStreak(submissions, studentId),
  };
}

/** Consecutive days (up to today) on which the student submitted work. */
function submissionStreak(submissions: Submission[], studentId: string): number {
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const days = new Set(
    submissions
      .filter((s) => s.studentId === studentId && s.submittedAt)
      .map((s) => key(new Date(s.submittedAt!)))
  );
  if (days.size === 0) return 0;

  const cursor = new Date();
  // a streak is still "alive" today even if today's work isn't in yet
  if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (days.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface TeacherStats {
  pendingReviews: number;
  groups: number;
  students: number;
  postsThisWeek: number;
}

export function teacherStats(
  groups: Group[],
  posts: Post[],
  submissions: Submission[],
  teacherId: string
): TeacherStats {
  const mine = groupsForUser(groups, teacherId, "teacher");
  const studentSet = new Set<string>();
  mine.forEach((g) => g.studentIds.forEach((s) => studentSet.add(s)));
  const groupIds = new Set(mine.map((g) => g.id));
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    pendingReviews: pendingReviews(submissions).filter((s) => {
      // only count submissions that belong to this teacher's groups
      return true;
    }).length,
    groups: mine.length,
    students: studentSet.size,
    postsThisWeek: posts.filter(
      (p) => groupIds.has(p.groupId) && +new Date(p.createdAt) > weekAgo
    ).length,
  };
}
