"use client";

import { GroupHero } from "@/components/app/GroupHero";
import { PostCard } from "@/components/feed/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Aurora } from "@/components/motion";
import { getGroup, postsForGroup } from "@/lib/selectors";
import { useData } from "@/store/data";
import { BookOpen } from "lucide-react";
import { useParams } from "next/navigation";

export default function StudentGroupFeed() {
  const params = useParams();
  const id = params.id as string;
  const groups = useData((s) => s.groups);
  const posts = useData((s) => s.posts);

  const group = getGroup(groups, id);
  if (!group) {
    return <div className="py-20 text-center text-muted">Guruh topilmadi.</div>;
  }
  const feed = postsForGroup(posts, id);

  return (
    <div className="relative mx-auto max-w-2xl">
      <Aurora />
      <GroupHero group={group} />
      {feed.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Hali postlar yo'q"
          description="O'qituvchingiz dars yoki e'lon ulashganda, u shu yerda paydo bo'ladi."
        />
      ) : (
        <div className="space-y-4">
          {feed.map((p, i) => (
            <PostCard key={p.id} post={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
