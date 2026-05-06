import Modal from "@/components/Modal";

export default function LoadingNewPostModal() {
  return (
    <Modal variant="page">
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-brand-950">새 게시글</h1>
        <div className="card p-6 sm:p-8 space-y-4 animate-pulse">
          <div className="h-4 w-20 rounded bg-brand-200" />
          <div className="h-10 w-full rounded bg-brand-100" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-10 w-full rounded bg-brand-100" />
            <div className="h-10 w-full rounded bg-brand-100" />
          </div>
          <div className="h-64 w-full rounded bg-brand-100" />
        </div>
      </div>
    </Modal>
  );
}

