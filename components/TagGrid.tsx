"use client";

import { useMemo, useState } from "react";
import PagedBubbleGrid from "./PagedBubbleGrid";

type Props = {
  tags: string[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
};

// The top tag bar: a search box filters the tag list live, and whatever
// matches is laid out via PagedBubbleGrid (3 rows, then horizontal paging).
export default function TagGrid({ tags, selectedTags, onToggle }: Props) {
  const [query, setQuery] = useState("");

  const visibleTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.toLowerCase().includes(q));
  }, [tags, query]);

  return (
    <div className="tagGridOuter">
      <input
        className="tagSearchInput"
        type="text"
        placeholder="Search tags…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {visibleTags.length === 0 ? (
        <p className="muted small">No tags match &quot;{query}&quot;.</p>
      ) : (
        <PagedBubbleGrid
          items={visibleTags}
          renderItem={(tag) => (
            <button
              type="button"
              className={`bubble ${selectedTags.includes(tag) ? "on" : ""}`}
              onClick={() => onToggle(tag)}
            >
              {tag}
            </button>
          )}
        />
      )}
    </div>
  );
}
