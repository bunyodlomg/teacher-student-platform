"use client";

import { StipendBoard } from "@/components/tests/StipendBoard";
import { useData } from "@/store/data";

export default function TeacherStipend() {
  const tests = useData((s) => s.tests);
  return <StipendBoard tests={tests} basePath="/teacher" />;
}
