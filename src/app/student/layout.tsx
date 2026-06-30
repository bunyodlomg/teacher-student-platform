import { AppShell } from "@/components/app/AppShell";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell role="student">{children}</AppShell>;
}
