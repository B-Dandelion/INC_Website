"use client";
// Shows the video thumbnail and loads YouTube's player only when clicked,
// so a page with a dozen entries doesn't load a dozen players up front.
import { useState } from "react";
import { Play } from "lucide-react";

export default function YouTubeFacade({ id, title, playLabel }: { id: string; title: string; playLabel: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-slate-900">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 block h-full w-full">
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
          <span className="absolute left-1/2 top-1/2 inline-flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white transition group-hover:bg-[#174A7E]">
            <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
          </span>
          <span className="sr-only">{`${playLabel}: ${title}`}</span>
        </button>
      )}
    </div>
  );
}
