import type { Chapter, Flashcard, Note, Quiz, QuizQuestion, Subject } from './types'

const now = Date.now()
const day = 86_400_000

function s(id: string, name: string, color: string, ageDays: number): Subject {
  return { id, name, color, createdAt: now - ageDays * day }
}
function c(id: string, subjectId: string, name: string, ageDays: number): Chapter {
  return { id, subjectId, name, createdAt: now - ageDays * day }
}
function n(
  id: string,
  chapterId: string,
  title: string,
  content: string,
  ageDays: number,
  pinned = false,
): Note {
  return {
    id,
    chapterId,
    title,
    content: content.trim(),
    pinned,
    createdAt: now - ageDays * day,
    updatedAt: now - ageDays * day / 2,
  }
}

export const seedSubjects: Subject[] = [
  s('sub-chem', 'Chemistry', '#f59e0b', 30),
  s('sub-phy', 'Physics', '#10b981', 28),
  s('sub-math', 'Mathematics', '#f43f5e', 25),
  s('sub-bio', 'Biology', '#14b8a6', 20),
]

export const seedChapters: Chapter[] = [
  c('ch-chem-1', 'sub-chem', 'Chemical Reactions & Equations', 30),
  c('ch-chem-2', 'sub-chem', 'Acids, Bases & Salts', 22),
  c('ch-phy-1', 'sub-phy', 'Kinematics', 28),
  c('ch-phy-2', 'sub-phy', 'Electricity', 18),
  c('ch-math-1', 'sub-math', 'Calculus', 25),
  c('ch-math-2', 'sub-math', 'Algebra', 12),
  c('ch-bio-1', 'sub-bio', 'Cell Biology', 20),
]

