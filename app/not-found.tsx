import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center space-y-3">
        <h1 className="text-2xl font-bold text-brand-950">페이지를 찾을 수 없어요</h1>
        <p className="text-brand-600 text-sm">요청하신 주소가 존재하지 않거나 이동되었습니다.</p>
        <Link href="/feed" className="btn-primary inline-block mt-2">
          소식함으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
