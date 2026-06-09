export interface EducationContent {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'article' | 'guide';
  duration?: number; // in minutes
  thumbnailUrl?: string;
  url: string;
  createdAt: string;
}
