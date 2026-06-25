"use client";

import { useState, useEffect, useCallback } from "react";
import { api, DownloadRecord } from "@/lib/api";
import {
  Search, Trash2, FolderOpen, CheckCircle2, XCircle, Loader2,
  Clock, Eye, ChevronLeft, ChevronRight, AlertTriangle, X,
} from "lucide-react";

const FILTERS = [
  { v: "all", l: "All" },
  { v: "completed", l: "Success" },
  { v: "failed", l: "Failed" },
  { v: "downloading", l: "Active" },
  { v: "pending", l: "Pending" },
];

function fmtSize(b: number | null) {
  if (!b) return "--";
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}

function Badge({ s }: { s: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    completed: { cls: "badge-green", icon: <CheckCircle2 className="w-3 h-3" /> },
    downloading: { cls: "badge-blue", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    failed: { cls: "badge-red", icon: <XCircle className="w-3 h-3" /> },
    pending: { cls: "badge-amber", icon: <Clock className="w-3 h-3" /> },
  };
  const { cls, icon } = map[s] || map.pending;
  return <span className={`badge ${cls}`}>{icon}{s}</span>;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [delModal, setDelModal] = useState<{ ids: string[] } | null>(null);
  const [delFiles, setDelFiles] = useState(false);
  const [detail, setDetail] = useState<DownloadRecord | null>(null);
  const pageSize = 15;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getRecords({ status: filter, search: search || undefined, page, page_size: pageSize });
      setRecords(d.records);
      setTotal(d.total);
    } catch {} finally { setLoading(false); }
  }, [filter, search, page]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!records.some((r) => r.status === "downloading" || r.status === "pending")) return;
    const t = setInterval(fetch, 2000);
    return () => clearInterval(t);
  }, [records, fetch]);

  const pages = Math.ceil(total / pageSize);
  const toggleSel = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((p) => p.size === records.length ? new Set() : new Set(records.map((r) => r.id)));

  const doDelete = async () => {
    if (!delModal) return;
    if (delModal.ids.length === 1) await api.deleteRecord(delModal.ids[0], delFiles);
    else await api.batchDelete(delModal.ids, delFiles);
    setDelModal(null);
    setDelFiles(false);
    setSelected(new Set());
    fetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="anim-rise">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Records</h1>
        <p className="text-[13px] text-ink-soft mt-1">Download history and file management</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 anim-rise-d1">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search title or URL..."
            className="input pl-9 py-2.5"
          />
        </div>
        <div className="flex bg-surface-2 border border-edge rounded-xl overflow-hidden">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              onClick={() => { setFilter(f.v); setPage(1); }}
              className={`px-3.5 py-2 text-[12px] font-medium transition-colors ${
                filter === f.v ? "bg-amber-ghost text-amber" : "text-ink-muted hover:text-ink-soft"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
        {selected.size > 0 ? (
          <button
            onClick={() => setDelModal({ ids: [...selected] })}
            className="btn btn-danger px-4 py-2 text-[12px]"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete ({selected.size})
          </button>
        ) : null}
      </div>

      {/* Table */}
      <div className="card overflow-hidden anim-rise-d2">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-surface-3 text-ink-muted font-mono text-[10px] uppercase tracking-wider">
              <th className="px-3.5 py-2.5 w-10"><input type="checkbox" checked={records.length > 0 && selected.size === records.length} onChange={toggleAll} /></th>
              <th className="text-left px-3.5 py-2.5">Title</th>
              <th className="text-left px-3.5 py-2.5">Format</th>
              <th className="text-left px-3.5 py-2.5">Size</th>
              <th className="text-left px-3.5 py-2.5">Status</th>
              <th className="text-left px-3.5 py-2.5">Date</th>
              <th className="text-right px-3.5 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !records.length ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-ink-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...</td></tr>
            ) : !records.length ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-ink-muted">No records found</td></tr>
            ) : records.map((r) => (
              <tr key={r.id} className="border-t border-edge hover:bg-surface-3/50 transition-colors">
                <td className="px-3.5 py-2.5"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} /></td>
                <td className="px-3.5 py-2.5">
                  <div className="flex items-center gap-3">
                    {r.thumbnail ? (
                      <img src={r.thumbnail} alt="" className="w-14 h-8 object-cover rounded-md bg-surface-3 flex-shrink-0" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-14 h-8 rounded-md bg-surface-3 flex items-center justify-center flex-shrink-0"><Eye className="w-3.5 h-3.5 text-ink-muted" /></div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink truncate max-w-[260px]">{r.title || "Unknown"}</div>
                      <div className="text-[10px] font-mono text-ink-muted truncate max-w-[260px]">{r.url}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3.5 py-2.5 font-mono">
                  <span className="text-ink">{r.format_id || "--"}</span>
                  {r.ext ? <span className="text-ink-muted ml-1">.{r.ext}</span> : null}
                </td>
                <td className="px-3.5 py-2.5 font-mono text-ink-soft">{fmtSize(r.filesize)}</td>
                <td className="px-3.5 py-2.5">
                  <Badge s={r.status} />
                  {r.status === "downloading" && r.progress > 0 ? (
                    <div className="mt-1.5 w-16 h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-full bg-blue rounded-full" style={{ width: `${r.progress}%` }} />
                    </div>
                  ) : null}
                </td>
                <td className="px-3.5 py-2.5 font-mono text-ink-muted">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "--"}
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex items-center justify-end gap-0.5">
                    <IconBtn icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setDetail(r)} title="Details" />
                    {r.status === "completed" ? (
                      <IconBtn
                        icon={<FolderOpen className="w-3.5 h-3.5" />}
                        onClick={async () => {
                          try {
                            await api.openFolder(r.id);
                          } catch (e) {
                            alert(e instanceof Error ? e.message : "Failed to open folder");
                          }
                        }}
                        title="Open file location"
                      />
                    ) : null}
                    <IconBtn icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDelModal({ ids: [r.id] })} title="Delete" danger />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 ? (
        <div className="flex items-center justify-between anim-rise-d3">
          <span className="text-[11px] font-mono text-ink-muted">{total} records</span>
          <div className="flex items-center gap-1.5">
            <PBtn onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></PBtn>
            <span className="text-[11px] font-mono text-ink-muted px-2">{page} / {pages}</span>
            <PBtn onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}><ChevronRight className="w-4 h-4" /></PBtn>
          </div>
        </div>
      ) : null}

      {/* Delete modal */}
      {delModal ? (
        <Modal onClose={() => setDelModal(null)}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red" /></div>
            <div>
              <div className="font-semibold text-ink">Confirm Delete</div>
              <div className="text-[12px] text-ink-muted">{delModal.ids.length === 1 ? "Delete this record?" : `Delete ${delModal.ids.length} records?`}</div>
            </div>
          </div>
          <label className="flex items-center gap-2.5 p-3 bg-surface-1 border border-edge rounded-xl text-[13px] cursor-pointer mb-5">
            <input type="checkbox" checked={delFiles} onChange={(e) => setDelFiles(e.target.checked)} />
            <Trash2 className="w-4 h-4 text-ink-muted" />
            <span className="text-ink-soft">Also delete source files from disk</span>
          </label>
          <div className="flex gap-3">
            <button onClick={() => setDelModal(null)} className="btn btn-ghost flex-1 py-2.5">Cancel</button>
            <button onClick={doDelete} className="btn flex-1 py-2.5 bg-red/80 text-white hover:bg-red">Delete</button>
          </div>
        </Modal>
      ) : null}

      {/* Detail modal */}
      {detail ? (
        <Modal onClose={() => setDetail(null)}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink">Record Details</h3>
            <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-surface-3 text-ink-muted"><X className="w-4 h-4" /></button>
          </div>
          {detail.thumbnail ? <img src={detail.thumbnail} alt="" className="w-full h-44 object-cover rounded-xl mb-4" crossOrigin="anonymous" /> : null}
          <div className="space-y-0">
            <Row l="Title" v={detail.title} />
            <Row l="URL" v={detail.url} mono />
            <Row l="Status" v={detail.status} />
            <Row l="Format" v={`${detail.format_id || "--"} .${detail.ext || "--"}`} mono />
            <Row l="Resolution" v={detail.resolution} />
            <Row l="Codec" v={`${detail.vcodec || "--"} / ${detail.acodec || "--"}`} mono />
            <Row l="Size" v={fmtSize(detail.filesize)} mono />
            <Row l="Path" v={detail.save_path} mono />
            <Row l="File" v={detail.filename} mono />
            <Row l="Created" v={detail.created_at ? new Date(detail.created_at).toLocaleString() : null} mono />
            <Row l="Done" v={detail.completed_at ? new Date(detail.completed_at).toLocaleString() : null} mono />
          </div>
          {detail.error_message ? (
            <div className="mt-3 p-3 bg-red/5 border border-red/15 rounded-lg text-[11px] text-red font-mono">{detail.error_message}</div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────── */

function IconBtn({ icon, onClick, title, danger }: { icon: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${danger ? "hover:bg-red/10 text-ink-muted hover:text-red" : "hover:bg-surface-3 text-ink-muted hover:text-ink-soft"}`}
    >
      {icon}
    </button>
  );
}

function PBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="p-1.5 rounded-lg hover:bg-surface-2 disabled:opacity-30 text-ink-muted transition-colors">
      {children}
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg card p-6 shadow-2xl anim-rise max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Row({ l, v, mono }: { l: string; v: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex gap-4 py-2 border-b border-edge last:border-0">
      <span className="text-ink-muted w-20 flex-shrink-0 text-[12px]">{l}</span>
      <span className={`${mono ? "font-mono text-[11px]" : "text-[12px]"} text-ink-soft break-all`}>{v || "--"}</span>
    </div>
  );
}
