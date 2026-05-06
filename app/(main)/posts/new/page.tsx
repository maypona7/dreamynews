import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import PostForm from "@/components/PostForm";

export default async function NewPostPage() {
  const session = await getSessionUser();
  if (!session?.appUser) redirect("/login");
  if (session.appUser.role !== "writer" && session.appUser.role !== "admin")
    redirect("/feed");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-950">새 게시글</h1>
      <div className="card p-6 sm:p-8">
        <PostForm mode="create" />
      </div>
    </div>
  );
}
