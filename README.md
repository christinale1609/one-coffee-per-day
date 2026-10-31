# One Coffee Per Day! ☕

An AI networking buddy for students and early-career professionals. It finds the people worth meeting for your career goals, drafts a LinkedIn note that fits the character limit, tracks every conversation, and preps you before each coffee chat.

## What it does

1. **Onboarding:** upload a resume (PDF, DOCX or TXT) or paste it. Claude fills in your profile (school, degree, status, experience, skills), and you edit anything that's off. Then you set your goals: target roles, industries, companies and locations, what you want from coffee chats, your LinkedIn plan (free = 200-character notes, Premium = 300), and a personal networking OKR.
2. **Find people:** Claude searches the public web for real `linkedin.com/in/...` profiles that match your goals, ranks them by shared ground (same school, past employer, similar path), and explains why each one is worth a chat. Every profile URL is checked against what the search actually returned, so no invented people get through. Pick the ones you like, or hit **Show me new people** for a fresh batch.
3. **Draft notes:** for everyone you pick, you get three tailored connection notes (different angles, choice of tone), kept under your LinkedIn character limit and checked on the server. Copy, open LinkedIn, send, then click **I sent it**.
4. **Tracker:** a pipeline running To reach out → Reached out → Chat accepted → Chat done, plus No response and Not now. It nudges you when someone hasn't replied in a week, and you can add people you already know by hand.
5. **Chat prep:** once someone says yes, a research brief from public sources (snapshot, career path, recent talks and articles, talking points, 8-10 tailored questions, things to avoid, cited sources). After the chat, a thank-you note built from your notes.
6. **Today dashboard:** the one next action worth doing today, your OKR progress (outreach this week, chats this month) and pipeline counts.
7. **Product analytics:** every feature is instrumented (`events` table). The **Insights** page (admins only) shows the North Star metric, input metrics, the activation funnel, NPS and fake-door demand-test clicks.

## Tech stack

| Piece | Choice |
|---|---|
| App | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 |
| Auth + database | Supabase (Postgres with row-level security) |
| AI | Anthropic Claude API (`claude-opus-5-5`), structured outputs, server-side web search |
| Hosting | Vercel (free Hobby plan) |

## Setup (about 15 minutes)

### 1. Supabase (auth + database)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
3. Make yourself an admin so you can see the Insights page. Run this in the SQL editor:
   ```sql
   insert into public.admins (email) values ('you@example.com');
   ```
4. Optional, for frictionless testing: **Authentication → Sign In / Providers → Email**, then turn off **Confirm email**. Otherwise new users must click a confirmation link first.
5. Under **Authentication → URL Configuration**, set **Site URL** to your Vercel URL once you have one, and add `http://localhost:3000/**` and `https://<your-app>.vercel.app/**` to **Redirect URLs**.
6. Copy the **Project URL** and **publishable key** (Project Settings → API).

### 2. Anthropic (Claude)

1. Create an API key at [console.anthropic.com](https://console.anthropic.com) and add a few dollars of credit.
2. Make sure **web search** is enabled for your organization (Console → Settings → Privacy / Features). Find people and Chat prep rely on it.

### 3. Run it locally

```bash
cp .env.example .env.local   # then fill in the three values
npm install
npm run dev
```

Open http://localhost:3000.

### 4. Deploy to Vercel

1. Push this repo to GitHub.
2. At [vercel.com/new](https://vercel.com/new), import the repo.
3. Add the same three environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`) and deploy.
4. Put the Vercel URL into Supabase's Site URL and Redirect URLs (step 1.5).

## Costs and limits

- Every AI feature has a per-user daily cap (`DAILY_AI_LIMITS` in [`lib/constants.ts`](lib/constants.ts)), so a public link can't drain your API credits.
- Rough cost on Opus: a few cents per resume or message, and roughly $0.20-0.60 per people search or prep brief (web searches plus the pages read). Set `ANTHROPIC_MODEL=claude-haiku-5-5` for a much cheaper model while testing.
- The people-search and prep routes can take 30-90 seconds. They set `maxDuration = 300`, which Vercel's Hobby plan allows with Fluid compute (on by default for new projects).

## Project map

```
app/
  page.tsx                 Landing page
  login/                   Sign in / sign up
  (app)/dashboard          Today: next step, OKR, pipeline, fake-door test
  (app)/onboarding         Resume → about you → goals
  (app)/discover           AI people suggestions + note drafting
  (app)/tracker            Pipeline board, add contacts manually
  (app)/contacts/[id]      Notes, follow-ups, prep brief, thank-you
  (app)/insights           Product metrics (admins only)
  api/resume/parse         Resume → structured profile (Claude)
  api/discover             Web search → verified LinkedIn profiles (Claude)
  api/messages             Notes under LinkedIn's limit (Claude)
  api/prep                 Research brief + questions (Claude + web search)
lib/ai/                    Claude client, prompts, output schemas
supabase/schema.sql        Tables, RLS policies, triggers, metrics function
docs/                      Product brief and interview guide for the assignment
```

## Privacy and responsible AI

- Resumes are read once to fill the profile. The file itself is never stored.
- We never scrape LinkedIn or send messages on anyone's behalf. People come from public search results, and users send every note themselves.
- Research briefs stick to public, professional information and cite their sources.
- The UI says what the AI can get wrong, at the point where it matters.
