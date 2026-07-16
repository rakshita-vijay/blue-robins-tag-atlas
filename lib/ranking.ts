import type { Project } from "./types";

// Given all projects and the tags currently selected on the bubble board,
// score each project by how many of the selected tags it has, and sort
// so the projects matching the most (or all) selected tags float to the top.
export function rankProjects(projects: Project[], selectedTags: string[]) {
  const wanted = selectedTags.map((t) => t.toLowerCase());

  return projects
    .map((project) => {
      const tags = project.tags.map((t) => t.toLowerCase());
      const matchCount = wanted.filter((t) => tags.includes(t)).length;
      return { ...project, score: matchCount };
    })
    .filter((project) => (wanted.length === 0 ? true : project.score > 0))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return +new Date(b.created_at) - +new Date(a.created_at);
    });
}
