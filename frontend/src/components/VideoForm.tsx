"use client";

import { useState } from "react";
import { Link2, Search, Loader2 } from "lucide-react";

interface Props {
  onParse: (url: string) => void;
  loading: boolean;
}

export function VideoForm({ onParse, loading }: Props) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onParse(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="anim-rise">
      <div className="card p-4">
        <div className="label mb-3 px-1">Video URL</div>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" strokeWidth={2} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or any supported URL"
              className="input pl-10 py-3"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="btn btn-amber px-6"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Parsing" : "Parse"}
          </button>
        </div>
      </div>
    </form>
  );
}