export const seedNotes: Note[] = [
  n(
    'note-1',
    'ch-chem-1',
    'Balancing Chemical Equations',
    `
# Balancing Chemical Equations

A chemical equation must obey the **law of conservation of mass** — the number of atoms of each element stays the same on both sides.

## Worked examples

**Formation of water**

$$\\ce{2H2 + O2 -> 2H2O}$$

**Combustion of methane**

$$\\ce{CH4 + 2O2 -> CO2 + 2H2O}$$

**Zinc reacting with hydrochloric acid** (the \`^\` marks a gas given off)

$$\\ce{Zn + 2HCl -> ZnCl2 + H2 ^}$$

## Physical states

Use \`(s)\`, \`(l)\`, \`(g)\` and \`(aq)\` after each species:

$$\\ce{CaCO3(s) -> CaO(s) + CO2(g) ^}$$

## How to balance

1. Balance metals first, then non-metals
2. Balance $\\ce{H2}$ and $\\ce{O2}$ last
3. Finish by counting atoms on each side

> **Tip:** type \`/chem\` in the editor to insert a chemical equation block instantly.
`,
    30,
    true,
  ),
  n(
    'note-2',
    'ch-chem-1',
    'Equilibrium & Reversible Reactions',
    `
# Equilibrium & Reversible Reactions

A reversible reaction reaches **dynamic equilibrium** — the forward and backward reactions happen at equal rates.

## Haber process (ammonia synthesis)

$$\\ce{N2(g) + 3H2(g) <=> 2NH3(g)}$$

## Conditions written above the arrow

$$\\ce{N2 + 3H2 ->[\\text{Fe catalyst},\\ 450\\,^\\circ C] 2NH3}$$

## Ions & charges

$$\\ce{Na+ + Cl- -> NaCl}$$

$$\\ce{Cu^{2+} + 2e- -> Cu(s)}$$

## Equilibrium constant

For $\\ce{aA + bB <=> cC + dD}$:

$$K_c = \\frac{[\\ce{C}]^c[\\ce{D}]^d}{[\\ce{A}]^a[\\ce{B}]^b}$$
`,
    28,
  ),
  n(
    'note-3',
    'ch-chem-2',
    'pH Scale & Neutralisation',
    `
# pH Scale & Neutralisation

Acids produce $\\ce{H+}$ ions in water; bases produce $\\ce{OH-}$ ions.

## Neutralisation

$$\\ce{HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)}$$

$$\\ce{H+ (aq) + OH- (aq) -> H2O(l)}$$

## Calculating pH

$$\\text{pH} = -\\log_{10}[\\ce{H+}]$$

| Substance | Approx. pH |
|---|---|
| Stomach acid | 1 – 3 |
| Pure water | 7 |
| Blood | 7.4 |
| Soapy water | 10 – 12 |

> Strong acid + strong base → salt + water. Always add acid **to** water, never the reverse.
`,
    22,
  ),
  n(
    'note-4',
    'ch-phy-1',
    'Equations of Motion',
    `
# Equations of Motion (uniform acceleration)

$$v = u + at$$

$$s = ut + \\tfrac{1}{2}at^2$$

$$v^2 = u^2 + 2as$$

Where:

- $u$ — initial velocity
- $v$ — final velocity
- $a$ — acceleration
- $s$ — displacement
- $t$ — time taken

## Free fall

Drop an object from rest ($u = 0$):

$$h = \\tfrac{1}{2}g t^2, \\quad g \\approx \\pu{9.8 m/s2}$$
`,
    28,
  ),
  n(
    'note-5',
    'ch-phy-2',
    "Ohm's Law & Electrical Power",
    `
# Ohm's Law

$$V = IR$$

## Power

$$P = VI = I^2R = \\frac{V^2}{R}$$

## Series vs parallel resistance

Series: $R_{\\text{total}} = R_1 + R_2 + R_3 + \\dots$

Parallel:

$$\\frac{1}{R_{\\text{total}}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\dots$$
`,
    18,
  ),
  n(
    'note-6',
    'ch-math-1',
    'Derivatives & Integrals',
    `
# Derivatives & Integrals

## Common derivatives

$$\\frac{d}{dx}(x^n) = nx^{n-1}$$

$$\\frac{d}{dx}(\\sin x) = \\cos x \\qquad \\frac{d}{dx}(\\cos x) = -\\sin x$$

$$\\frac{d}{dx}(e^x) = e^x \\qquad \\frac{d}{dx}(\\ln x) = \\frac{1}{x}$$

## Common integrals

$$\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)$$

$$\\int \\frac{1}{x}\\, dx = \\ln|x| + C$$

## Definite integral example

$$\\int_0^1 x^2 \\, dx = \\left[ \\frac{x^3}{3} \\right]_0^1 = \\frac{1}{3}$$
`,
    25,
    true,
  ),
  n(
    'note-7',
    'ch-math-2',
    'Quadratic Formula',
    `
# Quadratic Formula

For $ax^2 + bx + c = 0$:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

The **discriminant** $\\Delta = b^2 - 4ac$ decides the nature of roots:

- $\\Delta > 0$ → two distinct real roots
- $\\Delta = 0$ → one repeated root
- $\\Delta < 0$ → complex conjugate roots

## Vieta's formulas

$$x_1 + x_2 = -\\frac{b}{a} \\qquad x_1 x_2 = \\frac{c}{a}$$
`,
    12,
  ),
  n(
    'note-8',
    'ch-bio-1',
    'Cell Organelles',
    `
# Cell Organelles

| Organelle | Function |
|---|---|
| Nucleus | Stores DNA, controls the cell |
| Mitochondria | Aerobic respiration → ATP |
| Ribosomes | Protein synthesis |
| Chloroplast | Photosynthesis (plant cells) |
| Lysosome | Digests worn-out organelles |

## Photosynthesis word equation

$$\\ce{6CO2 + 6H2O ->[\\text{light, chlorophyll}] C6H12O6 + 6O2}$$

## Respiration

$$\\ce{C6H12O6 + 6O2 -> 6CO2 + 6H2O + ATP}$$
`,
    20,
  ),
]

