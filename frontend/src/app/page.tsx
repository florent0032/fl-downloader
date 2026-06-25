"use client";

import { useState, useRef, useEffect } from "react";
import { api, VideoInfo as VideoInfoType, DownloadProgress as ProgressData } from "@/lib/api";
import { VideoForm } from "@/components/VideoForm";
import { VideoInfo } from "@/components/VideoInfo";
import { FormatSelector } from "@/components/FormatSelector";
import { DownloadProgress } from "@/components/DownloadProgress";
import { FolderOpen, Download, AlertCircle, Settings2, AlertTriangle, X, Copy, Check } from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfoType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noFfmpeg, setNoFfmpeg] = useState(false);
  const [showFfmpegModal, setShowFfmpegModal] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Download options
  const [selectedFormat, setSelectedFormat] = useState("bestvideo*+bestaudio/best");
  const [mergeOutputFormat, setMergeOutputFormat] = useState<string | undefined>();
  const [extractAudio, setExtractAudio] = useState(false);
  const [audioFormat, setAudioFormat] = useState("mp3");
  const [savePath, setSavePath] = useState("./downloads");

  // Advanced
  const [showAdv, setShowAdv] = useState(false);
  const [embedMeta, setEmbedMeta] = useState(true);
  const [embedThumb, setEmbedThumb] = useState(false);
  const [writeSubs, setWriteSubs] = useState(false);
  const [subLangs, setSubLangs] = useState("en");
  const [rateLimit, setRateLimit] = useState("");
  const [concurrent, setConcurrent] = useState(1);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [dlTitle, setDlTitle] = useState("");
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    api.getDownloadPath().then(({ path }) => setSavePath(path)).catch(() => {});
    api.getYtdlpInfo().then((info) => setNoFfmpeg(!info.ffmpeg.installed)).catch(() => {});
  }, []);

  const handleParse = async (url: string) => {
    setLoading(true);
    setError(null);
    setVideoInfo(null);
    setProgress(null);
    try {
      const { data } = await api.parse(url);
      setVideoInfo(data);
      // Pick best single-stream format if ffmpeg is missing
      if (noFfmpeg) {
        const single = data.formats.find((f) => f.type === "video+audio");
        if (single) setSelectedFormat(single.format_id);
        else setSelectedFormat("best");
      } else {
        const best = data.formats.find((f) => f.type === "video+audio" && f.height && f.height <= 1080);
        if (best) setSelectedFormat(best.format_id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to parse URL");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo) return;
    setDownloading(true);
    setProgress({ status: "downloading", progress: 0, speed: "", eta: "", error: null, filename: null });
    setDlTitle(videoInfo.title);

    try {
      const params: Record<string, unknown> = {
        url: videoInfo.original_url || videoInfo.url,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        duration: videoInfo.duration,
        uploader: videoInfo.uploader,
        webpage_url: videoInfo.webpage_url,
        format: selectedFormat,
        merge_output_format: mergeOutputFormat,
        save_path: savePath,
        extract_audio: extractAudio,
        audio_format: extractAudio ? audioFormat : undefined,
        embed_metadata: embedMeta,
        embed_thumbnail: embedThumb,
        write_subs: writeSubs,
        sub_langs: writeSubs ? subLangs.split(",").map((s) => s.trim()) : undefined,
        limit_rate: rateLimit || undefined,
        concurrent_fragments: concurrent,
      };

      const { record_id } = await api.download(params);
      cleanupRef.current = api.downloadStatus(
        record_id,
        (d) => setProgress(d),
        () => setDownloading(false)
      );
    } catch (e: unknown) {
      setProgress({ status: "failed", progress: 0, speed: "", eta: "", error: e instanceof Error ? e.message : "Download failed", filename: null });
      setDownloading(false);
    }
  };

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="anim-rise">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
        <p className="text-[13px] text-ink-soft mt-1">Paste a video URL to parse and download</p>
      </div>

      {/* URL input */}
      <VideoForm onParse={handleParse} loading={loading} />

      {/* Error */}
      {error ? (
        <div className="flex items-center gap-3 p-3.5 bg-red/5 border border-red/15 rounded-xl text-red text-[13px] anim-rise">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* ffmpeg warning */}
      {noFfmpeg ? (
        <button
          onClick={() => setShowFfmpegModal(true)}
          className="w-full text-left flex items-center gap-3 p-3.5 bg-amber/5 border border-amber/15 rounded-xl text-amber text-[13px] anim-rise hover:bg-amber/8 transition-colors cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            ffmpeg not installed — click here for installation guide
          </span>
        </button>
      ) : null}

      {/* Video info + format selector */}
      {videoInfo ? (
        <div className="space-y-5">
          <VideoInfo info={videoInfo} />

          <FormatSelector
            formats={videoInfo.formats}
            selectedFormat={selectedFormat}
            onSelectFormat={(fmt, merge) => {
              setSelectedFormat(fmt);
              if (merge) setMergeOutputFormat(merge);
              setExtractAudio(false);
            }}
            extractAudio={extractAudio}
            onToggleExtractAudio={(v) => {
              setExtractAudio(v);
              if (v) { setSelectedFormat("bestaudio/best"); setMergeOutputFormat(undefined); }
              else setSelectedFormat("bestvideo*+bestaudio/best");
            }}
            audioFormat={audioFormat}
            onChangeAudioFormat={setAudioFormat}
          />

          {/* Save path + options + download */}
          <div className="anim-rise-d3 space-y-4">
            {/* Save path */}
            <div className="card-sm p-4">
              <div className="label mb-2 px-1">Save Location</div>
              <div className="flex items-center gap-2.5">
                <FolderOpen className="w-4 h-4 text-ink-muted flex-shrink-0" />
                <input
                  type="text"
                  value={savePath}
                  onChange={(e) => setSavePath(e.target.value)}
                  className="input flex-1"
                />
              </div>
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdv(!showAdv)}
              className="flex items-center gap-2 text-[12px] text-ink-muted hover:text-amber transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {showAdv ? "Hide" : "Show"} advanced options
            </button>

            {/* Advanced panel */}
            {showAdv ? (
              <div className="card p-4 space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Toggle label="Embed metadata" checked={embedMeta} onChange={setEmbedMeta} />
                  <Toggle label="Embed thumbnail" checked={embedThumb} onChange={setEmbedThumb} />
                  <Toggle label="Download subtitles" checked={writeSubs} onChange={setWriteSubs} />
                  {writeSubs ? (
                    <div>
                      <div className="label mb-1.5">Sub languages</div>
                      <input
                        type="text"
                        value={subLangs}
                        onChange={(e) => setSubLangs(e.target.value)}
                        placeholder="en, zh, ja"
                        className="input"
                      />
                    </div>
                  ) : null}
                </div>
                <hr className="divider" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="label mb-1.5">Rate limit</div>
                    <input
                      type="text"
                      value={rateLimit}
                      onChange={(e) => setRateLimit(e.target.value)}
                      placeholder="e.g. 5M"
                      className="input"
                    />
                  </div>
                  <div>
                    <div className="label mb-1.5">Concurrent fragments</div>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={concurrent}
                      onChange={(e) => setConcurrent(Number(e.target.value))}
                      className="input"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn btn-amber w-full py-3.5 text-[15px] font-bold"
            >
              <Download className="w-5 h-5" />
              {downloading ? "Downloading..." : "Start Download"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Progress */}
      {progress ? <DownloadProgress data={progress} title={dlTitle} /> : null}

      {/* ffmpeg install modal */}
      {showFfmpegModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowFfmpegModal(false)}
        >
          <div
            className="w-full max-w-lg card p-6 shadow-2xl anim-rise max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">ffmpeg Not Found</h3>
                  <p className="text-[12px] text-ink-muted">Required for high-quality downloads</p>
                </div>
              </div>
              <button
                onClick={() => setShowFfmpegModal(false)}
                className="p-1.5 rounded-lg hover:bg-surface-3 text-ink-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] text-ink-soft leading-relaxed mb-5">
              ffmpeg is needed to merge separate video + audio streams into the best quality output.
              Without it, only lower-quality single-stream formats are available.
            </p>

            <div className="space-y-4">
              <CmdBlock
                label="Ubuntu / Debian"
                cmd="sudo apt update && sudo apt install -y ffmpeg"
                copiedCmd={copiedCmd}
                onCopy={(c) => { navigator.clipboard.writeText(c); setCopiedCmd(c); setTimeout(() => setCopiedCmd(null), 2000); }}
              />
              <CmdBlock
                label="macOS (Homebrew)"
                cmd="brew install ffmpeg"
                copiedCmd={copiedCmd}
                onCopy={(c) => { navigator.clipboard.writeText(c); setCopiedCmd(c); setTimeout(() => setCopiedCmd(null), 2000); }}
              />
              <CmdBlock
                label="Arch Linux"
                cmd="sudo pacman -S ffmpeg"
                copiedCmd={copiedCmd}
                onCopy={(c) => { navigator.clipboard.writeText(c); setCopiedCmd(c); setTimeout(() => setCopiedCmd(null), 2000); }}
              />
              <div className="card-sm p-4">
                <div className="label mb-2">Windows</div>
                <ol className="text-[12px] text-ink-soft space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Download from <span className="font-mono text-amber">https://ffmpeg.org/download.html</span></li>
                  <li>Extract the archive to a folder (e.g. <span className="font-mono">C:\ffmpeg</span>)</li>
                  <li>Add <span className="font-mono">C:\ffmpeg\bin</span> to your system PATH</li>
                  <li>Restart your terminal and this application</li>
                </ol>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowFfmpegModal(false)}
                className="btn btn-ghost px-6"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-[13px] text-ink-soft">{label}</span>
    </label>
  );
}

function CmdBlock({ label, cmd, copiedCmd, onCopy }: { label: string; cmd: string; copiedCmd: string | null; onCopy: (c: string) => void }) {
  return (
    <div className="card-sm p-4">
      <div className="label mb-2">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-surface-0 border border-edge rounded-lg font-mono text-[12px] text-amber break-all">
          {cmd}
        </code>
        <button
          onClick={() => onCopy(cmd)}
          className="p-2 rounded-lg bg-surface-3 border border-edge hover:border-amber/30 hover:bg-amber-ghost transition-all flex-shrink-0"
          title="Copy"
        >
          {copiedCmd === cmd
            ? <Check className="w-4 h-4 text-green" />
            : <Copy className="w-4 h-4 text-ink-muted" />
          }
        </button>
      </div>
    </div>
  );
}
