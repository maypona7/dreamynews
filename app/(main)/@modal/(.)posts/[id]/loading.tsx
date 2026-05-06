import Modal from "@/components/Modal";

export default function LoadingPostModal() {
  return (
    <Modal>
      <div className="space-y-4 animate-pulse">
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-slate-100" />
          <div className="h-6 w-24 rounded-full bg-slate-100" />
        </div>
        <div className="h-9 w-2/3 rounded bg-slate-200" />
        <div className="h-4 w-1/3 rounded bg-slate-100" />
        <div className="space-y-2 pt-2">
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-[92%] rounded bg-slate-100" />
          <div className="h-4 w-[80%] rounded bg-slate-100" />
          <div className="h-4 w-[70%] rounded bg-slate-100" />
        </div>
      </div>
    </Modal>
  );
}

