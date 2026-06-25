"use client";

import { FormatInfo } from "@/lib/api";
import { Check, Film, Music, MonitorPlay, ChevronDown } from "lucide-react";
import { useState } from "react";

function fmtSize(b: number | null): string {
  if (!b) return "--";
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

interface Preset {
  label: string;
  desc: string;
  fmt: string;
  merge?: string;
  icon: React.ReactNode;
  audioOnly?: boolean;
}

const PRESETS: Preset[] = [
  { label: "Best", desc: "最高画质", fmt: "bestvideo*+bestaudio/best", icon: <MonitorPlay className="w-4 h-4" /> },
  { label: "1080p", desc: "1080p", fmt: "bestvideo[height<=1080]+bestaudio/best[height<=1080]", merge: "mp4", icon: <Film className="w-4 h-4" /> },
  { label: "720p", desc: "720p", fmt: "bestvideo[height<=720]+bestaudio/best[height<=720]", merge: "mp4", icon: <Film className="w-4 h-4" /> },
  { label: "MP3", desc: "仅音频", fmt: "bestaudio/best", audioOnly: true, icon: <Music className="w-4 h-4" /> },
];

interface Props {
  formats: FormatInfo[];
  selectedFormat: string;
  onSelectFormat: (format: string, merge?: string) => void;
  extractAudio: boolean;
  onToggleExtractAudio: (v: boolean) => void;
  audioFormat: string;
  onChangeAudioFormat: (v: string) => void;
}

export function FormatSelector({
  formats, selectedFormat, onSelectFormat,
  extractAudio, onToggleExtractAudio, audioFormat, onChangeAudioFormat,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const videoFormats = formats.filter((f) => f.type === "video+audio" || f.type === "video");
  const best = new Map<string, FormatInfo>();
  for (const f of videoFormats) {
    const k = f.resolution || "unknown";
    const prev = best.get(k);
    if (!prev || (f.tbr || 0) > (prev.tbr || 0)) best.set(k, f);
  }
  const display = showAll ? videoFormats : [...best.values()];

  return (
    <div className="anim-rise-d2 space-y-5">
      {/* Quick presets */}
      <div>
        <div className="label mb-2.5 px-1">Quick Presets</div>
        <div className="grid grid-cols-4 gap-2.5">
          {PRESETS.map((p) => {
            const active = selectedFormat === p.fmt && extractAudio === !!p.audioOnly;
            return (
              <button
                key={p.label}
                onClick={() => {
                  onSelectFormat(p.fmt, p.merge);
                  onToggleExtractAudio(!!p.audioOnly);
                  if (p.audioOnly) onChangeAudioFormat("mp3");
                }}
                className={`
                  card-sm p-3.5 text-left transition-all duration-150 cursor-pointer
                  ${active
                    ? "border-amber/30 bg-amber-ghost shadow-[0_0_20px_rgba(245,166,35,0.06)]"
                    : "hover:border-edge-light hover:bg-surface-3"
                  }
                `}
              >
                <div className={`flex items-center gap-2 mb-1 ${active ? "text-amber" : "text-ink-soft"}`}>
                  {p.icon}
                  <span className="text-[13px] font-semibold">{p.label}</span>
                </div>
                <div className="text-[11px] text-ink-muted">{p.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Format table */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="label">Formats</span>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[11px] font-mono text-ink-muted hover:text-amber transition-colors flex items-center gap-1"
          >
            {showAll ? "Best Only" : "Show All"}
            <ChevronDown className={`w-3 h-3 transition-transform ${showAll ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 z-10 bg-surface-3">
                <tr className="text-ink-muted font-mono text-[10px] uppercase tracking-wider">
                  <th className="text-left px-3.5 py-2.5 w-8"></th>
                  <th className="text-left px-3.5 py-2.5">ID</th>
                  <th className="text-left px-3.5 py-2.5">Resolution</th>
                  <th className="text-left px-3.5 py-2.5">Codec</th>
                  <th className="text-left px-3.5 py-2.5">Bitrate</th>
                  <th className="text-right px-3.5 py-2.5">Size</th>
                </tr>
              </thead>
              <tbody>
                {display.map((f, i) => {
                  const active = selectedFormat === f.format_id;
                  return (
                    <tr
                      key={f.format_id}
                      onClick={() => onSelectFormat(f.format_id)}
                      className={`
                        cursor-pointer transition-colors border-t border-edge
                        ${active ? "bg-amber-ghost" : "hover:bg-surface-3"}
                        ${i % 2 === 0 ? "" : "bg-surface-1/30"}
                      `}
                    >
                      <td className="px-3.5 py-2">
                        {active ? <Check className="w-3.5 h-3.5 text-amber" /> : null}
                      </td>
                      <td className="px-3.5 py-2 font-mono">
                        <span className="text-ink">{f.format_id}</span>
                        <span className="text-ink-muted ml-1">.{f.ext}</span>
                      </td>
                      <td className="px-3.5 py-2">
                        {f.resolution || (f.type === "audio" ? "audio" : "--")}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-ink-soft">
                        {f.vcodec && f.vcodec !== "none" ? f.vcodec : ""}
                        {f.acodec && f.acodec !== "none" ? ` / ${f.acodec}` : ""}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-ink-soft">
                        {f.tbr ? `${f.tbr.toFixed(0)} kbps` : "--"}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-ink-soft">
                        {fmtSize(f.filesize)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Audio extraction */}
      <div className="card-sm p-4 flex items-center gap-5">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={extractAudio}
            onChange={(e) => onToggleExtractAudio(e.target.checked)}
          />
          <Music className="w-4 h-4 text-ink-muted" />
          <span className="text-[13px] text-ink-soft">Extract audio only</span>
        </label>
        {extractAudio ? (
          <select
            value={audioFormat}
            onChange={(e) => onChangeAudioFormat(e.target.value)}
          >
            <option value="mp3">MP3</option>
            <option value="aac">AAC</option>
            <option value="m4a">M4A</option>
            <option value="opus">OPUS</option>
            <option value="flac">FLAC</option>
            <option value="wav">WAV</option>
          </select>
        ) : null}
      </div>
    </div>
  );
}
