"use client";

import type { Project } from "@/lib/types";

type RankedProject = Project & { score: number; percentage: number };

function sortTags(tags: string[]): string[] {
  return [...tags].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

export default function ProjectCard({
  project,
  showScore,
  selected,
  onSelect,
  onEdit,
  onArchive,
  onDelete,
  onToggleBookmark,
}: {
  project: RankedProject;
  showScore: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleBookmark: () => void;
}) {
  return (
    <div className={`sidebarCard ${selected ? "selected" : ""}`}>
      <div className="sidebarCardTop">
        <button type="button" className="sidebarCardMain" onClick={onSelect}>
          <div className="rowSpace">
            <h4>{project.title}</h4>
            {showScore ? <span className="score small">{project.percentage}%</span> : null}
          </div>
          <div className="tagScroll">
            {sortTags(project.tags).map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))}
          </div>
        </button>

        <button
          type="button"
          className={`bookmarkToggle ${project.bookmarked ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark();
          }}
          aria-label={project.bookmarked ? "Remove bookmark" : "Bookmark this project"}
          title={project.bookmarked ? "Remove bookmark" : "Bookmark this project"}
        >
          {project.bookmarked ? "★" : "☆"}
        </button>
      </div>

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
