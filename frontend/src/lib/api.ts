const API_BASE = "http://localhost:8200/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export interface VideoInfo {
  url: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
  webpage_url: string;
  description: string;
  view_count: number | null;
  like_count: number | null;
  upload_date: string | null;
  formats: FormatInfo[];
  chapters: { start: number; end: number; title: string }[];
  extractor: string;
  original_url: string;
}

export interface FormatInfo {
  format_id: string;
  ext: string;
  resolution: string;
  width: number | null;
  height: number | null;
  fps: number | null;
  vcodec: string;
  acodec: string;
  tbr: number | null;
  vbr: number | null;
  abr: number | null;
  filesize: number | null;
  format_note: string;
  type: string;
  protocol: string;
}

export interface DownloadRecord {
  id: string;
  url: string;
  title: string | null;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
  webpage_url: string | null;
  format_id: string | null;
  format_note: string | null;
  ext: string | null;
  resolution: string | null;
  vcodec: string | null;
  acodec: string | null;
  fps: number | null;
  filesize: number | null;
  tbr: number | null;
  save_path: string | null;
  filename: string | null;
  status: string;
  progress: number;
  speed: string | null;
  eta: string | null;
  error_message: string | null;
  created_at: string | null;
  completed_at: string | null;
}

export interface DownloadProgress {
  status: string;
  progress: number;
  speed: string;
  eta: string;
  error: string | null;
  filename: string | null;
}

export const api = {
  // Parse
  parse: (url: string) =>
    request<{ success: boolean; data: VideoInfo }>("/parse", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  // Download
  download: (params: Record<string, unknown>) =>
    request<{ success: boolean; record_id: string; status: string }>(
      "/download",
      { method: "POST", body: JSON.stringify(params) }
    ),

  // SSE for download progress
  downloadStatus: (recordId: string, onUpdate: (data: DownloadProgress) => void, onDone: () => void) => {
    const es = new EventSource(`${API_BASE}/download/${recordId}/status`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as DownloadProgress;
      onUpdate(data);
      if (data.status === "completed" || data.status === "failed") {
        es.close();
        onDone();
      }
    };
    es.onerror = () => {
      es.close();
      onDone();
    };
    return () => es.close();
  },

  // Records
  getRecords: (params?: { status?: string; search?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    return request<{ records: DownloadRecord[]; total: number; page: number; page_size: number }>(
      `/records?${qs}`
    );
  },

  getRecord: (id: string) =>
    request<{ record: DownloadRecord }>(`/records/${id}`),

  deleteRecord: (id: string, deleteFile = false) =>
    request<{ success: boolean; file_deleted: boolean }>(
      `/records/${id}?delete_file=${deleteFile}`,
      { method: "DELETE" }
    ),

  batchDelete: (ids: string[], deleteFiles = false) =>
    request<{ success: boolean; deleted_count: number; files_deleted: number }>(
      "/records/batch-delete",
      { method: "POST", body: JSON.stringify({ record_ids: ids, delete_files: deleteFiles }) }
    ),

  getFileInfo: (id: string) =>
    request<{ save_path: string; filename: string | null; file_exists: boolean; file_size: number | null; full_path: string | null }>(
      `/records/${id}/file-info`
    ),

  openFolder: (id: string) =>
    request<{ success: boolean; opened?: string; error?: string; path?: string }>(
      `/records/${id}/open-folder`
    ),

  // Settings
  getYtdlpInfo: () =>
    request<{ ytdlp: { installed: boolean; version: string | null }; ffmpeg: { installed: boolean; version: string | null } }>(
      "/settings/ytdlp"
    ),

  updateYtdlp: (channel = "stable") =>
    request<{ success: boolean; version?: string; error?: string; output?: string }>(
      `/settings/ytdlp/update?channel=${channel}`,
      { method: "POST" }
    ),

  getLogs: (lines = 200) =>
    request<{ logs: string[]; log_file: string }>(`/settings/logs?lines=${lines}`),

  getDownloadPath: () =>
    request<{ path: string }>("/settings/download-path"),
};
