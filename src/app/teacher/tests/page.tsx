"use client";

import { TestsList } from "@/components/tests/TestsList";
import { testsForTeacher } from "@/lib/selectors";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { useMemo } from "react";

export default function TeacherTests() {
  const user = useSession((s) => s.user);
  const tests = useData((s) => s.tests);
  const groups = useData((s) => s.groups);

  const myTests = useMemo(
    () => (user ? testsForTeacher(tests, groups, user.id) : []),
    [tests, groups, user]
  );

  return <TestsList tests={myTests} basePath="/teacher" />;
}
