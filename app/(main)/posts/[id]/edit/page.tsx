import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { postConverter } from "@/lib/firebase/server-converters";
import { getSessionUser } from "@/lib/auth/session";
import PostForm from "@/components/PostForm";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session?.appUser) redirect("/login");

  const snap = await adminDb()
    .collection("posts")
    .doc(id)
    .withConverter(postConverter)
    .get();
  if (!snap.exists) notFound();
  const post = snap.data();
  if (!post) notFound();

  const isOwner = post.author.uid === session.uid;
  const isAdmin = session.appUser.role === "admin";
  if (!isOwner && !isAdmin) redirect(`/posts/${id}`);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-950">게시글 수정</h1>
      <div className="card p-6 sm:p-8">
        <PostForm mode="edit" post={post} />
      </div>
    </div>
  );
}
