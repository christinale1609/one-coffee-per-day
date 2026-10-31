import { ClipboardList, FileText, MessageSquare, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/constants";

const STEPS = [
  {
    icon: FileText,
    title: "Drop in your resume",
    body: "AI fills in your profile in seconds. Add your goals: the roles, industries and companies you're curious about.",
  },
  {
    icon: Search,
    title: "Meet the right people",
    body: "Get real LinkedIn profiles of people a few steps ahead of you, ranked by what you have in common, with a reason to reach out to each.",
  },
  {
    icon: MessageSquare,
    title: "Send a note that gets a yes",
    body: "Pick from tailored connection notes that fit LinkedIn's 200-character limit (300 with Premium). Copy, paste, send.",
  },
  {
    icon: ClipboardList,
    title: "Track it and show up prepared",
    body: "Every conversation lives in one tracker. When someone says yes, get a research brief and the questions worth asking.",
  },
];

const PAINS = [
  { q: "Who should I even talk to?", a: "Searching LinkedIn for hours and still not knowing who'd actually reply." },
  { q: "What do I say?", a: "Rewriting the same 200 characters ten times, then not sending it." },
  { q: "What do I ask?", a: "Walking into a chat with generic questions and forgetting who said what." },
];

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/login" className="whitespace-nowrap rounded-full px-3 py-2 text-sm text-roast hover:bg-foam">
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="hidden whitespace-nowrap rounded-full bg-espresso px-4 py-2 text-sm font-medium text-cream hover:bg-roast sm:inline-block"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 md:grid-cols-[1.1fr_1fr] md:pt-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-honey-soft px-3 py-1 text-xs font-medium text-crema-dark">
              <Sparkles className="size-3.5" aria-hidden /> Your AI networking buddy
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-espresso sm:text-5xl">
              Build your network, one coffee at a time.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-roast">
              {APP_NAME} finds the people worth meeting for your career goals, drafts the note, tracks every
              conversation and preps you before each coffee chat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login?mode=signup"
                className="rounded-full bg-crema px-6 py-3 text-base font-medium text-white hover:bg-crema-dark"
              >
                Start free
              </Link>
              <a href="#how" className="rounded-full border border-latte bg-paper px-6 py-3 text-base text-espresso hover:bg-foam">
                How it works
              </a>
            </div>
          </div>

          <HeroMock />
        </section>

        <section className="border-y border-latte bg-foam/60">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="font-display text-2xl font-semibold text-espresso">
              You know you should network. The hard part is everything else.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {PAINS.map((p) => (
                <div key={p.q} className="rounded-2xl bg-paper p-5">
                  <p className="font-medium text-espresso">{p.q}</p>
                  <p className="mt-2 text-sm leading-relaxed text-mocha">{p.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-semibold text-espresso">How it works</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="rounded-2xl border border-latte bg-paper p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-honey-soft text-crema-dark">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-mocha">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold text-espresso">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mocha">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="grid gap-6 rounded-3xl bg-espresso p-8 text-cream md:grid-cols-[auto_1fr] md:p-10">
            <ShieldCheck className="size-10 text-latte" aria-hidden />
            <div>
              <h2 className="font-display text-2xl font-semibold">We suggest. You decide.</h2>
              <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-latte md:grid-cols-3">
                <li>Nothing is ever sent for you. You copy the note and send it yourself on LinkedIn.</li>
                <li>Suggestions and research come from public web results. AI can get things wrong, so give each profile a quick look first.</li>
                <li>Your resume is read once to fill your profile and isn&apos;t stored. Delete your data any time.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-24 text-center">
          <h2 className="font-display text-3xl font-semibold text-espresso">Your next coffee chat is one click away.</h2>
          <Link
            href="/login?mode=signup"
            className="mt-6 inline-block rounded-full bg-crema px-8 py-3 text-base font-medium text-white hover:bg-crema-dark"
          >
            Create your free account
          </Link>
        </section>
      </main>

      <footer className="border-t border-latte py-6 text-center text-xs text-mocha">
        {APP_NAME} · a student-built prototype · Not affiliated with LinkedIn
      </footer>
    </div>
  );
}

function HeroMock() {
  const note =
    "Hi Priya! Fellow Rotman MMA here. I loved your path from analytics into PM at RBC, which is exactly the switch I'm hoping to make. Open to a 15-min chat? - Sam";
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="rounded-2xl border border-latte bg-paper p-5 shadow-lg shadow-espresso/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-espresso">Priya S.</p>
            <p className="text-sm text-mocha">Product Manager, Digital · RBC</p>
          </div>
          <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-xs font-medium text-sage">92% match</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Rotman alum", "Analytics → PM", "Toronto"].map((t) => (
            <span key={t} className="rounded-full bg-foam px-2.5 py-0.5 text-xs text-roast">
              {t}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-roast">
          Made the exact move you want two years ago, and posts about mentoring new PMs.
        </p>
      </div>
      <div className="relative -mt-3 ml-8 rounded-2xl border border-latte bg-cream p-5 shadow-lg shadow-espresso/5">
        <p className="text-xs font-medium uppercase tracking-wider text-mocha">Connection note</p>
        <p className="mt-2 text-sm leading-relaxed text-espresso">{note}</p>
        <p className="mt-2 text-right text-xs font-medium text-sage">{note.length}/200</p>
      </div>
    </div>
  );
}
