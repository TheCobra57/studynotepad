import type { Chapter, Note, Subject } from './types'

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
