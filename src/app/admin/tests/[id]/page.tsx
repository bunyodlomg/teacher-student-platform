"use client";

import { TestDetail } from "@/components/tests/TestDetail";
import { useParams } from "next/navigation";

export default function AdminTestDetail() {
  const id = useParams().id as string;
  return <TestDetail testId={id} basePath="/admin" />;
}
