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
  f(
    'card-rx-1',
    'ch-chem-1',
    `What is a ==catalyst==, and does it get used up?`,
    `A substance that speeds up a reaction by providing an **alternative pathway with lower activation energy**.

- It is ==not consumed== — the same mass comes out at the end
- It speeds up the forward *and* reverse reaction equally, so the ==equilibrium position is unchanged==

$$\\ce{2H2O2 ->[\\text{MnO2 catalyst}] 2H2O + O2 ^}$$`,
    8,
  ),
  f(
    'card-rx-2',
    'ch-chem-1',
    `Why is ==rusting== a redox reaction — and how can it be prevented?`,
    `Iron is ==oxidised== (loses electrons) while oxygen is ==reduced== (gains them). Rust is hydrated iron(III) oxide:

$$\\ce{4Fe + 3O2 -> 2Fe2O3}$$

| Prevention | How it works |
|---|---|
| Painting / oiling | physical barrier keeps out air & water |
| Galvanising | zinc coat corrodes ==first== (sacrificial protection) |
| Alloying (stainless) | chromium layer is unreactive |`,
    7,
  ),
  f(
    'card-ab-1',
    'ch-chem-2',
    `Name ==two indicators== and their colours in acid vs alkali.`,
    `| Indicator | In acid | In alkali |
|---|---|---|
| Litmus | red | blue |
| Methyl orange | red | yellow |
| Phenolphthalein | colourless | pink |

==Universal indicator== shows the whole pH range as one continuous colour gradient.`,
    7,
  ),
  f(
    'card-ab-2',
    'ch-chem-2',
    `What salt forms when ==sulphuric acid== reacts with potassium hydroxide?`,
    `**Potassium sulphate**, $\\ce{K2SO4}$:

$$\\ce{H2SO4 + 2KOH -> K2SO4 + 2H2O}$$

Acid + base → ==salt + water==, always. The name comes from the acid (sulphuric → ==sulphate==) and the base (potassium).`,
    6,
  ),
  f(
    'card-kin-1',
    'ch-phy-1',
    `What does the ==gradient== of a distance–time graph tell you?`,
    `The **speed** of the object.

| Graph shape | Meaning |
|---|---|
| Horizontal line | object is ==at rest== |
| Straight slope | constant speed |
| Steepening curve | accelerating |
| Levelling curve | decelerating |`,
    6,
  ),
  f(
    'card-kin-2',
    'ch-phy-1',
    `Why does a ==skydiver== reach terminal velocity?`,
    `Air resistance grows with speed — until it ==balances weight==:

1. At first: weight > drag → accelerates downwards
2. As speed grows, drag grows → resultant force shrinks → acceleration falls
3. Drag = weight → resultant force is ==zero== → constant (terminal) velocity`,
    5,
  ),
  f(
    'card-elec-1',
    'ch-phy-2',
    `State the ==current== and ==voltage== rules for series and parallel circuits.`,
    `| | Series | Parallel |
|---|---|---|
| Current | the ==same== everywhere | splits between branches |
| Voltage | shared between components | the ==same== across each branch |`,
    5,
  ),
  f(
    'card-elec-2',
    'ch-phy-2',
    `A 230 V heater draws a current of 4 A. What ==power== does it use?`,
    `$$P = VI = 230 \\times 4 = \\pu{920 W}$$

Left on for 30 s it transfers $E = Pt = 920 \\times 30 = \\pu{27600 J}$ — energy is ==power × time==.`,
    4,
  ),
  f(
    'card-calc-1',
    'ch-math-1',
    `State the ==quotient rule== for $y = \\frac{f(x)}{g(x)}$.`,
    `$$\\frac{dy}{dx} = \\frac{g(x)\\,f'(x) - f(x)\\,g'(x)}{[g(x)]^2}$$

Mnemonic: **low d-high minus high d-low, over low-low** — the order of the subtraction ==matters==, unlike in the product rule.`,
    4,
  ),
  f(
    'card-calc-2',
    'ch-math-1',
    `How do you evaluate a ==definite integral== like $\\int_1^3 2x\\,dx$?`,
    `Find the antiderivative, then subtract at the limits:

$$\\int_1^3 2x\\,dx = \\left[x^2\\right]_1^3 = 9 - 1 = 8$$

The constant of integration $C$ ==cancels out== in definite integrals, so you can leave it out.`,
    3,
  ),
  f(
    'card-alg-1',
    'ch-math-2',
    `Factorise $x^2 - 49$ — which ==identity== applies?`,
    `**Difference of two squares:** $a^2 - b^2 = (a-b)(a+b)$

$$x^2 - 49 = (x-7)(x+7)$$

Spot it whenever two ==perfect squares== are subtracted — there is no middle $x$ term.`,
    3,
  ),
  f(
    'card-alg-2',
    'ch-math-2',
    `Write $x^2 + 6x + 5$ in ==completed square== form.`,
    `$$x^2 + 6x + 5 = (x+3)^2 - 9 + 5 = (x+3)^2 - 4$$

Halve the $x$ coefficient ($6 \\to 3$), square it — then ==subtract what you added==.

Bonus: completed-square form reveals the turning point instantly: $(-3, -4)$.`,
    2,
  ),
  f(
    'card-cell-1',
    'ch-bio-1',
    `What is the difference between ==diffusion== and ==osmosis==?`,
    `| | Diffusion | Osmosis |
|---|---|---|
| Moves | any gas/liquid particles | ==water only== |
| Direction | high → low concentration | high → low water potential, across a ==partially permeable membrane== |
| Example | oxygen diffuses into blood | water enters root hair cells |`,
    2,
  ),
  f(
    'card-cell-2',
    'ch-bio-1',
    `How is a ==sperm cell== specialised for its job?`,
    `| Feature | Function |
|---|---|
| Tail (flagellum) | swims towards the egg |
| Many mitochondria | release ==ATP== to power swimming |
| Enzymes in the head | digest through the egg's outer layer |
| Half the DNA | combines with the egg's at fertilisation |`,
    1,
  ),
]

