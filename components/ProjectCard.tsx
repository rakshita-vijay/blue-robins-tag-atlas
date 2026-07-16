"use client";

import type { Project } from "@/lib/types";

type RankedProject = Project & { score: number; percentage: number };

export default function ProjectCard({
  project,
  showScore,
  selected,
  onSelect,
  onEdit,
  onArchive,
  onDelete,
}: {
  project: RankedProject;
  showScore: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`sidebarCard ${selected ? "selected" : ""}`}>
      <button type="button" className="sidebarCardMain" onClick={onSelect}>
        <div className="rowSpace">
          <h4>{project.title}</h4>
          {showScore ? <span className="score small">{project.percentage}%</span> : null}
        </div>
        <div className="tagScroll">
          {[...project.tags].sort().map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
      </button>

      <div className="rowSpace sidebarCardActions">
        <span
          className="linkish small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          edit
        </span>
        <span
          className="linkish small"
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
        >
          {project.archived ? "unarchive" : "archive"}
        </span>
        <span
          className="linkish danger small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          delete
        </span>
      </div>
    </div>
  );
}
