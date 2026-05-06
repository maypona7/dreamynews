"use client";

import "quill/dist/quill.snow.css";
import { useEffect, useRef, useState } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import type Quill from "quill";
import { getClientStorage } from "@/lib/firebase/client";

export default function QuillEditor({
  value,
  onChange,
  placeholder = "내용을 작성하세요...",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  const lastInternalHtmlRef = useRef<string>("");
  const [quillReady, setQuillReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    let q: Quill | null = null;

    void (async () => {
      const QuillCtor = (await import("quill")).default;
      if (cancelled || !editorRef.current) return;

      q = new QuillCtor(editorRef.current, {
        theme: "snow",
        placeholder,
        modules: {
          toolbar: {
            container: [
              [{ header: [1, 2, 3, false] }],
              ["bold", "italic", "underline", "strike"],
              [{ color: [] }, { background: [] }],
              [{ list: "ordered" }, { list: "bullet" }],
              ["blockquote", "code-block"],
              ["link", "image"],
              ["clean"],
            ],
            handlers: {
              image() {
                if (!q) return;
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.click();
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file || !q) return;
                  try {
                    const url = await uploadImage(file);
                    const range = q.getSelection(true);
                    q.insertEmbed(range.index, "image", url, "user");
                    q.setSelection(range.index + 1, 0);
                  } catch (e) {
                    console.error("image upload failed", e);
                    alert("이미지 업로드에 실패했어요");
                  }
                };
              },
            },
          },
        },
      });

      // initial value
      if (value) {
        q.clipboard.dangerouslyPasteHTML(value, "silent");
      }

      q.on("text-change", () => {
        const html = q?.root.innerHTML ?? "";
        lastInternalHtmlRef.current = html;
        onChangeRef.current(html);
      });

      quillRef.current = q;
      setQuillReady(true);
    })();

    return () => {
      cancelled = true;
      quillRef.current = null;
      setQuillReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep external value in sync if it differs (e.g., when editing).
  useEffect(() => {
    const q = quillRef.current;
    if (!q) return;
    // 입력 중에 부모 상태 재반영으로 placeholder 해제가 늦어지는 현상을 방지.
    if (value === lastInternalHtmlRef.current) return;
    const current = q.root.innerHTML;
    if (current !== value) {
      const sel = q.getSelection();
      q.clipboard.dangerouslyPasteHTML(value, "silent");
      lastInternalHtmlRef.current = value;
      if (sel) {
        try {
          q.setSelection(sel.index, sel.length);
        } catch {
          // ignore
        }
      }
    }
  }, [value]);

  return (
    <div className="quill-wrap relative" ref={containerRef}>
      <div ref={editorRef} />
      {!quillReady && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-b-xl flex items-center justify-center animate-pulse">
          <span className="text-sm text-brand-600">편집기를 불러오는 중...</span>
        </div>
      )}
      <style jsx global>{`
        .ql-toolbar.ql-snow {
          border-color: #e2e8f0;
          border-radius: 0.5rem 0.5rem 0 0;
          background: #f8fafc;
        }
        .ql-container.ql-snow {
          border-color: #e2e8f0;
          border-radius: 0 0 0.5rem 0.5rem;
          font-family: inherit;
          font-size: 0.95rem;
          min-height: 280px;
        }
        .ql-editor {
          min-height: 280px;
        }
        .ql-editor.ql-blank:focus::before {
          content: "";
        }
      `}</style>
    </div>
  );
}

async function uploadImage(file: File): Promise<string> {
  const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (IMGBB_API_KEY) {
    // imgbb는 무료 플랜에서 키만 제공되면 바로 업로드 가능합니다.
    const base64 = await fileToBase64(file);
    const body = new URLSearchParams({
      image: base64,
      name: file.name,
    });
    const url = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(
      IMGBB_API_KEY,
    )}`;
    const res = await fetch(url, {
      method: "POST",
      body,
    });
    if (!res.ok) {
      throw new Error(`IMGBB_UPLOAD_FAILED: ${res.status}`);
    }
    const json: unknown = await res.json();
    const data = (json as { data?: { url?: string } }).data;
    const uploadedUrl = data?.url;
    if (!uploadedUrl) throw new Error("IMGBB_UPLOAD_FAILED: missing url");
    return uploadedUrl;
  }

  const ext = file.name.split(".").pop() || "png";
  const id = crypto.randomUUID();
  const path = `posts/_drafts/images/${id}.${ext}`;
  const r = storageRef(getClientStorage(), path);
  await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(r);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}
