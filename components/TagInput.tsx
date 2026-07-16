"use client";

import { useState } from "react";

// A chip-style tag editor: shows current tags as removable chips, lets you
// click any existing tag from earlier projects to reuse it, and lets you
// type brand-new tags that aren't in the suggestions yet.
export default function TagInput({
  tags,
  onChange,
  suggestions,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
      setDraft("");
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const unusedSuggestions = suggestions.filter((s) => !tags.includes(s));

  return (
    <div className="tagInput">
      <div className="tags">
        {tags.map((tag) => (
          <span key={tag} className="chip removable" onClick={() => removeTag(tag)}>
            {tag} ×
          </span>
        ))}
      </div>

      <input
        placeholder="Type a new tag and press Enter…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {unusedSuggestions.length > 0 ? (
        <div className="suggestions">
          <span className="muted small">Reuse an existing tag:</span>
          <div className="bubbleWrap">
            {unusedSuggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                className="bubble small"
                onClick={() => addTag(tag)}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
