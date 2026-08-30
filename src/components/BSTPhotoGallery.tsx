"use client";

import { useState, useEffect, useCallback } from "react";

type Photo = { id: string; data: string; order: number };

function photoSrc(data: string) {
  return data.startsWith("data:") ? data : `data:image/jpeg;base64,${data}`;
}

export default function BSTPhotoGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);
    setZoomed(false);
  }, [photos.length]);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % photos.length);
    setZoomed(false);
  }, [photos.length]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setZoomed(false);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, prev, next, closeLightbox]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  if (photos.length === 0) {
    return (
      <div className="aspect-square bg-[#242424] rounded-2xl flex items-center justify-center text-8xl opacity-20">
        🪒
      </div>
    );
  }

  return (
    <>
      {/* Main photo + navigation */}
      <div className="space-y-3">
        <div
          className="relative aspect-square bg-[#1a1a1a] rounded-2xl overflow-hidden group cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc(photos[currentIndex].data)}
            alt={title}
            className="w-full h-full object-contain"
          />

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-lg font-bold"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-lg font-bold"
                aria-label="Next photo"
              >
                ›
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === currentIndex ? "w-4 bg-[#c9a050]" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Expand hint */}
          <div className="absolute top-3 right-3 bg-black/60 rounded-lg px-2.5 py-1.5 text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Click to expand
          </div>
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => { setCurrentIndex(i); setZoomed(false); }}
                className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                  i === currentIndex
                    ? "border-[#c9a050]"
                    : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc(photo.data)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/70 to-transparent z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {photos.length > 1 ? (
              <span className="text-white/80 text-sm font-medium">
                {currentIndex + 1} / {photos.length}
              </span>
            ) : <span />}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoomed((z) => !z)}
                className="text-white/70 hover:text-white text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                {zoomed ? "Fit" : "Zoom"}
              </button>
              <button
                onClick={closeLightbox}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Photo area */}
          <div
            className={`relative flex items-center justify-center w-full h-full ${zoomed ? "overflow-auto cursor-zoom-out" : "cursor-zoom-in"}`}
            onClick={(e) => {
              e.stopPropagation();
              setZoomed((z) => !z);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoSrc(photos[currentIndex].data)}
              alt={title}
              className="transition-all duration-200"
              style={
                zoomed
                  ? { maxWidth: "none", maxHeight: "none", width: "auto", height: "auto" }
                  : { maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }
              }
            />
          </div>

          {/* Prev/Next buttons */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-2xl font-bold transition-colors z-10"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-2xl font-bold transition-colors z-10"
                aria-label="Next photo"
              >
                ›
              </button>

              {/* Bottom thumbnail strip in lightbox */}
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    onClick={() => { setCurrentIndex(i); setZoomed(false); }}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      i === currentIndex ? "border-[#c9a050]" : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc(photo.data)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
