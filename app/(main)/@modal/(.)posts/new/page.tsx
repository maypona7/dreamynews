import Modal from "@/components/Modal";
import PostForm from "@/components/PostForm";

export default async function InterceptedNewPostModal() {
  return (
    <Modal variant="page">
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">새 게시글</h1>
        <div className="card p-6 sm:p-8">
          <PostForm mode="create" onCreateSuccess="close" />
        </div>
      </div>
    </Modal>
  );
}
