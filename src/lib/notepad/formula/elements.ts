/**
 * Periodic table dataset — all 108 chemistry elements with their standard
 * table position, used by the formula maker's element picker.
 *
 * Grid coordinates: `col` 1–18 (group), `row` 1–7 (period). The f-block sits
 * below the main table: row 8 is kept empty as a visual gap, lanthanides are
 * row 9 and actinides row 10 (cols 3–17), matching the common wall-chart
 * layout where cells (6,3)/(7,3) show "57–71" / "89–103" placeholders.
 */

export type ElementCategory =
  | 'alkali'
  | 'alkaline'
  | 'transition'
  | 'postTransition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble'
  | 'lanthanide'
  | 'actinide'

export interface ChemElement {
  /** atomic number, 1–108 */
  number: number
  symbol: string
  name: string
  category: ElementCategory
  /** grid column 1–18 */
  col: number
  /**
   * grid row: 1–7 main table, 9 lanthanides, 10 actinides
   * (row 8 stays empty as the separation gap)
   */
  row: number
}

/** tile colouring per category (kept blue-free; white text on strong hues) */
export const CATEGORY_META: Record<ElementCategory, { label: string; tile: string }> = {
  alkali: { label: 'Alkali metal', tile: 'bg-rose-600 text-white' },
  alkaline: { label: 'Alkaline earth metal', tile: 'bg-orange-500 text-white' },
  transition: { label: 'Transition metal', tile: 'bg-yellow-600 text-white' },
  postTransition: { label: 'Post-transition metal', tile: 'bg-lime-700 text-white' },
  metalloid: { label: 'Metalloid', tile: 'bg-teal-600 text-white' },
  nonmetal: { label: 'Reactive nonmetal', tile: 'bg-emerald-600 text-white' },
  halogen: { label: 'Halogen', tile: 'bg-cyan-700 text-white' },
  noble: { label: 'Noble gas', tile: 'bg-violet-600 text-white' },
  lanthanide: { label: 'Lanthanide', tile: 'bg-fuchsia-700 text-white' },
  actinide: { label: 'Actinide', tile: 'bg-pink-700 text-white' },
}

/** [atomic number, symbol, name, category, column, row] */
type RawElement = [number, string, string, ElementCategory, number, number]

