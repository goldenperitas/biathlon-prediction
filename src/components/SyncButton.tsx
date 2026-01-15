"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/races/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Synced ${data.count} races`);
        router.refresh();
      } else {
        setMessage(data.error || "Sync failed");
      }
    } catch {
      setMessage("Sync failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 transition-colors"
      >
        {loading ? "Syncing..." : "Sync Races"}
      </button>
      {message && (
        <span className="text-sm text-zinc-500">{message}</span>
      )}
    </div>
  );
}
