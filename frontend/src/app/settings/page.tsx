"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import {
  RefreshCw, CheckCircle2, XCircle, Loader2, Terminal, Download,
  HelpCircle, ArrowRight,
} from "lucide-react";

export default function SettingsPage() {
  const [info, setInfo] = useState<{
    ytdlp: { installed: boolean; version: string | null };
    ffmpeg: { installed: boolean; version: string | null };
  } | null>(null);
  const [channel, setChannel] = useState("stable");
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { refresh(); loadLogs(); }, []);

  const refresh = async () => {
    try { setInfo(await api.getYtdlpInfo()); } catch {}
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const d = await api.getLogs(200);
      setLogs(d.logs);
      setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }), 50);
    } catch {} finally { setLoadingLogs(false); }
  };

  const doUpdate = async () => {
    setUpdating(true);
    setResult(null);
    try {
      const r = await api.updateYtdlp(channel);
      setResult(r.success
        ? { ok: true, msg: `Updated to v${r.version || "?"}` }
        : { ok: false, msg: r.error || "Update failed" }
      );
      if (r.success) refresh();
    } catch (e: unknown) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "Error" });
    } finally { setUpdating(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="anim-rise">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="text-[13px] text-ink-soft mt-1">Manage installation and view system logs</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4 anim-rise-d1">
        <StatusCard
          label="yt-dlp"
          ok={info?.ytdlp.installed ?? false}
          detail={info?.ytdlp.installed ? `v${info.ytdlp.version}` : "Not installed"}
        />
        <StatusCard
          label="ffmpeg"
          ok={info?.ffmpeg.installed ?? false}
          detail={info?.ffmpeg.version || "Not installed"}
        />
      </div>

      {/* Update section */}
      <div className="card p-5 anim-rise-d1">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-amber" />
          <span className="text-[14px] font-semibold text-ink">Install / Update yt-dlp</span>
        </div>

        <div className="flex items-end gap-3">
          <div>
            <div className="label mb-1.5">Channel</div>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="stable">Stable</option>
              <option value="nightly">Nightly</option>
              <option value="master">Master</option>
            </select>
          </div>
          <button onClick={doUpdate} disabled={updating} className="btn btn-amber">
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {updating ? "Updating..." : "Update"}
          </button>
          <button onClick={refresh} className="btn btn-ghost p-2.5"><RefreshCw className="w-4 h-4" /></button>
        </div>

        {result ? (
          <div className={`mt-4 p-3 rounded-xl text-[12px] font-mono ${result.ok ? "bg-green/5 border border-green/15 text-green" : "bg-red/5 border border-red/15 text-red"}`}>
            {result.msg}
          </div>
        ) : null}
      </div>

      {/* Help */}
      <div className="card p-5 anim-rise-d2">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-amber" />
          <span className="text-[14px] font-semibold text-ink">Quick Reference</span>
        </div>
        <div className="space-y-2">
          <Help title="Supported Sites" desc="YouTube, Bilibili, Twitter/X, TikTok, Vimeo, Twitch, and 1000+ more. Paste any URL in Dashboard." />
          <Help title="Format Selection" desc="Use Quick Presets for common choices, or pick specific formats. 'Best' = highest quality video+audio." />
          <Help title="Audio Extraction" desc="Check 'Extract audio only' to get MP3/AAC/FLAC. Requires ffmpeg installed." />
          <Help title="Subtitles" desc="Enable in Advanced Options. Specify languages like 'en, zh, ja' or 'all'." />
        </div>
      </div>

      {/* Logs */}
      <div className="card p-5 anim-rise-d3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber" />
            <span className="text-[14px] font-semibold text-ink">Application Logs</span>
          </div>
          <button onClick={loadLogs} className="btn btn-ghost px-3 py-1.5 text-[11px]">
            <RefreshCw className={`w-3 h-3 ${loadingLogs ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        <div
          ref={logRef}
          className="h-56 overflow-y-auto bg-surface-0 border border-edge rounded-xl p-4 font-mono text-[11px] leading-relaxed"
        >
          {logs.length === 0 ? (
            <div className="text-ink-muted text-center py-10">No logs yet</div>
          ) : logs.map((l, i) => (
            <div key={i} className="text-ink-soft whitespace-pre-wrap break-all">{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        {ok ? <CheckCircle2 className="w-4 h-4 text-green" /> : <XCircle className="w-4 h-4 text-red" />}
        <span className="text-[13px] font-medium text-ink">{label}</span>
      </div>
      <div className="font-mono text-[12px] text-ink-soft">{detail}</div>
    </div>
  );
}

function Help({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex gap-3 p-3 bg-surface-1 border border-edge rounded-xl">
      <ArrowRight className="w-4 h-4 text-amber/50 flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-[13px] font-medium text-ink">{title}</div>
        <div className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
