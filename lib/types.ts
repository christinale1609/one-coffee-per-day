import type { ContactStatus } from "./constants";

export type Experience = {
  title: string;
  organization: string;
  start: string;
  end: string;
  summary: string;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  location: string;
  school: string;
  degree: string;
  field_of_study: string;
  graduation_year: string;
  current_status: string;
  current_title: string;
  current_company: string;
  headline: string;
  skills: string[];
  experiences: Experience[];
  background_summary: string;
  target_industries: string[];
  target_roles: string[];
  target_companies: string[];
  target_locations: string[];
  career_goal: string;
  chat_goals: string[];
  linkedin_premium: boolean;
  weekly_outreach_goal: number;
  monthly_chat_goal: number;
  onboarded: boolean;
  nps_prompted: boolean;
};

export type Suggestion = {
  id: string;
  batch_id: string;
  full_name: string;
  headline: string;
  company: string;
  location: string;
  linkedin_url: string;
  why: string;
  shared_ground: string[];
  conversation_hook: string;
  match_score: number;
  status: "new" | "selected" | "dismissed";
  created_at: string;
};

export type ResearchBrief = {
  snapshot: string;
  career_path: string[];
  recent_activity: { title: string; url: string; takeaway: string }[];
  talking_points: string[];
  questions: { category: string; question: string; why: string }[];
  avoid: string[];
  sources: { title: string; url: string }[];
  generated_at: string;
};

export type Contact = {
  id: string;
  suggestion_id: string | null;
  full_name: string;
  headline: string;
  company: string;
  location: string;
  linkedin_url: string;
  why: string;
  shared_ground: string[];
  conversation_hook: string;
  source: "ai" | "manual";
  status: ContactStatus;
  message_draft: string;
  chat_date: string | null;
  notes: string;
  research: ResearchBrief | null;
  reached_out_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageKind = "connect" | "follow_up" | "thank_you";

export type MessageVariant = { angle: string; text: string };

export type SearchIdea = { label: string; keywords: string };
