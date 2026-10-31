# One Coffee Per Day! · Product brief

How the product maps to the AI Product Management module (Days 1 and 2). Treat the hypotheses and targets as **starting assumptions**: replace them with what you learn from interviews and live usage.

---

## 1. Outcome, not output

We aren't shipping "a networking app". The outcome we care about is **students having more real conversations with people in the careers they want**. Everything below is measured against that.

## 2. Job to be done

> **When** I'm trying to break into a role or industry where I don't know anyone,
> **I want to** have real conversations with people a few steps ahead of me,
> **so I can** learn what the job is really like and get noticed, without feeling awkward or wasting hours.

| JTBD element | For our user |
|---|---|
| Making progress | Land a first role, or switch into a new function or industry |
| Specific circumstance | Student or new grad, small network in the target field, recruiting season, juggling classes |
| Emotional & social needs | Fear of sounding "salesy" or being ignored; imposter feelings; wanting to look prepared and professional |

*Validate every row in interviews by asking about the last time they tried to network, not whether they'd like an app.*

## 3. Focus: one persona, one region

- **Persona:** graduate business and analytics students (e.g. a Master of Management Analytics cohort) looking for their first role after graduating.
- **Region:** Toronto / Canada first. Expand only after the product works for this persona.
- **Go-to-market:** product-led. Self-serve, immediate value in the first session, no sales effort.

## 4. Value proposition canvas

| Customer profile | | Value map | |
|---|---|---|---|
| **Jobs** | Find the right people; write an outreach note; keep track; prepare for chats; follow up | **Products & services** | Resume-to-profile AI, matched people with verified LinkedIn profiles, note drafts, tracker, prep brief |
| **Pains** | Don't know who to contact; blank-page anxiety; 200-character limit; low reply rates; forgetting who said what; generic questions | **Pain relievers** | Ranked list with a reason to reach out to each; three drafts that fit the limit; nudges for stale outreach; brief with sources |
| **Gains** | Replies, referrals, insider knowledge, confidence, a growing network | **Gain creators** | Shared-ground matching (more likely to reply); tailored questions; OKR progress; thank-you notes that keep relationships warm |

## 5. Product risks and how the prototype tackles them

| Risk | Question | How we address it |
|---|---|---|
| **Value** | Will students actually use AI-suggested contacts and notes? | Interviews (Mom Test), funnel tracking, NPS after a first chat, and fake-door buttons |
| **Technical** | Can an LLM write notes that reliably fit 200/300 characters? Can it research a person in under a minute? | Server-side length check with automatic retry; strict tool schemas; per-route time limits |
| **Data** | LinkedIn has no public people-search API, and scraping breaks its terms. | Claude's web search restricted to `linkedin.com`, then **only keep profiles whose URL actually came back from a search**, which rules out hallucinated people. A fallback gives users LinkedIn search links. |

Prototype type: a **live data prototype**. Real code, real users and real data, but not production-ready (no automated tests, no localization).

## 6. Opportunity hypotheses (with pass/fail thresholds)

| # | Hypothesis | Signal in the app | Target (set your own) |
|---|---|---|---|
| H1 | Students act on AI-suggested people | `suggestion_selected` ÷ `suggestions_generated` | ≥ 50% of batches lead to at least one pick |
| H2 | Tailored notes get accepted | Acceptance rate (accepted ÷ reached out) | ≥ 30% |
| H3 | Prep briefs are valued | Briefs generated ÷ chats accepted | ≥ 60% |
| H4 | There is demand beyond the MVP | Fake-door clicks (reminders, extension, Pro $4.99) | ≥ 20% of active users click one |
| H5 | Users would recommend it | NPS after a first chat | ≥ 30 |

## 7. North Star metric

**Coffee chats accepted per week.**

Checked against the North Star checklist from class:

- **Expresses value:** an accepted chat *is* the job getting done.
- **Represents strategy:** product-led growth through users who succeed and then share it.
- **Leading indicator:** it comes before job offers, retention and referrals.
- **Understandable:** anyone can read "chats accepted this week".
- **Actionable:** better matching, better notes and nudges all move it.

**Input metrics** (shown on the Insights page):

| Input | Metric |
|---|---|
| Breadth | Average number of core AI features used per user |
| Depth | Contacts in the tracker per active user |
| Frequency | Weekly / monthly active users |
| Business-specific | Acceptance rate (accepted ÷ reached out) |

## 8. Team OKR for the assignment (example; edit it)

**Objective:** Prove that students land more coffee chats with One Coffee Per Day! by Nov 13.

- KR1: 15 users complete onboarding.
- KR2: 10 coffee chats accepted and logged in the tracker.
- KR3: NPS ≥ 30 from at least 8 responses.
- KR4: 2+ customer interviews done and synthesized.

(Users also get a **personal networking OKR** in the app: objective = career goal; KRs = weekly outreach and monthly chats.)

## 9. Instrumentation

Every event lands in the `events` table:

`signed_up` · `onboarding_completed` · `resume_parsed` · `suggestions_generated` · `suggestion_selected` · `suggestion_dismissed` · `message_generated` · `message_copied` · `linkedin_opened` · `status_changed` · `prep_generated` · `questions_copied` · `contact_added_manually` · `fake_door_clicked` · `nps_submitted` · `referral_link_copied` · `search_idea_opened` · `profile_updated` · `contact_deleted`

## 10. Where the LLM earns its place (PAIR guidelines)

| Use of AI | Why AI (not rules) | Benefit shown to the user |
|---|---|---|
| Resume → profile | Unstructured documents in endless formats | "Fill my profile from my resume" |
| Find people | Judging relevance and shared ground across messy search results | A reason to reach out to each person |
| Draft notes | Personal, specific writing under a hard limit | Three ready-to-send options |
| Prep brief | Researching and synthesizing public sources | Questions that make you look prepared |

**Setting expectations:** the app says plainly that suggestions and research come from public web results and may be wrong, shows sources, only links profiles it actually found, and never sends anything for the user.
