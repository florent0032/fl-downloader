"use client";

import { VideoInfo as VideoInfoType } from "@/lib/api";
import { Clock, Eye, ThumbsUp, User, Play } from "lucide-react";

function fmtDuration(sec: number | null): string {
  if (!sec) return "--:--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function fmtNum(n: number | null): string {
  if (n == null) return "--";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

interface Props {
  info: VideoInfoType;
}

export function VideoInfo({ info }: Props) {
  return (
    <div className="anim-rise-d1">
      <div className="card overflow-hidden">
        <div className="flex">
          {/* Thumbnail */}
          <div className="relative w-[320px] h-[180px] flex-shrink-0 bg-surface-3">
            {info.thumbnail ? (
              <img
                src={info.thumbnail}
                alt={info.title}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-10 h-10 text-ink-muted" strokeWidth={1.5} />
              </div>
            )}
            {/* Duration pill */}
            {info.duration ? (
              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/75 backdrop-blur-sm rounded-md font-mono text-[11px] text-white font-medium">
                {fmtDuration(info.duration)}
              </div>
            ) : null}
          </div>

          {/* Info panel */}
          <div className="flex-1 min-w-0 px-5 py-4 flex flex-col justify-between">
            <div>
              <span className="badge-amber text-[10px] mb-2 inline-flex">
                {info.extractor}
              </span>
              <h2 className="text-[15px] font-semibold leading-snug line-clamp-2 text-ink">
                {info.title}
              </h2>
              {info.description ? (
                <p className="text-[12px] text-ink-soft leading-relaxed line-clamp-2 mt-2">
                  {info.description}
                </p>
              ) : null}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-5 mt-3">
              {info.uploader ? (
                <Stat icon={<User className="w-3.5 h-3.5" />} text={info.uploader} />
              ) : null}
              {info.view_count != null ? (
                <Stat icon={<Eye className="w-3.5 h-3.5" />} text={`${fmtNum(info.view_count)} views`} />
              ) : null}
              {info.like_count != null ? (
                <Stat icon={<ThumbsUp className="w-3.5 h-3.5" />} text={fmtNum(info.like_count)} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-ink-muted">
      {icon}
      <span className="text-[12px] truncate max-w-[160px]">{text}</span>
    </div>
  );
}
