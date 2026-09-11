"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

const CATEGORIES = [
  { value: "general", label: "General Discussion" },
  { value: "journals", label: "Journals" },
  { value: "razors", label: "Razors" },
  { value: "soap-aftershave", label: "Soap/Aftershave" },
  { value: "brushes", label: "Brushes" },
  { value: "blades", label: "Blades" },
  { value: "fragrance", label: "Fragrance" },
];

const MAX_PHOTOS = 4;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NewThreadPage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !session) router.push("/sign-in");
  }, [session, loading, router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photoDataUrls.length;
    const toProcess = files.slice(0, remaining);
    try {
      const compressed = await Promise.all(toProcess.map(compressImage));
      setPhotoDataUrls((prev) => [...prev, ...compressed]);
    } catch {
      setError("Failed to read image.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotoDataUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const toProcess = files.slice(0, MAX_PHOTOS - photoDataUrls.length);
    try {
      const compressed = await Promise.all(toProcess.map(compressImage));
      setPhotoDataUrls((prev) => [...prev, ...compressed]);
    } catch {
      setError("Failed to read image.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const { thread } = await api.post<{ thread: { id: string } }>("/api/forum/threads", {
        title: title.trim(),
        body: body.trim(),
        category,
        ...(photoDataUrls.length ? { photoUrls: photoDataUrls } : {}),
      });
      router.push(`/forum/${thread.id}`);
    } catch {
      setError("Failed to post. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading || !session) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-300 text-sm">
          ← Back
        </button>
        <h1 className="font-[family-name:var(--font-fredericka)] text-2xl text-[#c9a050]">New Thread</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2eb] focus:outline-none focus:border-[#c9a050]/40"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={200}
            className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2eb] placeholder-gray-600 focus:outline-none focus:border-[#c9a050]/40"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts, questions, or experience…"
            rows={8}
            className="w-full bg-[#242424] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2eb] placeholder-gray-600 resize-y focus:outline-none focus:border-[#c9a050]/40"
          />
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Photos (optional, up to {MAX_PHOTOS})
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-xl transition-colors ${isDragging ? "ring-2 ring-[#c9a050]/50 bg-[#c9a050]/5" : ""}`}
          >
          {photoDataUrls.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {photoDataUrls.map((url, i) => (
                <div key={i} className="relative w-24 h-24 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-contain rounded-xl bg-[#1a1a1a] border border-white/10" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/70 text-white text-xs hover:bg-black/90 transition-colors"
                  >✕</button>
                </div>
              ))}
              {photoDataUrls.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 shrink-0 border border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-600 hover:border-white/40 hover:text-gray-400 transition-colors"
                >
                  <span className="text-xl">+</span>
                  <span className="text-[10px]">Add photo</span>
                </button>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center py-10 cursor-pointer hover:border-white/30 transition-colors"
            >
              <span className="text-2xl mb-2">🖼️</span>
              <span className="text-sm text-gray-500">Click to attach photos</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!title.trim() || !body.trim() || submitting}
          className="bg-[#c9a050] text-black font-bold py-3 rounded-xl hover:bg-[#b8903f] disabled:opacity-40 transition-colors"
        >
          {submitting ? "Posting…" : "Post Thread"}
        </button>
      </form>
    </div>
  );
}
