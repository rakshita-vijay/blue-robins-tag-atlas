// The structured write-up. `weeks` is dynamic — the user picks how many
// weeks the project needs and gets one goals box per week.
export type ProjectSections = {
  intro: string;
  whatItIs: string;
  deliverables: string;
  futureScope: string;
  stability: string;
  weeks: string[];
  additionalInfo: string;
};

export type Project = {
  id: number;
  user_id: string;
  title: string;
  content: string;
  sections: ProjectSections | null;
  tags: string[];
  file_name: string | null;
  file_path: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};
