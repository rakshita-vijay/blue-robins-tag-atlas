"use client";

import { useState } from "react";
import { ProjectFormBody } from "./ProjectForm";
import type { ParsedProjectDraft } from "@/lib/sections";

export type Draft = ParsedProjectDraft & {
  id: string;
  sourceFileName: string;
};

// At most this many drafts can be expanded (open for review) at the same
// time. Keeping this small is what makes "shown side by side" viable —
// beyond ~3 columns the cards would have to shrink to the point of being
// useless, so instead we ask the user to close one first.
const MAX_EXPANDED = 3;

// Renders each pending draft as a minimized bar stacked bottom-right of
// the screen — the same visual idea as a minimized email compose window.
// Up to MAX_EXPANDED bars can be expanded at once, laid out side by side
// above a dimming backdrop (same treatment as the "New project" modal) so
// there's a clear line between "thing you're editing" and "rest of the
// app" — while the minimized dock itself stays above that backdrop so you
// can still pick another draft to open.
export default function DraftDock({
  drafts,
  allTags,
  userId,
  onSaved,
  onDiscard,
  onDiscardAll,
}: {
  drafts: Draft[];
  allTags: string[];
  userId: string;
  onSaved: (draftId: string) => void;
  onDiscard: (draftId: string) => void;
  onDiscardAll: () => void;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    drafts.slice(0, 1).map((d) => d.id)
  );
  const [limitNotice, setLimitNotice] = useState(false);

  if (drafts.length === 0) return null;

  function expand(id: string) {
    setExpandedIds((prev) => {
      if (prev.includes(id)) return prev;
      if (prev.length >= MAX_EXPANDED) {
        setLimitNotice(true);
        window.setTimeout(() => setLimitNotice(false), 2800);
        return prev;
      }
      return [...prev, id];
    });
  }

  function minimize(id: string) {
    setExpandedIds((prev) => prev.filter((x) => x !== id));
  }

  function handleDiscard(id: string) {
    minimize(id);
    onDiscard(id);
  }

  function handleDiscardAll() {
    const ok = window.confirm(
      `Discard all ${drafts.length} detected draft${
        drafts.length === 1 ? "" : "s"
      }? This cannot be undone.`
    );
    if (!ok) return;
    setExpandedIds([]);
    onDiscardAll();
  }

  const expandedDrafts = drafts.filter((d) => expandedIds.includes(d.id));
  const minimizedDrafts = drafts.filter((d) => !expandedIds.includes(d.id));

  return (
    <>
      {expandedDrafts.length > 0 ? (
        <div className="draftBackdrop" onClick={() => setExpandedIds([])} />
      ) : null}

      {expandedDrafts.length > 0 ? (
        <div className="draftExpandedRow">
          {expandedDrafts.map((draft) => (
            <div
              className="draftWindow expanded"
              key={draft.id}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="draftWindowHeader"
                onClick={() => minimize(draft.id)}
              >
                <span className="draftWindowTitle">
                  {draft.title || "Untitled project"}
                </span>
                <div className="draftWindowActions">
                  <span
                    className="draftWindowIconBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      minimize(draft.id);
                    }}
                    title="Minimize"
                  >
                    {"\u2013"}
                  </span>
                  <span
                    className="draftWindowIconBtn danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDiscard(draft.id);
                    }}
                    title="Discard this draft"
                  >
                    ×
                  </span>
                </div>
              </div>

              <div className="draftWindowBody">
                <p className="muted small">
                  Detected as a separate project in{" "}
                  <strong>{draft.sourceFileName}</strong> — check it over
                  before saving.
                </p>
                <ProjectFormBody
                  project={null}
                  initialTitle={draft.title}
                  initialSections={draft.sections}
                  allTags={allTags}
                  userId={userId}
                  onCancel={() => handleDiscard(draft.id)}
                  onSaved={() => onSaved(draft.id)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="draftDock">
        <div className="draftDockHeader">
          <span className="muted small">
            {drafts.length} project{drafts.length === 1 ? "" : "s"} found in
            your upload — review and save each one
          </span>
          <span
            className="linkish small draftDeleteAll"
            onClick={handleDiscardAll}
          >
            Delete all
          </span>
        </div>

        {limitNotice ? (
          <div className="draftLimitNotice small">
            Only {MAX_EXPANDED} can be open at once — close one first, then
            open another.
          </div>
        ) : null}

        <div className="draftDockRow">
          {minimizedDrafts.map((draft) => (
            <div className="draftWindow minimized" key={draft.id}>
              <div
                className="draftWindowHeader"
                onClick={() => expand(draft.id)}
              >
                <span className="draftWindowTitle">
                  {draft.title || "Untitled project"}
                </span>
                <div className="draftWindowActions">
                  <span
                    className="draftWindowIconBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      expand(draft.id);
                    }}
                    title="Expand"
                  >
                    {"\u25A1"}
                  </span>
                  <span
                    className="draftWindowIconBtn danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDiscard(draft.id);
                    }}
                    title="Discard this draft"
                  >
                    ×
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
