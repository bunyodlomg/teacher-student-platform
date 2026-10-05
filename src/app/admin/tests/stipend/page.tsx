"use client";

import { StipendBoard } from "@/components/tests/StipendBoard";
import { useData } from "@/store/data";

export default function AdminStipend() {
  const tests = useData((s) => s.tests);
  return <StipendBoard tests={tests} basePath="/admin" />;
}
