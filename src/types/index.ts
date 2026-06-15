// src/types/index.ts

export type OpportunityCategory =
  | "Off-campus summer research program"
  | "On-campus job";

export interface Opportunity {
  id: string;
  title: string;
  institution: string;
  summary: string | null;
  contactEmail?: string;
  contactPhone?: string;
  applicationUrl: string;
  datePosted: string | null;
  deadline: string | null;
  category: OpportunityCategory;
  tags?: string[];
}
