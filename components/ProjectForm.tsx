"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";
import TagInput from "./TagInput";

const ACCEPTED_EXTENSIONS = [".md", ".txt"];

export default function ProjectForm({
  project,
  allTags,
  userId,
  onClose,
  onSaved,
}: {
  project: Project | null;
  allTags: string[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [content, setContent] = useState(project?.content ?? "");
  const [tags, setTags] = useState<string[]>(project?.tags ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(project?.file_name ?? null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setFile(selected);
    setFileName(selected.name);

    const reader = new FileReader();
    reader.onload = () => {
      setContent(String(reader.result ?? ""));
      if (!title.trim()) {
        setTitle(selected.name.replace(/\.(md|txt)$/i, ""));
      }
    };
    reader.readAsText(selected);
  }

  function clearFile() {
    setFile(null);
    setFileName(project?.file_name ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !content.trim() || tags.length === 0) {
      setErrorMsg("Please add a title, some content, and at least one tag.");
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
      content,
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

  return (
    <div className="modal" onClick={onClose}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <div className="rowSpace">
          <h3>{project ? "Edit project" : "New project"}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>

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
              <span className="muted small">or just type below</span>
            )}
          </div>

          <textarea
            placeholder="Project content / description"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <label className="muted small">Tags</label>
          <TagInput tags={tags} onChange={setTags} suggestions={allTags} />

          {errorMsg ? <p className="errorMsg">{errorMsg}</p> : null}

          <button className="button" type="submit" disabled={saving}>
            {saving ? "Saving…" : project ? "Save changes" : "Create project"}
          </button>
        </form>
      </div>
    </div>
  );
}
