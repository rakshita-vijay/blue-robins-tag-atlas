export type Project = {
  id: number;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  file_name: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string;
};
