// src/types/index.ts

export type OpportunityCategory =
  | "Off-campus summer research program"
  | "On-campus job";

export interface Opportunity {
  id: string;            // Unique UUID
  title: string;         // Name of the program
  institution: string;   // e.g., "Michigan State University"
  summary: string;       // 2-3 sentence description
  contactEmail?: string; // Optional
  contactPhone?: string; // Optional
  applicationUrl: string;// Link to apply
  datePosted: string;    // ISO Date string (YYYY-MM-DD)
  deadline: string;      // ISO Date string (YYYY-MM-DD)
  category: OpportunityCategory;
  tags?: string[];       // e.g., ["Computer Science", "Engineering"]
}
