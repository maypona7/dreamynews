import Modal from "@/components/Modal";
import PostView from "@/components/PostView";

export default async function InterceptedPostModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Modal>
      <PostView postId={id} variant="modal" />
    </Modal>
  );
}