// ---------------------------------------------------------------------------
// Seed flashcards — a demo deck spanning EVERY chapter so the Flashcards tab
// is never a dead end on first run (==label== spans demonstrate the highlight
// formatting; math faces demonstrate LaTeX rendering).
// ---------------------------------------------------------------------------

function f(id: string, chapterId: string, front: string, back: string, ageDays: number): Flashcard {
  return {
    id,
    chapterId,
    front: front.trim(),
    back: back.trim(),
    createdAt: now - ageDays * day,
    updatedAt: now - ageDays * day / 2,
  }
}

export const seedFlashcards: Flashcard[] = [
  f(
    'card-chem-1',
    'ch-chem-1',
    `Balance this equation:

$$\\ce{H2 + O2 -> H2O}$$`,
    `$$\\ce{2H2 + O2 -> 2H2O}$$

**Why the 2s?** ==Hydrogen== is diatomic, and oxygen needs two atoms to pair up — the ==law of conservation of mass== means atoms are never lost, only rearranged.`,
    15,
  ),
  f(
    'card-chem-2',
    'ch-chem-1',
    `What does the ==state symbol== $(aq)$ mean after a chemical species?`,
    `**Aqueous** — dissolved in water.

| State | Meaning |
|---|---|
| $(s)$ | solid |
| $(l)$ | liquid |
| $(g)$ | gas |
| $(aq)$ | dissolved in water |`,
    14,
  ),
  f(
    'card-math-1',
    'ch-math-1',
    `State the ==chain rule== for $y = f(g(x))$.`,
    `$$\\frac{dy}{dx} = f'(g(x)) \\cdot g'(x)$$

Differentiate the **outside** function first (leaving the inside alone), then multiply by the derivative of the **inside**.`,
    10,
  ),
  f(
    'card-math-2',
    'ch-math-1',
    `What is $\\int x^n\\, dx$ (for $n \\neq -1$)?`,
    `$$\\int x^n\\, dx = \\frac{x^{n+1}}{n+1} + C$$

==Don't forget== the constant of integration $C$ — and the special case $\\int x^{-1} dx = \\ln|x| + C$.`,
    9,
  ),
  f(
    'card-chem-3',
    'ch-chem-1',
    `What is the difference between an ==exothermic== and an ==endothermic== reaction?`,
    `**Exothermic** — releases energy to the surroundings (temperature **rises**): combustion, respiration, neutralisation.

**Endothermic** — absorbs energy from the surroundings (temperature **falls**): photosynthesis, thermal decomposition.

Exothermic products have ==less== energy than the reactants; endothermic products have ==more==.`,
    13,
  ),
  f(
    'card-chem-4',
    'ch-chem-1',
    `What does ==OIL RIG== stand for in redox reactions?`,
    `**O**xidation **I**s **L**oss — **R**eduction **I**s **G**ain (of electrons).

$$\\ce{Cu^{2+} + 2e- -> Cu(s)}$$

The copper ions are ==reduced== — they gain two electrons.`,
    12,
  ),
  f(
    'card-chem-5',
    'ch-chem-2',
    `What does the ==pH scale== measure, and what do the numbers mean?`,
    `The concentration of $\\ce{H+}$ ions in solution.

| pH | Type |
|---|---|
| 0 – 6 | acidic |
| 7 | neutral |
| 8 – 14 | basic (alkaline) |

$$\\text{pH} = -\\log_{10}[\\ce{H+}]$$`,
    11,
  ),
  f(
    'card-chem-6',
    'ch-chem-2',
    `Write the ==ionic equation== for every acid–base neutralisation.`,
    `$$\\ce{H+ (aq) + OH- (aq) -> H2O(l)}$$

The salt's ions are ==spectator ions== — present but unchanged.`,
    10,
  ),
  f(
    'card-chem-7',
    'ch-chem-2',
    `Lab safety: why must you always add ==acid to water== — never water to acid?`,
    `Diluting concentrated acid is **highly exothermic**.

Acid added dropwise can't release much heat at once. Pour **water into acid** instead and the sudden heat can boil and ==splash== the acid out.`,
    9,
  ),
  f(
    'card-phy-1',
    'ch-phy-1',
    `List the ==three equations of motion== for uniform acceleration.`,
    `$$v = u + at$$

$$s = ut + \\tfrac{1}{2}at^2$$

$$v^2 = u^2 + 2as$$

$u$ initial velocity · $v$ final velocity · $a$ acceleration · $s$ displacement · $t$ time — valid only when $a$ is **constant**.`,
    8,
  ),
  f(
    'card-phy-2',
    'ch-phy-1',
    `A ball is ==dropped from rest==. How far does it fall in $t$ seconds?`,
    `$$h = \\tfrac{1}{2}g t^2, \\quad g \\approx \\pu{9.8 m/s2}$$

Example — after $t = 2$ s: $h = \\tfrac{1}{2}(9.8)(4) = \\pu{19.6 m}$`,
    7,
  ),
  f(
    'card-phy-3',
    'ch-phy-1',
    `Sort these into ==scalars== and ==vectors==: distance, displacement, speed, velocity, acceleration.`,
    `| Scalars (size only) | Vectors (size **and** direction) |
|---|---|
| distance | displacement |
| speed | velocity |
| — | acceleration |

==Displacement== is the straight-line change in position; distance is the total path travelled.`,
    6,
  ),
  f(
    'card-phy-4',
    'ch-phy-2',
    `State ==Ohm's law== and the three equivalent power formulas.`,
    `$$V = IR \\qquad P = VI = I^2R = \\frac{V^2}{R}$$

$V$ potential difference (V) · $I$ current (A) · $R$ resistance (Ω).`,
    5,
  ),
  f(
    'card-phy-5',
    'ch-phy-2',
    `How do resistors combine in ==series== and ==parallel==?`,
    `**Series** — just add:

$$R_{\\text{total}} = R_1 + R_2 + \\dots$$

**Parallel** — reciprocals add:

$$\\frac{1}{R_{\\text{total}}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\dots$$

The parallel total is always ==smaller== than the smallest branch.`,
    4,
  ),
  f(
    'card-math-3',
    'ch-math-1',
    `State the ==product rule== for $y = f(x)\\,g(x)$.`,
    `$$\\frac{dy}{dx} = f(x)\\,g'(x) + g(x)\\,f'(x)$$

**First times the derivative of the second, plus second times the derivative of the first.**`,
    5,
  ),
  f(
    'card-math-4',
    'ch-math-1',
    `Differentiate $\\sin x$, $\\cos x$ and $\\tan x$.`,
    `$$\\frac{d}{dx}(\\sin x) = \\cos x$$

$$\\frac{d}{dx}(\\cos x) = -\\sin x$$

$$\\frac{d}{dx}(\\tan x) = \\sec^2 x$$

==Co- goes negative== — the cosine derivative is the one that flips the sign.`,
    4,
  ),
  f(
    'card-math-5',
    'ch-math-2',
    `State the ==quadratic formula== and what the discriminant tells you.`,
    `$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

Discriminant $\\Delta = b^2 - 4ac$:

- $\\Delta > 0$ → two distinct real roots
- $\\Delta = 0$ → one repeated root
- $\\Delta < 0$ → complex conjugate roots`,
    3,
  ),
  f(
    'card-math-6',
    'ch-math-2',
    `What are ==Vieta's formulas== for $ax^2 + bx + c = 0$?`,
    `Sum of roots: $x_1 + x_2 = -\\dfrac{b}{a}$

Product of roots: $x_1 x_2 = \\dfrac{c}{a}$

Example — $x^2 - 5x + 6 = 0$: sum $= 5$, product $= 6$ → roots $2$ and $3$ ✓`,
    2,
  ),
  f(
    'card-bio-1',
    'ch-bio-1',
    `Why are mitochondria called the ==powerhouse of the cell==?`,
    `They carry out **aerobic respiration**, releasing energy from glucose as ==ATP==:

$$\\ce{C6H12O6 + 6O2 -> 6CO2 + 6H2O + ATP}$$

Energy-hungry cells (muscle, liver) contain many mitochondria.`,
    3,
  ),
  f(
    'card-bio-2',
    'ch-bio-1',
    `Write the ==balanced equation== for photosynthesis.`,
    `$$\\ce{6CO2 + 6H2O ->[\\text{light, chlorophyll}] C6H12O6 + 6O2}$$

Light energy ends up stored in the chemical bonds of ==glucose==.`,
    2,
  ),
  f(
    'card-bio-3',
    'ch-bio-1',
    `Match each organelle to its job: ==nucleus, ribosome, lysosome, chloroplast==.`,
    `| Organelle | Job |
|---|---|
| Nucleus | Stores DNA, controls the cell |
| Ribosome | Builds proteins |
| Lysosome | Digests worn-out parts |
| Chloroplast | Photosynthesis (plant cells) |`,
    1,
  ),
]

