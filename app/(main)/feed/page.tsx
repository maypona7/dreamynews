import { Suspense } from "react";
import FeedClient from "./FeedClient";

export const dynamic = "force-dynamic";

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="text-brand-500 text-sm">로딩중...</div>}>
      <FeedClient />
    </Suspense>
  );
}
