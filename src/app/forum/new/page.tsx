"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session-context";

const CATEGORIES = [
  { value: "general", label: "General Discussion" },
  { value: "razors", label: "Razors" },
  { value: "soap-aftershave", label: "Soap/Aftershave" },
  { value: "brushes", label: "Brushes" },
  { value: "blades", label: "Blades" },
  { value: "fragrance", label: "Fragrance" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
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
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !session) router.push("/sign-in");
  }, [session, loading, router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      setPhotoDataUrl(dataUrl);
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
        ...(photoDataUrl ? { photoUrl: photoDataUrl } : {}),
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

        {/* Photo */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Photo (optional)</label>
          {photoDataUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoDataUrl}
                alt="Attached photo"
                className="w-full max-h-64 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={() => { setPhotoDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center py-10 cursor-pointer hover:border-white/30 transition-colors"
            >
              <span className="text-2xl mb-2">🖼️</span>
              <span className="text-sm text-gray-500">Click to attach a photo</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
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
