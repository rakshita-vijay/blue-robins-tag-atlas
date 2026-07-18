"use client";

import { useEffect, useState } from "react";

type Cluster = { tags: string[]; suggestedCanonical: string; reason: string };

export default function TagCleanup({
  allTags,
  onMerge,
  onClose,
}: {
  allTags: string[];
  onMerge: (tagsToMerge: string[], canonical: string) => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [mergingIndex, setMergingIndex] = useState<number | null>(null);
  const [doneIndexes, setDoneIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/cluster-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: allTags }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "AI tag cleanup failed.");
          return;
        }
        const found: Cluster[] = data.clusters ?? [];
        setClusters(found);
        const initialChoices: Record<number, string> = {};
        found.forEach((c, i) => {
          initialChoices[i] = c.suggestedCanonical;
        });
        setChoices(initialChoices);
      } catch {
        if (!cancelled) setError("Couldn't reach the AI tag cleanup service.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMerge(index: number) {
    const cluster = clusters[index];
    const canonical = choices[index] ?? cluster.suggestedCanonical;
    setMergingIndex(index);
    try {
      await onMerge(cluster.tags, canonical);
      setDoneIndexes((prev) => new Set(prev).add(index));
    } finally {
      setMergingIndex(null);
    }
  }

  const pendingClusters = clusters.filter((_, i) => !doneIndexes.has(i));

  return (
    <div className="modal" onClick={onClose}>
      <div className="modalCard formModalCard" onClick={(e) => e.stopPropagation()}>
        <div className="rowSpace">
          <h3>Clean up tags</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="muted small">
          AI looks across all {allTags.length} of your tags for ones that
          likely mean the same thing — different phrasing, casing, or
          abbreviations of one concept — and suggests merging them. Nothing
          merges until you confirm each one.
        </p>

        {loading ? <p className="muted small">Scanning your tags…</p> : null}
        {error ? <p className="errorMsg small">{error}</p> : null}

        {!loading && !error && clusters.length === 0 ? (
          <p className="muted small">
            ✓ No likely duplicates found — your tags already look distinct
            from each other.
          </p>
        ) : null}

        {pendingClusters.length > 0 ? (
          <div className="weekList">
            {clusters.map((cluster, i) => {
              if (doneIndexes.has(i)) return null;
              return (
                <div className="weekItem" key={i}>
                  <p className="small">
                    <strong>{cluster.tags.join(", ")}</strong>
                  </p>
                  <p className="muted small">{cluster.reason}</p>

                  <div className="rowGap">
                    {cluster.tags.map((tag) => (
                      <label key={tag} className="bubble small aiSuggestionChip">
                        <input
                          type="radio"
                          name={`cluster-${i}`}
                          checked={choices[i] === tag}
                          onChange={() =>
                            setChoices((prev) => ({ ...prev, [i]: tag }))
                          }
                          style={{ marginRight: 6 }}
                        />
                        {tag}
                      </label>
                    ))}
                  </div>

                  <div className="rowGap" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="button ghost"
                      disabled={mergingIndex === i}
                      onClick={() => handleMerge(i)}
                    >
                      {mergingIndex === i
                        ? "Merging…"
                        : `Merge into "${choices[i] ?? cluster.suggestedCanonical}"`}
                    </button>
                    <span
                      className="linkish small"
                      onClick={() =>
                        setDoneIndexes((prev) => new Set(prev).add(i))
                      }
                    >
                      skip
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {!loading && clusters.length > 0 && pendingClusters.length === 0 ? (
          <p className="muted small">✓ All clusters handled.</p>
        ) : null}
      </div>
    </div>
  );
}
