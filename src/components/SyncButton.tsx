"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton() {
  const [loadingRaces, setLoadingRaces] = useState(false);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSyncRaces = async () => {
    setLoadingRaces(true);
    setMessage(null);

    try {
      const response = await fetch("/api/races/sync", { method: "POST" });
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
      setLoadingRaces(false);
    }
  };

  const handleSyncAthletes = async () => {
    setLoadingAthletes(true);
    setMessage(null);

    try {
      const response = await fetch("/api/athletes/sync", { method: "POST" });
      const data = await response.json();

      if (response.ok) {
        setMessage(`Synced ${data.count} athletes`);
      } else {
        setMessage(data.error || "Sync failed");
      }
    } catch {
      setMessage("Sync failed");
    } finally {
      setLoadingAthletes(false);
    }
  };

  const loading = loadingRaces || loadingAthletes;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSyncRaces}
        disabled={loading}
        className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 transition-colors"
      >
        {loadingRaces ? "..." : "Sync Races"}
      </button>
      <button
        onClick={handleSyncAthletes}
        disabled={loading}
        className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 transition-colors"
      >
        {loadingAthletes ? "..." : "Sync Athletes"}
      </button>
      {message && (
        <span className="text-sm text-zinc-500">{message}</span>
      )}
    </div>
  );
}
