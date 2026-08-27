"use client";

import { TestsList } from "@/components/tests/TestsList";
import { useData } from "@/store/data";
import { useMemo } from "react";

export default function AdminTests() {
  const tests = useData((s) => s.tests);

  // admin barcha testlarni ko'radi (state faqat mavjud guruhlar testlarини beradi)
  const all = useMemo(
    () =>
      tests
        .slice()
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [tests]
  );

  return <TestsList tests={all} basePath="/admin" />;
}