// ---------------------------------------------------------------------------
// Seed quizzes — a demo quiz per subject (each mixing all four question
// types) so the Quiz tab is never a dead end on first run. Returning users
// keep whatever quizzes they already have (persist wins over the seed).
// ---------------------------------------------------------------------------

function q(
  id: string,
  type: QuizQuestion['type'],
  prompt: string,
  extra: Partial<QuizQuestion>,
): QuizQuestion {
  return {
    id,
    type,
    prompt: prompt.trim(),
    options: [],
    correctOption: 0,
    acceptedAnswers: [],
    keywords: [],
    ...extra,
  }
}

const seedQuizQuestions: QuizQuestion[] = [
  q(
    'quizq-1',
    'mcq',
    `What must always be equal on both sides of a ==balanced== chemical equation?`,
    {
      options: [
        'The number of atoms of each element',
        'The number of molecules',
        'The number of electrons',
        'The total number of reactions',
      ],
      correctOption: 0,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-2',
    'fill-blank',
    `Complete the equation — in the Haber process, nitrogen reacts with hydrogen to produce ____ (name or formula).

$$\\ce{N2 + 3H2 -> 2NH3}$$`,
    {
      acceptedAnswers: ['ammonia', 'NH3'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-3',
    'name-item',
    `Zinc reacts with dilute hydrochloric acid:

$$\\ce{Zn + 2HCl -> ZnCl2 + H2 ^}$$

Name the gas given off (the ____ in the equation).`,
    {
      acceptedAnswers: ['hydrogen', 'H2'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-4',
    'answer',
    `Explain why increasing the temperature increases the rate of a reaction.`,
    {
      keywords: ['collision', 'energy', 'frequent'],
      timeLimit: 30,
    },
  ),
]

const seedKinematicsQuestions: QuizQuestion[] = [
  q(
    'quizq-phy-1',
    'mcq',
    `Which of these is a ==scalar== quantity?`,
    {
      options: ['Displacement', 'Velocity', 'Distance', 'Acceleration'],
      correctOption: 2,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-phy-2',
    'fill-blank',
    `Complete the first equation of motion: $v = u + $ ____`,
    {
      acceptedAnswers: ['at', 'a t'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-phy-3',
    'name-item',
    `The ==slope== of a velocity–time graph gives the ____.`,
    {
      acceptedAnswers: ['acceleration', 'accel'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-phy-4',
    'answer',
    `Explain the difference between **speed** and **velocity**.`,
    {
      keywords: ['vector', 'direction', 'magnitude'],
      timeLimit: 30,
    },
  ),
]

const seedCalculusQuestions: QuizQuestion[] = [
  q(
    'quizq-math-1',
    'mcq',
    `What is $\\frac{d}{dx}(x^5)$?`,
    {
      options: ['x^4', '5x^4', 'x^6/6', '4x^5'],
      correctOption: 1,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-math-2',
    'fill-blank',
    `Differentiate: $\\frac{d}{dx}(\\sin x) = $ ____`,
    {
      acceptedAnswers: ['cos x', 'cosx', 'cos(x)'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-math-3',
    'name-item',
    `The ==reverse== of differentiation is called ____.`,
    {
      acceptedAnswers: ['integration', 'integrating', 'antiderivative', 'anti derivative'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-math-4',
    'answer',
    `What does the ==derivative== of a function tell us **geometrically**?`,
    {
      keywords: ['slope', 'gradient', 'tangent'],
      timeLimit: 30,
    },
  ),
]

const seedCellQuestions: QuizQuestion[] = [
  q(
    'quizq-bio-1',
    'mcq',
    `Which organelle is the site of **aerobic respiration**?`,
    {
      options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Lysosome'],
      correctOption: 2,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-bio-2',
    'name-item',
    `Which organelle contains ==chlorophyll== and carries out photosynthesis?`,
    {
      acceptedAnswers: ['chloroplast', 'chloroplasts', 'the chloroplast'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-bio-3',
    'fill-blank',
    `Respiration: glucose + oxygen → carbon dioxide + water + ____`,
    {
      acceptedAnswers: ['atp', 'energy'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-bio-4',
    'answer',
    `Explain why **plant cells** contain chloroplasts but animal cells do not.`,
    {
      keywords: ['photosynthesis', 'food', 'sunlight'],
      timeLimit: 30,
    },
  ),
]

const seedPhQuestions: QuizQuestion[] = [
  q(
    'quizq-chem-5',
    'mcq',
    `Which pH value belongs to a **strong base**?`,
    {
      options: ['1', '7', '4', '14'],
      correctOption: 3,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-chem-6',
    'fill-blank',
    `Complete the neutralisation: $\\ce{HCl + NaOH -> NaCl + }$ ____`,
    {
      acceptedAnswers: ['water', 'h2o'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-chem-7',
    'name-item',
    `The reaction between an acid and a base is called ____.`,
    {
      acceptedAnswers: ['neutralisation', 'neutralization', 'neutralisation reaction', 'neutralization reaction'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-chem-8',
    'answer',
    `Why must you always add **acid to water**, and never water to acid?`,
    {
      keywords: ['exothermic', 'heat', 'splash'],
      timeLimit: 30,
    },
  ),
]

export const seedQuizzes: Quiz[] = [
  {
    id: 'quiz-chem-1',
    chapterId: 'ch-chem-1',
    title: 'Chemical reactions — quick check',
    questions: seedQuizQuestions,
    createdAt: now - 8 * day,
    updatedAt: now - 8 * day / 2,
  },
  {
    id: 'quiz-phy-1',
    chapterId: 'ch-phy-1',
    title: 'Kinematics — quick check',
    questions: seedKinematicsQuestions,
    createdAt: now - 7 * day,
    updatedAt: now - 7 * day / 2,
  },
  {
    id: 'quiz-math-1',
    chapterId: 'ch-math-1',
    title: 'Calculus — quick check',
    questions: seedCalculusQuestions,
    createdAt: now - 6 * day,
    updatedAt: now - 6 * day / 2,
  },
  {
    id: 'quiz-bio-1',
    chapterId: 'ch-bio-1',
    title: 'Cell biology — quick check',
    questions: seedCellQuestions,
    createdAt: now - 5 * day,
    updatedAt: now - 5 * day / 2,
  },
  {
    id: 'quiz-chem-2',
    chapterId: 'ch-chem-2',
    title: 'Acids, bases & salts — quick check',
    questions: seedPhQuestions,
    createdAt: now - 4 * day,
    updatedAt: now - 4 * day / 2,
  },
]
