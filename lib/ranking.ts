import type { Project } from "./types";

// Scores a single project against the currently selected tags: how many of
// the selected tags it has, and what percentage of the selected tags that
// represents. Used both for ranking lists and for the detail pane.
export function scoreProject(project: Project, selectedTags: string[]) {
  const wanted = selectedTags.map((t) => t.toLowerCase());
  const tags = project.tags.map((t) => t.toLowerCase());
  const matchCount = wanted.filter((t) => tags.includes(t)).length;
  const percentage =
    wanted.length > 0 ? Math.round((matchCount / wanted.length) * 100) : 0;
  return { score: matchCount, percentage };
}

// Given a list of projects and the tags currently selected on the bubble
// board, score each project by how many of the selected tags it has, then
// sort so the projects matching the most float to the top. When no tags are
// selected every project is kept, sorted by newest first.
export function rankProjects(projects: Project[], selectedTags: string[]) {
  const wanted = selectedTags.map((t) => t.toLowerCase());

  return projects
    .map((project) => ({ ...project, ...scoreProject(project, selectedTags) }))
    .filter((project) => (wanted.length === 0 ? true : project.score > 0))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return +new Date(b.created_at) - +new Date(a.created_at);
    });
}
