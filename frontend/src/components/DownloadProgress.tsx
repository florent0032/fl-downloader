"use client";

import { DownloadProgress as ProgressData } from "@/lib/api";
import { Loader2, CheckCircle2, XCircle, ArrowDown } from "lucide-react";

interface Props {
  data: ProgressData;
  title?: string;
}

export function DownloadProgress({ data, title }: Props) {
  const running = data.status === "downloading";
  const done = data.status === "completed";
  const failed = data.status === "failed";

  return (
    <div className="anim-rise card p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center
          ${running ? "bg-blue/10" : done ? "bg-green/10" : "bg-red/10"}
        `}>
          {running ? <Loader2 className="w-4 h-4 text-blue animate-spin" /> :
           done ? <CheckCircle2 className="w-4 h-4 text-green" /> :
           <XCircle className="w-4 h-4 text-red" />}
        </div>
        <div>
          <div className="text-[13px] font-medium">
            {done ? "Download Complete" : failed ? "Download Failed" : "Downloading..."}
          </div>
          {title ? <div className="text-[11px] text-ink-muted truncate max-w-md">{title}</div> : null}
        </div>
      </div>

      {/* Progress bar */}
      {(running || done) ? (
        <div className="mb-2">
          <div className="flex justify-between text-[11px] font-mono text-ink-muted mb-1.5">
            <span>{data.progress.toFixed(1)}%</span>
            <span>
              {data.speed || ""}
              {data.speed && data.eta ? " · " : ""}
              {data.eta ? `ETA ${data.eta}` : ""}
            </span>
          </div>
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                done
                  ? "bg-gradient-to-r from-green to-green/70"
                  : "bg-gradient-to-r from-blue to-blue/70 anim-glow-pulse"
              }`}
              style={{ width: `${Math.min(data.progress, 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Error */}
      {failed && data.error ? (
        <div className="mt-3 p-3 bg-red/5 border border-red/15 rounded-lg text-[12px] text-red font-mono leading-relaxed">
          {data.error}
        </div>
      ) : null}

      {/* Done file */}
      {done && data.filename ? (
        <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-soft">
          <ArrowDown className="w-3 h-3" />
          <span className="font-mono">{data.filename}</span>
        </div>
      ) : null}
    </div>
  );
}
