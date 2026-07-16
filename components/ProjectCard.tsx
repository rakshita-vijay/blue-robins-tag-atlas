"use client";

import type { Project } from "@/lib/types";

type RankedProject = Project & { score: number };

export default function ProjectCard({
  project,
  showScore,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  project: RankedProject;
  showScore: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      className={`card ${selected ? "selected" : ""}`}
      type="button"
      onClick={onSelect}
    >
      <div className="rowSpace">
        <h3>{project.title}</h3>
        {showScore ? (
          <span className="score">
            {project.score} match{project.score === 1 ? "" : "es"}
          </span>
        ) : null}
      </div>

      <div className="tags">
        {project.tags.map((tag) => (
          <span key={tag} className="chip">
            {tag}
          </span>
        ))}
      </div>

      <p className="preview">
        {project.content.slice(0, 200)}
        {project.content.length > 200 ? "…" : ""}
      </p>

      <div className="rowSpace actions">
        <span className="muted small">
          {project.file_name ?? new Date(project.created_at).toLocaleDateString()}
        </span>
        <span className="rowGap">
          <span
            className="linkish"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            edit
          </span>
          <span
            className="linkish danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            delete
          </span>
        </span>
      </div>
    </button>
  );
}
