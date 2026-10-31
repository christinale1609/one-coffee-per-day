import { z } from "zod";

export const ResumeSchema = z.object({
  full_name: z.string(),
  location: z.string().describe("City, region. Empty string if not stated."),
  school: z.string().describe("Most recent or current school."),
  degree: z.string().describe("e.g. Master of Management Analytics, BCom."),
  field_of_study: z.string(),
  graduation_year: z.string().describe("Expected or actual year, e.g. 2026."),
  current_status: z.enum(["student", "new_grad", "early_career", "experienced", "career_switcher"]),
  current_title: z.string().describe("Current job title, or 'Student' if in school and not working."),
  current_company: z.string(),
  headline: z.string().describe("One line in the person's voice, like a LinkedIn headline."),
  skills: z.array(z.string()).describe("Up to 12 concrete skills."),
  experiences: z.array(
    z.object({
      title: z.string(),
      organization: z.string(),
      start: z.string(),
      end: z.string(),
      summary: z.string().describe("One sentence on what they did and achieved."),
    }),
  ),
  background_summary: z
    .string()
    .describe("4-6 factual sentences summarizing background, strengths and notable experiences."),
  suggested_industries: z.array(z.string()).describe("2-4 industries this background points toward."),
  suggested_roles: z.array(z.string()).describe("2-4 roles this background points toward."),
});

export const DiscoverSchema = z.object({
  people: z.array(
    z.object({
      full_name: z.string(),
      headline: z.string().describe("Their current title, as shown on LinkedIn."),
      company: z.string(),
      location: z.string(),
      linkedin_url: z.string().describe("The exact linkedin.com/in/... URL from the search results."),
      why: z.string().describe("1-2 sentences, addressed to the user, on why this person is worth a coffee chat."),
      shared_ground: z.array(z.string()).describe("Short tags, e.g. 'UofT alum', 'Ex-RBC', 'Analytics → PM'."),
      conversation_hook: z.string().describe("One specific thing from their profile to mention or ask about."),
      match_score: z.number().int().describe("0-100: how useful and reachable this person is for the user's goal."),
    }),
  ),
  search_ideas: z
    .array(z.object({ label: z.string(), keywords: z.string() }))
    .describe("3 LinkedIn people-search keyword strings the user can try themselves."),
});

export const MessagesSchema = z.object({
  variants: z.array(
    z.object({
      angle: z.string().describe("2-4 word label for the approach, e.g. 'Shared school'."),
      text: z.string(),
    }),
  ),
});

export const BriefSchema = z.object({
  snapshot: z.string().describe("3-4 sentences: who they are professionally, now and before."),
  career_path: z.array(z.string()).describe("Key roles in order, e.g. 'Analyst, RBC (2019-2021)'."),
  recent_activity: z
    .array(z.object({ title: z.string(), url: z.string(), takeaway: z.string() }))
    .describe("Public talks, articles, posts, news or projects. Empty if none found."),
  talking_points: z.array(z.string()).describe("Common ground and things worth bringing up."),
  questions: z.array(
    z.object({
      category: z.enum(["Their journey", "Role & team", "Industry", "Advice for me", "Company"]),
      question: z.string(),
      why: z.string().describe("Short note on why this question works for this person."),
    }),
  ),
  avoid: z.array(z.string()).describe("Things to steer clear of in this chat."),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});
