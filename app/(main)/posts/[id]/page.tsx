import Link from "next/link";
import PostView from "@/components/PostView";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        목록으로
      </Link>
      <div className="card p-6 sm:p-8">
        <PostView postId={id} variant="page" />
      </div>
    </div>
  );
}
