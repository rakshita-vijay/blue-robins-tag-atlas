"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectSections } from "@/lib/types";
import {
  MAX_WEEKS,
  MIN_WEEKS,
  composeContent,
  emptySections,
  parseSections,
  sectionsAreEmpty,
  splitMultipleProjects,
  type ParsedProjectDraft,
} from "@/lib/sections";
import TagInput from "./TagInput";

export type { ParsedProjectDraft };

const ACCEPTED_EXTENSIONS = [".md", ".txt"];

type SynonymNote = { newTag: string; existingTag: string; reason: string };

type TagSuggestions = {
  existingTagsToApply: string[];
  suggestedNewTags: string[];
  synonymNotes: SynonymNote[];
};

// The actual editable form: title, file upload, all the sections, tags,
// AI tag suggestions, and the save button. No modal chrome of its own —
// this is what both ProjectForm (the centered modal, below) and DraftDock
// (the minimized-drafts stack for multi-project file uploads) render
// inside their own wrapper, so the two stay in sync automatically instead
// of maintaining two copies of this logic.
export function ProjectFormBody({
  project,
  initialTitle,
  initialSections,
  allTags,
  userId,
  onCancel,
  onSaved,
  onMultipleProjectsDetected,
}: {
  project: Project | null;
  // Seed values for a brand-new, not-yet-saved draft (e.g. one split out
  // of a multi-project file upload). Ignored once `project` is set.
  initialTitle?: string;
  initialSections?: ProjectSections;
  allTags: string[];
  userId: string;
  // Called when a file upload turns out to contain multiple projects, so
  // this form hands the split-out drafts to whoever's hosting it (the
  // Board) and gets out of the way — see handleFileChange below.
  onCancel: () => void;
  onSaved: () => void;
  onMultipleProjectsDetected?: (drafts: ParsedProjectDraft[], sourceFileName: string) => void;
}) {
  const [title, setTitle] = useState(project?.title ?? initialTitle ?? "");
  const [sections, setSections] = useState<ProjectSections>(() => {
    if (project?.sections) return project.sections;
    // Older projects saved before this structured form existed only have a
    // flat `content` string — carry it into Intro so nothing is lost, and
    // the user can redistribute it into the other fields if they want.
    if (project?.content) {
      return { ...emptySections(), intro: project.content };
    }
    if (initialSections) return initialSections;
    return emptySections();
  });
  const [tags, setTags] = useState<string[]>(project?.tags ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(project?.file_name ?? null);
  const [fileParseNote, setFileParseNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TagSuggestions | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const isLegacyOnly = !project?.sections && !!project?.content;

  function updateSection<K extends keyof Omit<ProjectSections, "weeks">>(
    key: K,
    value: string
  ) {
    setSections((prev) => ({ ...prev, [key]: value }));
  }

  function updateWeek(index: number, value: string) {
    setSections((prev) => {
      const weeks = [...prev.weeks];
      weeks[index] = value;
      return { ...prev, weeks };
    });
  }

  function setWeekCount(count: number) {
    const clamped = Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, count));
    setSections((prev) => {
      const weeks = [...prev.weeks];
      while (weeks.length < clamped) weeks.push("");
      weeks.length = clamped;
      return { ...prev, weeks };
    });
  }

  function removeWeekAt(index: number) {
    setSections((prev) => {
      if (prev.weeks.length <= MIN_WEEKS) return prev;
      const weeks = prev.weeks.filter((_, i) => i !== index);
      return { ...prev, weeks };
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const isAllowed = ACCEPTED_EXTENSIONS.some((ext) =>
      selected.name.toLowerCase().endsWith(ext)
    );
    if (!isAllowed) {
      setErrorMsg("Only .md and .txt files are supported.");
      return;
    }

    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");

      // If the file bundles several project write-ups together, don't
      // parse it into this one form — split it into separate drafts and
      // let the caller (Board) surface them as minimized drafts instead,
      // then close this now-superseded "new project" dialog.
      const drafts = splitMultipleProjects(text);
      if (drafts && drafts.length >= 2 && onMultipleProjectsDetected) {
        onMultipleProjectsDetected(drafts, selected.name);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onCancel();
        return;
      }

      setFile(selected);
      setFileName(selected.name);

      const { sections: parsed, matchedAnything } = parseSections(text);
      setSections(parsed);
      setFileParseNote(
        matchedAnything
          ? `Pulled sections out of ${selected.name} — check they look right below before saving.`
          : `Couldn't find section headers in ${selected.name}, so its full text was placed in "Intro" — feel free to split it into the other fields.`
      );
      if (!title.trim()) {
        setTitle(selected.name.replace(/\.(md|txt)$/i, ""));
      }
    };
    reader.readAsText(selected);
  }

  function clearFile() {
    // Only drops the file from being re-uploaded to storage — the sections
    // that were parsed out of it stay in the form so nothing is lost.
    setFile(null);
    setFileName(project?.file_name ?? null);
    setFileParseNote(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addTag(tag: string) {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || tags.includes(normalized)) return;
    setTags((prev) => [...prev, normalized]);
  }

  function dismiss(key: string) {
    setDismissed((prev) => new Set(prev).add(key));
  }

  async function handleSuggestTags() {
    const currentContent = composeContent(sections);
    if (!title.trim() && !currentContent.trim()) {
      setAiError("Add a title or some content first, then suggest tags.");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setSuggestions(null);
    setDismissed(new Set());

    try {
      const res = await fetch("/api/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: currentContent,
          existingTags: allTags,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "AI tag suggestion failed.");
        return;
      }
      setSuggestions(data);
    } catch {
      setAiError("Couldn't reach the AI tag suggestion service.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || tags.length === 0) {
      setErrorMsg("Please add a title and at least one tag.");
      return;
    }

    if (sectionsAreEmpty(sections)) {
      setErrorMsg(
        "Please fill in at least one section below, or upload a .md/.txt file."
      );
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    const supabase = createClient();

    let filePath = project?.file_path ?? null;
    let savedFileName = project?.file_name ?? null;

    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setErrorMsg(`File upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }
      filePath = path;
      savedFileName = file.name;
    }

    const payload = {
      title: title.trim(),
      content: composeContent(sections),
      sections,
      tags,
      file_name: savedFileName,
      file_path: filePath,
    };

    const { error } = project
      ? await supabase.from("projects").update(payload).eq("id", project.id)
      : await supabase.from("projects").insert({ ...payload, user_id: userId });

    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    onSaved();
  }

  const visibleExisting =
    suggestions?.existingTagsToApply.filter(
      (t) => !tags.includes(t) && !dismissed.has(`existing:${t}`)
    ) ?? [];
  const visibleNew =
    suggestions?.suggestedNewTags.filter(
      (t) => !tags.includes(t.toLowerCase()) && !dismissed.has(`new:${t}`)
    ) ?? [];
  const visibleSynonyms =
    suggestions?.synonymNotes.filter(
      (n) => !tags.includes(n.existingTag) && !dismissed.has(`syn:${n.newTag}:${n.existingTag}`)
    ) ?? [];
  const hasAnySuggestions =
    visibleExisting.length > 0 || visibleNew.length > 0 || visibleSynonyms.length > 0;

  return (
    <form className="form" onSubmit={handleSubmit}>
      <input
        placeholder="Project title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

          <div className="fileRow">
            <label className="button ghost fileLabel">
              Upload .md / .txt
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,text/markdown,text/plain"
                onChange={handleFileChange}
                hidden
              />
            </label>
            {fileName ? (
              <span className="muted small">
                {fileName}{" "}
                {file ? (
                  <span className="linkish danger" onClick={clearFile}>
                    remove
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="muted small">or fill in the sections below</span>
            )}
          </div>

          {fileParseNote ? <p className="muted small">{fileParseNote}</p> : null}
          {!file && isLegacyOnly ? (
            <p className="muted small">
              This project predates the structured sections — its original
              content was copied into &quot;Intro&quot; below. Feel free to
              move it into the other fields.
            </p>
          ) : null}

          <div className="sectionBlock">
            <label className="muted small">Intro / why this project</label>
            <textarea
              className="sectionArea"
              placeholder="Why does this project exist? What problem or motivation started it?"
              value={sections.intro}
              onChange={(e) => updateSection("intro", e.target.value)}
            />
          </div>

          <div className="sectionBlock">
            <label className="muted small">What it is</label>
            <textarea
              className="sectionArea"
              placeholder="A short description of what this project actually is."
              value={sections.whatItIs}
              onChange={(e) => updateSection("whatItIs", e.target.value)}
            />
          </div>

          <div className="sectionBlock">
            <label className="muted small">Exact end deliverables</label>
            <textarea
              className="sectionArea"
              placeholder="Exactly what will exist when this is done."
              value={sections.deliverables}
              onChange={(e) => updateSection("deliverables", e.target.value)}
            />
          </div>

          <div className="sectionBlock">
            <label className="muted small">Future scope</label>
            <textarea
              className="sectionArea"
              placeholder="What could be added or extended later."
              value={sections.futureScope}
              onChange={(e) => updateSection("futureScope", e.target.value)}
            />
          </div>

          <div className="sectionBlock">
            <label className="muted small">Stability</label>
            <textarea
              className="sectionArea"
              placeholder="How stable / production-ready is this right now."
              value={sections.stability}
              onChange={(e) => updateSection("stability", e.target.value)}
            />
          </div>

          <div className="sectionBlock">
            <div className="rowSpace">
              <label className="muted small">Week-wise goals</label>
              <div className="weekStepper">
                <button
                  type="button"
                  className="button ghost stepperBtn"
                  onClick={() => setWeekCount(sections.weeks.length - 1)}
                  disabled={sections.weeks.length <= MIN_WEEKS}
                >
                  −
                </button>
                <span className="muted small weekCount">
                  {sections.weeks.length} week
                  {sections.weeks.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  className="button ghost stepperBtn"
                  onClick={() => setWeekCount(sections.weeks.length + 1)}
                  disabled={sections.weeks.length >= MAX_WEEKS}
                >
                  +
                </button>
              </div>
            </div>

            <div className="weekList">
              {sections.weeks.map((goals, i) => (
                <div className="weekItem" key={i}>
                  <div className="rowSpace">
                    <label className="muted small">Week {i + 1}</label>
                    {sections.weeks.length > MIN_WEEKS ? (
                      <span className="linkish danger small" onClick={() => removeWeekAt(i)}>
                        remove
                      </span>
                    ) : null}
                  </div>
                  <textarea
                    className="sectionArea weekArea"
                    placeholder={`Goals for week ${i + 1}`}
                    value={goals}
                    onChange={(e) => updateWeek(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="sectionBlock">
            <label className="muted small">Any additional info</label>
            <textarea
              className="sectionArea"
              placeholder="Anything else worth keeping — links, credentials notes, quirks, decisions, etc."
              value={sections.additionalInfo}
              onChange={(e) => updateSection("additionalInfo", e.target.value)}
            />
          </div>

          <label className="muted small">Tags</label>
          <TagInput tags={tags} onChange={setTags} suggestions={allTags} />

          <div className="aiTagBlock">
            <button
              type="button"
              className="button ghost"
              onClick={handleSuggestTags}
              disabled={aiLoading}
            >
              {aiLoading ? "Thinking…" : "✨ Suggest tags with AI"}
            </button>

            {aiError ? <p className="errorMsg small">{aiError}</p> : null}

            {suggestions && !hasAnySuggestions ? (
              <p className="muted small">
                ✓ AI checked — your tags already cover this project well, nothing new to suggest.
              </p>
            ) : null}

            {hasAnySuggestions ? (
              <div className="aiSuggestions">
                <span className="muted small">AI suggested — click to add, × to dismiss:</span>
                <div className="bubbleWrap">
                  {visibleExisting.map((tag) => (
                    <span key={`existing:${tag}`} className="bubble small aiSuggestionChip">
                      <button type="button" onClick={() => addTag(tag)}>
                        + {tag}
                      </button>
                      <span
                        className="aiDismiss"
                        onClick={() => dismiss(`existing:${tag}`)}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                  {visibleNew.map((tag) => (
                    <span key={`new:${tag}`} className="bubble small aiSuggestionChip aiNew">
                      <button type="button" onClick={() => addTag(tag)}>
                        + {tag} (new)
                      </button>
                      <span className="aiDismiss" onClick={() => dismiss(`new:${tag}`)}>
                        ×
                      </span>
                    </span>
                  ))}
                </div>

                {visibleSynonyms.length > 0 ? (
                  <div className="aiSynonymNotes">
                    {visibleSynonyms.map((note) => (
                      <div
                        key={`syn:${note.newTag}:${note.existingTag}`}
                        className="aiSynonymNote"
                      >
                        <span className="muted small">
                          &quot;{note.newTag}&quot; looks like your existing tag{" "}
                          <strong>{note.existingTag}</strong> — {note.reason}
                        </span>
                        <div className="rowGap">
                          <button
                            type="button"
                            className="bubble small"
                            onClick={() => addTag(note.existingTag)}
                          >
                            + use {note.existingTag}
                          </button>
                          <span
                            className="linkish small"
                            onClick={() =>
                              dismiss(`syn:${note.newTag}:${note.existingTag}`)
                            }
                          >
                            dismiss
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

      {errorMsg ? <p className="errorMsg">{errorMsg}</p> : null}

      <button className="button" type="submit" disabled={saving}>
        {saving ? "Saving…" : project ? "Save changes" : "Create project"}
      </button>
    </form>
  );
}

// Centered-modal wrapper around ProjectFormBody — this is the "+ New
// project" / "edit" dialog. Multi-project file uploads are handed up to
// whoever renders this (Board) via onMultipleProjectsDetected, which
// closes this dialog and opens the drafts dock instead.
export default function ProjectForm({
  project,
  allTags,
  userId,
  onClose,
  onSaved,
  onMultipleProjectsDetected,
  dockActive,
}: {
  project: Project | null;
  allTags: string[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
  onMultipleProjectsDetected?: (drafts: ParsedProjectDraft[], sourceFileName: string) => void;
  // True whenever the DraftDock is currently showing (drafts.length > 0),
  // so this modal can reserve space above it instead of rendering behind
  // it — see the .modal.aboveDock rule in globals.css.
  dockActive?: boolean;
}) {
  return (
    <div className={`modal ${dockActive ? "aboveDock" : ""}`} onClick={onClose}>
      <div className="modalCard formModalCard" onClick={(e) => e.stopPropagation()}>
        <div className="rowSpace">
          <h3>{project ? "Edit project" : "New project"}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <ProjectFormBody
          project={project}
          allTags={allTags}
          userId={userId}
          onCancel={onClose}
          onSaved={onSaved}
          onMultipleProjectsDetected={onMultipleProjectsDetected}
        />
      </div>
    </div>
  );
}
