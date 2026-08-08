/**
 * Citizen-facing copy and option lists.
 *
 * Anything a judge reads on the public site lives here so the wording stays
 * consistent between the landing page, the report flow and the tracking pages.
 * Domain labels/colours still come from `@/lib/domain` — never duplicate those.
 */

import { BrainCircuit, PenLine, Route, Search, type LucideIcon } from 'lucide-react'

import type { AISource } from '@/lib/api/types'

/**
 * The Karachi areas actually present in the seeded data. The API accepts any
 * string, but offering the real buckets keeps `/analytics/areas` meaningful.
 */
export const KARACHI_AREAS = [
  'Gulshan-e-Iqbal',
  'North Nazimabad',
  'Saddar',
  'Clifton',
  'Korangi',
  'Malir',
  'Gulistan-e-Johar',
  'Lyari',
  'DHA',
  'Nazimabad',
  'Orangi Town',
  'Landhi',
] as const

export type KarachiArea = (typeof KARACHI_AREAS)[number]

/** Shown as the textarea placeholder — a realistic, well-formed report. */
export const EXAMPLE_DESCRIPTION =
  'Example: The manhole outside 12-C Khayaban-e-Bukhari has been open for about a week. ' +
  'It is right on the pedestrian crossing children use for school and there is no cover or ' +
  'barrier around it. Two people have already tripped in the evening when it is dark.'

/**
 * One-tap sample complaints for the Describe step, taken verbatim from
 * `demo-complaints.txt` (each was run through the live analyzer). Mix of
 * English and Roman Urdu across categories and priorities, ending with the
 * deliberately vague one that shows the AI admitting low confidence.
 */
export const DEMO_COMPLAINTS: Array<{ label: string; text: string }> = [
  {
    label: 'Leaning power pole',
    text:
      'Bijli ka khamba Sector 11-B mein jhuk gaya hai aur taarein neeche latak rahi hain. ' +
      'Barish ka pani bhi wahan jama hai aur bachay us gali mein khelte hain. Bohat khatarnak ' +
      'hai, koi bara hadsa ho sakta hai.',
  },
  {
    label: 'Open manhole',
    text:
      'A manhole cover on Nishtar Road is missing and the hole is completely open. A child ' +
      'almost fell into it yesterday evening and there is no barrier around it.',
  },
  {
    label: 'Water leak',
    text:
      'There is a large water leak near the main road at Nishtar Road junction. Clean water has ' +
      'been flowing onto the road for three days and traffic is becoming very difficult.',
  },
  {
    label: 'Garbage pile',
    text:
      'Kachra ka dher gali ke corner par pichlay do haftay se para hua hai. Awara kuttay wahan ' +
      'ghoomte hain aur badbu ki wajah se khirkiyan nahi khol sakte.',
  },
  {
    label: 'Dark street light',
    text:
      'The street light outside house number 42 has not worked for about three weeks. The whole ' +
      'lane is pitch dark after Maghrib and it feels unsafe.',
  },
  {
    label: 'Vague report',
    text: 'There is a problem in our street. Please send someone to look at it soon.',
  },
]

/* ========================================================================== */
/* "How it works" — the four-step strip on the landing page                   */
/* ========================================================================== */

export interface HowItWorksStep {
  icon: LucideIcon
  title: string
  detail: string
}

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    icon: PenLine,
    title: 'You describe it',
    detail:
      'Write the problem in plain Urdu-English, the way you would tell a neighbour. No forms full of codes and no signup — leave your email and the account is created for you.',
  },
  {
    icon: BrainCircuit,
    title: 'The AI reads it',
    detail:
      'It picks one of seven civic categories, judges how urgent it is, and writes a one-line summary a case worker can scan in two seconds.',
  },
  {
    icon: Route,
    title: 'It is routed',
    detail:
      'The complaint lands in the queue of the department that actually owns the problem — roads, water, waste, power, drainage or safety.',
  },
  {
    icon: Search,
    title: 'You track it',
    detail:
      'You get a reference code like CIV-8F3K2M — type it in any time, no sign-in needed — and your account gathers every report you have filed in one list.',
  },
]

/* ========================================================================== */
/* The three-tier AI story                                                    */
/* ========================================================================== */

export interface AiTierStory {
  source: AISource
  /** What the backend reports as `ai.model_name` for this tier. */
  model: string
  headline: string
  detail: string
}

/**
 * CONTRACT §5.2/§5.3 — the analyzer falls down these tiers and always records
 * which one answered. The public site says so out loud.
 */
export const AI_TIERS: AiTierStory[] = [
  {
    source: 'llm',
    model: 'deepseek-v4-flash',
    headline: 'A language model reads the whole complaint',
    detail:
      'First choice. It understands context a keyword never will — that "the pole is sparking near the school gate" is urgent, and that "streetlight" belongs to electricity. If the provider is unreachable or slow, we drop to the next tier instead of failing.',
  },
  {
    source: 'ml',
    model: 'tfidf-linearsvc-v1',
    headline: 'A classifier trained on this city’s own complaints',
    detail:
      'TF-IDF features into a linear SVC, trained locally and evaluated with accuracy, macro-F1 and a confusion matrix. It runs offline in milliseconds, so an internet outage cannot take triage down.',
  },
  {
    source: 'rules',
    model: 'keyword-rules-v1',
    headline: 'Deterministic keyword rules',
    detail:
      'The floor. Pure pattern matching over civic vocabulary — pothole, leakage, transformer, sewage. It is a safe guess rather than a prediction, and the badge says exactly that so nobody mistakes it for the model.',
  },
]

/** What the analyzer is given. Deliberately short — privacy is the point. */
export const AI_INPUTS = [
  'The text of your complaint',
  'The location text you typed',
] as const

/** What comes back, and lands on the complaint record. */
export const AI_OUTPUTS = [
  'Category — one of seven',
  'Priority — low to critical',
  'A one-line summary',
  'Suggested department',
  'Confidence score',
  'Which tier answered',
] as const

/** Never sent to the analyzer. Stated plainly on the landing page. */
export const AI_NEVER_SENT = 'Your name, phone number and email are never sent to the analyzer.'