// ---------------------------------------------------------------------------
// Seed quizzes — a demo quiz for every chapter (each mixing all four
// question types) so the Quiz tab is never a dead end on first run.
// Returning users keep whatever quizzes they already have (persist wins
// over the seed).
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
  q(
    'quizq-5',
    'mcq',
    `Which of these is a ==displacement== reaction?`,
    {
      options: [
        'Iron + copper sulphate → iron sulphate + copper',
        'Calcium carbonate → calcium oxide + carbon dioxide',
        'Water → hydrogen + oxygen',
        'Methane + oxygen → carbon dioxide + water',
      ],
      correctOption: 0,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-6',
    'fill-blank',
    `A catalyst increases the ____ of a reaction but is ==not consumed==.`,
    {
      acceptedAnswers: ['rate', 'speed', 'rate of reaction'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-7',
    'name-item',
    `What ==type== of reaction is this?

$$\\ce{CaCO3 -> CaO + CO2}$$`,
    {
      acceptedAnswers: ['decomposition', 'thermal decomposition'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-8',
    'answer',
    `Explain why a ==higher concentration== of acid increases the rate of a reaction.`,
    {
      keywords: ['collision', 'frequent', 'concentration'],
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
  q(
    'quizq-phy-5',
    'mcq',
    `A car moves at ==constant velocity==. Its acceleration is…`,
    {
      options: ['9.8 m/s^2', '0', 'constant but not zero', 'equal to the speed'],
      correctOption: 1,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-phy-6',
    'fill-blank',
    `Complete the third equation of motion: $v^2 = u^2 + 2$ ____`,
    {
      acceptedAnswers: ['as', 'a s'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-phy-7',
    'name-item',
    `The ==area under== a velocity–time graph gives the ____.`,
    {
      acceptedAnswers: ['displacement', 'distance'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-phy-8',
    'answer',
    `Explain why a falling object's acceleration ==decreases== until it reaches terminal velocity.`,
    {
      keywords: ['air resistance', 'weight', 'balance'],
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
  q(
    'quizq-math-5',
    'mcq',
    `What is $\\frac{d}{dx}(e^x)$?`,
    {
      options: ['e^x', 'xe^(x-1)', 'e^x / x', 'ln x'],
      correctOption: 0,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-math-6',
    'fill-blank',
    `Integrate: $\\int \\frac{1}{x}\\,dx = $ ____`,
    {
      acceptedAnswers: ['ln x', 'log x', 'ln abs x'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-math-7',
    'name-item',
    `Evaluate the definite integral $\\int_0^1 x^2\\,dx$.`,
    {
      acceptedAnswers: ['1/3', 'one third', '0.33', '0.333'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-math-8',
    'answer',
    `State the ==power rule== for integration and when its special case applies.`,
    {
      keywords: ['power', 'divide', 'ln'],
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
  q(
    'quizq-bio-5',
    'mcq',
    `Which structure ==controls== what enters and leaves the cell?`,
    {
      options: ['Nucleus', 'Cell membrane', 'Cell wall', 'Vacuole'],
      correctOption: 1,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-bio-6',
    'fill-blank',
    `Photosynthesis needs carbon dioxide + ____ + light energy.`,
    {
      acceptedAnswers: ['water', 'h2o'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-bio-7',
    'name-item',
    `The ==jelly-like== substance in which organelles are suspended is the ____.`,
    {
      acceptedAnswers: ['cytoplasm', 'the cytoplasm'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-bio-8',
    'answer',
    `Explain how ==root hair cells== are adapted for absorbing water.`,
    {
      keywords: ['surface area', 'osmosis', 'thin'],
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
  q(
    'quizq-chem-9',
    'mcq',
    `Which solution is ==acidic==?`,
    {
      options: ['Lemon juice, pH 3', 'Pure water, pH 7', 'Baking soda, pH 9', 'Soap, pH 10'],
      correctOption: 0,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-chem-10',
    'fill-blank',
    `Blue litmus paper turns ____ in an acid.`,
    {
      acceptedAnswers: ['red'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-chem-11',
    'name-item',
    `Name the salt formed when ==hydrochloric acid== reacts with sodium hydroxide.`,
    {
      acceptedAnswers: ['sodium chloride', 'nacl', 'table salt', 'common salt'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-chem-12',
    'answer',
    `Describe how you would ==prepare== a pure, dry sample of a soluble salt in the lab.`,
    {
      keywords: ['acid', 'evaporate', 'crystallise'],
      timeLimit: 30,
    },
  ),
]

const seedElectricityQuestions: QuizQuestion[] = [
  q(
    'quizq-elec-1',
    'mcq',
    `What is the ==SI unit== of resistance?`,
    {
      options: ['Volt', 'Ampere', 'Ohm', 'Watt'],
      correctOption: 2,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-elec-2',
    'mcq',
    `In a ==series== circuit, what is the same through every component?`,
    {
      options: ['Current', 'Voltage', 'Resistance', 'Power'],
      correctOption: 0,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-elec-3',
    'fill-blank',
    `Complete Ohm's law: $V = I \\times$ ____`,
    {
      acceptedAnswers: ['resistance', 'r', 'ohms'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-elec-4',
    'name-item',
    `Which ==instrument== measures electric current in a circuit?`,
    {
      acceptedAnswers: ['ammeter', 'an ammeter', 'amp meter'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-elec-5',
    'name-item',
    `A 230 V appliance draws a current of 4 A. Calculate its ==power== in watts.`,
    {
      acceptedAnswers: ['920 w', '920', '920 watts'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-elec-6',
    'answer',
    `Explain why adding more branches to a ==parallel== circuit lowers the total resistance.`,
    {
      keywords: ['paths', 'current'],
      timeLimit: 30,
    },
  ),
]

const seedAlgebraQuestions: QuizQuestion[] = [
  q(
    'quizq-alg-1',
    'mcq',
    `Factorise $x^2 - 9$.`,
    {
      options: ['(x-3)(x+3)', '(x-9)(x+1)', '(x+3)^2', '(x-3)^2'],
      correctOption: 0,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-alg-2',
    'mcq',
    `If the ==discriminant== $\\Delta = 0$, the equation has…`,
    {
      options: ['two distinct real roots', 'one repeated root', 'complex conjugate roots', 'no roots'],
      correctOption: 1,
      timeLimit: 20,
    },
  ),
  q(
    'quizq-alg-3',
    'fill-blank',
    `Quadratic formula: you divide $-b \\pm \\sqrt{b^2 - 4ac}$ by ____`,
    {
      acceptedAnswers: ['2a', '2 a', 'two a'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-alg-4',
    'name-item',
    `What is the name of the expression $b^2 - 4ac$?`,
    {
      acceptedAnswers: ['discriminant', 'the discriminant'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-alg-5',
    'name-item',
    `Solve $x^2 - 5x + 6 = 0$. What is the ==smaller== root?`,
    {
      acceptedAnswers: ['2', 'x = 2', 'two'],
      timeLimit: 20,
    },
  ),
  q(
    'quizq-alg-6',
    'answer',
    `Explain how ==Vieta's formulas== help you check a factorisation.`,
    {
      keywords: ['sum', 'product', 'roots'],
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
  {
    id: 'quiz-phy-2',
    chapterId: 'ch-phy-2',
    title: 'Electricity — quick check',
    questions: seedElectricityQuestions,
    createdAt: now - 3 * day,
    updatedAt: now - 3 * day / 2,
  },
  {
    id: 'quiz-math-2',
    chapterId: 'ch-math-2',
    title: 'Algebra — quick check',
    questions: seedAlgebraQuestions,
    createdAt: now - 2 * day,
    updatedAt: now - 2 * day / 2,
  },
]
