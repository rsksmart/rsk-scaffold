"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LogEntry } from "../_hooks/useGaslessDemo";

interface TransactionLogProps {
  logs: LogEntry[];
  txHash: string;
  onClear: () => void;
}

type LogLevel = "error" | "warn" | "success" | "info";

interface ClassifiedLog {
  level: LogLevel;
  text: string;
  // Stable monotonic id propagated from the source LogEntry. Used as the
  // React key so filter toggles and clears never reuse keys across
  // semantically different entries.
  id: number;
}

// Severity is inferred from the existing emoji-prefixed log convention
// in useGaslessDemo so we don't have to refactor every addLog() call site.
function classifyLog(entry: LogEntry): ClassifiedLog {
  const { id, text } = entry;
  // Strip the leading "[HH:MM:SS] " prefix, then look at the first
  // non-whitespace token for an emoji.
  const trimmed = text.replace(/^\[[^\]]+\]\s*/, "");
  if (trimmed.startsWith("❌")) return { level: "error", text, id };
  if (trimmed.startsWith("⚠️") || trimmed.startsWith("⚠")) return { level: "warn", text, id };
  if (trimmed.startsWith("✅") || trimmed.startsWith("🎉") || trimmed.startsWith("💰"))
    return { level: "success", text, id };
  return { level: "info", text, id };
}

const LEVEL_CLASS: Record<LogLevel, string> = {
  error: "text-error",
  warn: "text-warning",
  success: "text-success",
  info: "text-base-content/80",
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  error: "Errors",
  warn: "Warnings",
  success: "Success",
  info: "Info",
};

const ALL_LEVELS: LogLevel[] = ["error", "warn", "success", "info"];

export function TransactionLog({ logs, txHash, onClear }: TransactionLogProps) {
  const [enabled, setEnabled] = useState<Record<LogLevel, boolean>>({
    error: true,
    warn: true,
    success: true,
    info: true,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  // Track whether the user is "pinned" to the bottom of the scroll
  // container. New entries autoscroll only while the user hasn't manually
  // scrolled up, so reading earlier entries isn't yanked away on each new
  // log line.
  const pinnedToBottomRef = useRef(true);

  const classified = useMemo(() => logs.map(classifyLog), [logs]);
  const visible = useMemo(() => classified.filter(entry => enabled[entry.level]), [classified, enabled]);

  // Track scroll position to maintain the pinned-to-bottom state.
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottomRef.current = distanceFromBottom < 8; // tolerate 8px slop
  };

  // Autoscroll on new entries when pinned. Runs after the DOM is updated.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (pinnedToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [visible.length]);

  return (
    <div className="bg-secondary p-4 rounded-lg w-full h-min border border-border">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 id="transaction-log-heading" className="m-0 font-semibold">
          Transaction Log
        </h3>
        <div className="flex items-center gap-2">
          <fieldset className="flex items-center gap-2 text-xs" aria-label="Filter log entries by severity">
            <legend className="sr-only">Filter log entries by severity</legend>
            {ALL_LEVELS.map(level => (
              <label key={level} className={`flex items-center gap-1 cursor-pointer ${LEVEL_CLASS[level]}`}>
                <input
                  type="checkbox"
                  checked={enabled[level]}
                  onChange={e => setEnabled(prev => ({ ...prev, [level]: e.target.checked }))}
                  aria-label={`Show ${LEVEL_LABEL[level]}`}
                />
                {LEVEL_LABEL[level]}
              </label>
            ))}
          </fieldset>
          <button
            className="bg-brand-pink rounded-md py-1 px-2 text-black text-xs font-medium disabled:opacity-50"
            onClick={onClear}
            aria-label="Clear transaction log"
          >
            Clear
          </button>
        </div>
      </div>
      <hr className="my-3 border-1 border-white-400 rounded-full" />
      <div className="flex flex-col gap-2">
        {/*
          aria-live="polite" announces newly appended log lines without
          interrupting the user. role="log" is the appropriate landmark
          for a chronological message list. aria-labelledby ties the
          region back to the visible heading.
        */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-labelledby="transaction-log-heading"
          className="bg-base-300 rounded p-4 font-mono text-xs max-h-96 overflow-y-auto"
        >
          {logs.length === 0 ? (
            <p className="opacity-50 m-0">No activity yet...</p>
          ) : visible.length === 0 ? (
            <p className="opacity-50 m-0">All entries filtered out by severity selection.</p>
          ) : (
            visible.map(entry => (
              <div key={entry.id} className={`mb-1 ${LEVEL_CLASS[entry.level]}`}>
                {entry.text}
              </div>
            ))
          )}
        </div>
        {txHash && (
          <div className="mt-2 p-3 bg-success/10 border border-success/20 rounded">
            <p className="text-xs font-semibold mb-1">Latest Transaction Hash:</p>
            <a
              href={`https://explorer.testnet.rootstock.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 break-all hover:underline text-xs font-mono"
            >
              {txHash}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
