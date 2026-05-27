// src/types/index.ts

export type OpportunityCategory =
  | "Off-campus summer research program"
  | "On-campus job";

export interface Opportunity {
  id: string;            // Unique UUID
  title: string;         // Name of the program
  institution: string;   // e.g., "Michigan State University"
  summary: string | null; // 2-3 sentence description; null when not provided
  contactEmail?: string; // Optional
  contactPhone?: string; // Optional
  applicationUrl: string;// Link to apply
  datePosted: string | null; // ISO Date string (YYYY-MM-DD), or null when unknown (scraped rows)
  deadline: string | null;   // ISO Date string (YYYY-MM-DD), or null for rolling deadlines
  category: OpportunityCategory;
  tags?: string[];       // e.g., ["Computer Science", "Engineering"]
}
