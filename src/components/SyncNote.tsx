"use client";

import { useState } from "react";

export default function SyncNote() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors bg-transparent border-none outline-none cursor-pointer mt-0.5"
      >
        How does sync work?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[#f5f2eb] font-semibold text-base mb-4">Sync between web & mobile</h2>
            <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
              <p>
                Your ShaveSplash data lives on our servers, not on your device. That means the web app and the iOS app are always looking at the same information.
              </p>
              <p>
                Log a shave on your phone and it shows up here instantly. Add gear to your Den on the web and it appears in the app right away. There's nothing to sync manually.
              </p>
              <p>
                All you need is to be signed in to the same account on both.
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-5 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300 border-none outline-none cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
