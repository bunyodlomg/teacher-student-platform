import { connectDB } from "./db";
import {
  User,
  Group,
  Post,
  Assignment,
  Submission,
  Notification,
  Announcement,
  Test,
  TestAttempt,
  GroupDoc,
  PostDoc,
  AssignmentDoc,
  SubmissionDoc,
  NotificationDoc,
  AnnouncementDoc,
  TestDoc,
  TestAttemptDoc,
  UserDoc,
} from "./models";
import {
  sUser,
  sGroup,
  sPost,
  sAssignment,
  sSubmission,
  sNotification,
  sAnnouncement,
  sTest,
  sTestAttempt,
} from "./serialize";

interface SessionUser {
  id: string;
  role: string;
}

/** Group ids the user can access (as strings). */
export async function accessibleGroupIds(user: SessionUser): Promise<string[]> {
  await connectDB();
  let groups: Pick<GroupDoc, "_id">[];
  if (user.role === "admin") {
    groups = await Group.find({}, { _id: 1 }).lean().exec();
  } else if (user.role === "teacher") {
    groups = await Group.find({ teacherId: user.id }, { _id: 1 }).lean().exec();
  } else {
    groups = await Group.find({ studentIds: user.id }, { _id: 1 }).lean().exec();
  }
  return groups.map((g) => g._id.toString());
}

/** Everything the client store needs, scoped to the current user. */
export async function loadStateFor(user: SessionUser) {
  await connectDB();
  const groupIds = await accessibleGroupIds(user);

  const [users, groups, posts, assignments, notifications, announcements] =
    await Promise.all([
      User.find({}).sort({ name: 1 }).lean<UserDoc[]>().exec(),
      Group.find({ _id: { $in: groupIds } })
        .sort({ createdAt: 1 })
        .lean<GroupDoc[]>()
        .exec(),
      Post.find({ groupId: { $in: groupIds } })
        .sort({ createdAt: -1 })
        .lean<(PostDoc & { createdAt: Date })[]>()
        .exec(),
      Assignment.find({ groupId: { $in: groupIds } })
        .sort({ createdAt: -1 })
        .lean<(AssignmentDoc & { createdAt: Date })[]>()
        .exec(),
      Notification.find({ userId: user.id })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean<(NotificationDoc & { createdAt: Date })[]>()
        .exec(),
      Announcement.find({
        $or: [
          { scope: "school" },
          { scope: "group", groupId: { $in: groupIds } },
        ],
      })
        .sort({ pinned: -1, createdAt: -1 })
        .lean<(AnnouncementDoc & { createdAt: Date })[]>()
        .exec(),
    ]);

  const submissionFilter =
    user.role === "student"
      ? { studentId: user.id }
      : {
          assignmentId: {
            $in: (
              await Assignment.find(
                { groupId: { $in: groupIds } },
                { _id: 1 }
              )
                .lean()
                .exec()
            ).map((a) => a._id),
          },
        };
  const submissions = await Submission.find(submissionFilter)
    .lean<SubmissionDoc[]>()
    .exec();

  // ---- Testlar (DTM) ----
  const isTeacher = user.role === "teacher" || user.role === "admin";
  // O'quvchi faqat ochiq/yopiq testlarni ko'radi (qoralamalarni emas).
  const testFilter = isTeacher
    ? { groupId: { $in: groupIds } }
    : { groupId: { $in: groupIds }, status: { $in: ["open", "closed"] } };
  const tests = await Test.find(testFilter)
    .sort({ createdAt: -1 })
    .lean<(TestDoc & { createdAt: Date })[]>()
    .exec();

  const attemptFilter = isTeacher
    ? { testId: { $in: tests.map((t) => t._id) } }
    : { studentId: user.id };
  const attempts = await TestAttempt.find(attemptFilter)
    .lean<TestAttemptDoc[]>()
    .exec();

  return {
    users: users.map(sUser),
    groups: groups.map(sGroup),
    posts: posts.map(sPost),
    assignments: assignments.map(sAssignment),
    submissions: submissions.map(sSubmission),
    notifications: notifications.map(sNotification),
    announcements: announcements.map(sAnnouncement),
    tests: tests.map((t) => sTest(t, isTeacher)),
    attempts: attempts.map(sTestAttempt),
  };
}