const RAW: RawElement[] = [
  // period 1
  [1, 'H', 'Hydrogen', 'nonmetal', 1, 1],
  [2, 'He', 'Helium', 'noble', 18, 1],
  // period 2
  [3, 'Li', 'Lithium', 'alkali', 1, 2],
  [4, 'Be', 'Beryllium', 'alkaline', 2, 2],
  [5, 'B', 'Boron', 'metalloid', 13, 2],
  [6, 'C', 'Carbon', 'nonmetal', 14, 2],
  [7, 'N', 'Nitrogen', 'nonmetal', 15, 2],
  [8, 'O', 'Oxygen', 'nonmetal', 16, 2],
  [9, 'F', 'Fluorine', 'halogen', 17, 2],
  [10, 'Ne', 'Neon', 'noble', 18, 2],
  // period 3
  [11, 'Na', 'Sodium', 'alkali', 1, 3],
  [12, 'Mg', 'Magnesium', 'alkaline', 2, 3],
  [13, 'Al', 'Aluminum', 'postTransition', 13, 3],
  [14, 'Si', 'Silicon', 'metalloid', 14, 3],
  [15, 'P', 'Phosphorus', 'nonmetal', 15, 3],
  [16, 'S', 'Sulfur', 'nonmetal', 16, 3],
  [17, 'Cl', 'Chlorine', 'halogen', 17, 3],
  [18, 'Ar', 'Argon', 'noble', 18, 3],
  // period 4
  [19, 'K', 'Potassium', 'alkali', 1, 4],
  [20, 'Ca', 'Calcium', 'alkaline', 2, 4],
  [21, 'Sc', 'Scandium', 'transition', 3, 4],
  [22, 'Ti', 'Titanium', 'transition', 4, 4],
  [23, 'V', 'Vanadium', 'transition', 5, 4],
  [24, 'Cr', 'Chromium', 'transition', 6, 4],
  [25, 'Mn', 'Manganese', 'transition', 7, 4],
  [26, 'Fe', 'Iron', 'transition', 8, 4],
  [27, 'Co', 'Cobalt', 'transition', 9, 4],
  [28, 'Ni', 'Nickel', 'transition', 10, 4],
  [29, 'Cu', 'Copper', 'transition', 11, 4],
  [30, 'Zn', 'Zinc', 'transition', 12, 4],
  [31, 'Ga', 'Gallium', 'postTransition', 13, 4],
  [32, 'Ge', 'Germanium', 'metalloid', 14, 4],
  [33, 'As', 'Arsenic', 'metalloid', 15, 4],
  [34, 'Se', 'Selenium', 'nonmetal', 16, 4],
  [35, 'Br', 'Bromine', 'halogen', 17, 4],
  [36, 'Kr', 'Krypton', 'noble', 18, 4],
  // period 5
  [37, 'Rb', 'Rubidium', 'alkali', 1, 5],
  [38, 'Sr', 'Strontium', 'alkaline', 2, 5],
  [39, 'Y', 'Yttrium', 'transition', 3, 5],
  [40, 'Zr', 'Zirconium', 'transition', 4, 5],
  [41, 'Nb', 'Niobium', 'transition', 5, 5],
  [42, 'Mo', 'Molybdenum', 'transition', 6, 5],
  [43, 'Tc', 'Technetium', 'transition', 7, 5],
  [44, 'Ru', 'Ruthenium', 'transition', 8, 5],
  [45, 'Rh', 'Rhodium', 'transition', 9, 5],
  [46, 'Pd', 'Palladium', 'transition', 10, 5],
  [47, 'Ag', 'Silver', 'transition', 11, 5],
  [48, 'Cd', 'Cadmium', 'transition', 12, 5],
  [49, 'In', 'Indium', 'postTransition', 13, 5],
  [50, 'Sn', 'Tin', 'postTransition', 14, 5],
  [51, 'Sb', 'Antimony', 'metalloid', 15, 5],
  [52, 'Te', 'Tellurium', 'metalloid', 16, 5],
  [53, 'I', 'Iodine', 'halogen', 17, 5],
  [54, 'Xe', 'Xenon', 'noble', 18, 5],
  // period 6 (La–Lu live in the lanthanide row below)
  [55, 'Cs', 'Cesium', 'alkali', 1, 6],
  [56, 'Ba', 'Barium', 'alkaline', 2, 6],
  [72, 'Hf', 'Hafnium', 'transition', 4, 6],
  [73, 'Ta', 'Tantalum', 'transition', 5, 6],
  [74, 'W', 'Tungsten', 'transition', 6, 6],
  [75, 'Re', 'Rhenium', 'transition', 7, 6],
  [76, 'Os', 'Osmium', 'transition', 8, 6],
  [77, 'Ir', 'Iridium', 'transition', 9, 6],
  [78, 'Pt', 'Platinum', 'transition', 10, 6],
  [79, 'Au', 'Gold', 'transition', 11, 6],
  [80, 'Hg', 'Mercury', 'transition', 12, 6],
  [81, 'Tl', 'Thallium', 'postTransition', 13, 6],
  [82, 'Pb', 'Lead', 'postTransition', 14, 6],
  [83, 'Bi', 'Bismuth', 'postTransition', 15, 6],
  [84, 'Po', 'Polonium', 'postTransition', 16, 6],
  [85, 'At', 'Astatine', 'halogen', 17, 6],
  [86, 'Rn', 'Radon', 'noble', 18, 6],
  // period 7 (Ac–Lr live in the actinide row below) — ends at 108
  [87, 'Fr', 'Francium', 'alkali', 1, 7],
  [88, 'Ra', 'Radium', 'alkaline', 2, 7],
  [104, 'Rf', 'Rutherfordium', 'transition', 4, 7],
  [105, 'Db', 'Dubnium', 'transition', 5, 7],
  [106, 'Sg', 'Seaborgium', 'transition', 6, 7],
  [107, 'Bh', 'Bohrium', 'transition', 7, 7],
  [108, 'Hs', 'Hassium', 'transition', 8, 7],
  // lanthanides — row 9, cols 3–17
  [57, 'La', 'Lanthanum', 'lanthanide', 3, 9],
  [58, 'Ce', 'Cerium', 'lanthanide', 4, 9],
  [59, 'Pr', 'Praseodymium', 'lanthanide', 5, 9],
  [60, 'Nd', 'Neodymium', 'lanthanide', 6, 9],
  [61, 'Pm', 'Promethium', 'lanthanide', 7, 9],
  [62, 'Sm', 'Samarium', 'lanthanide', 8, 9],
  [63, 'Eu', 'Europium', 'lanthanide', 9, 9],
  [64, 'Gd', 'Gadolinium', 'lanthanide', 10, 9],
  [65, 'Tb', 'Terbium', 'lanthanide', 11, 9],
  [66, 'Dy', 'Dysprosium', 'lanthanide', 12, 9],
  [67, 'Ho', 'Holmium', 'lanthanide', 13, 9],
  [68, 'Er', 'Erbium', 'lanthanide', 14, 9],
  [69, 'Tm', 'Thulium', 'lanthanide', 15, 9],
  [70, 'Yb', 'Ytterbium', 'lanthanide', 16, 9],
  [71, 'Lu', 'Lutetium', 'lanthanide', 17, 9],
  // actinides — row 10, cols 3–17
  [89, 'Ac', 'Actinium', 'actinide', 3, 10],
  [90, 'Th', 'Thorium', 'actinide', 4, 10],
  [91, 'Pa', 'Protactinium', 'actinide', 5, 10],
  [92, 'U', 'Uranium', 'actinide', 6, 10],
  [93, 'Np', 'Neptunium', 'actinide', 7, 10],
  [94, 'Pu', 'Plutonium', 'actinide', 8, 10],
  [95, 'Am', 'Americium', 'actinide', 9, 10],
  [96, 'Cm', 'Curium', 'actinide', 10, 10],
  [97, 'Bk', 'Berkelium', 'actinide', 11, 10],
  [98, 'Cf', 'Californium', 'actinide', 12, 10],
  [99, 'Es', 'Einsteinium', 'actinide', 13, 10],
  [100, 'Fm', 'Fermium', 'actinide', 14, 10],
  [101, 'Md', 'Mendelevium', 'actinide', 15, 10],
  [102, 'No', 'Nobelium', 'actinide', 16, 10],
  [103, 'Lr', 'Lawrencium', 'actinide', 17, 10],
]

export const ELEMENTS: ChemElement[] = RAW.map(([number, symbol, name, category, col, row]) => ({
  number,
  symbol,
  name,
  category,
  col,
  row,
}))

/** quick symbol → element lookup (used to validate typed symbols) */
export const ELEMENTS_BY_SYMBOL: ReadonlyMap<string, ChemElement> = new Map(
  ELEMENTS.map((el) => [el.symbol, el]),
)

/** cells (6,3) and (7,3) mark where the f-block rows come from */
export const F_BLOCK_PLACEHOLDERS: { col: number; row: number; label: string }[] = [
  { col: 3, row: 6, label: '57–71' },
  { col: 3, row: 7, label: '89–103' },
]
