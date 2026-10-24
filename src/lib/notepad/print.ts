'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// ---------- settings model ----------

export type PaperId = 'a4' | 'letter' | 'a5' | 'legal'
export type Orientation = 'portrait' | 'landscape'
export type ColorMode = 'color' | 'bw'

export interface PrintSettings {
  paper: PaperId
  orientation: Orientation
  /** page margins in millimetres (0–40) */
  marginMm: number
  /** base text size in points (9–16) */
  textSizePt: number
  colorMode: ColorMode
  /** print background colours (code blocks, quotes, table headers) */
  backgrounds: boolean
  /** title + subject · chapter + date block on page 1 */
  titleBlock: boolean
  /** “Page X of Y” centred in the footer (via @page margin boxes) */
  pageNumbers: boolean
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paper: 'a4',
  orientation: 'portrait',
  marginMm: 18,
  textSizePt: 12,
  colorMode: 'color',
  backgrounds: true,
  titleBlock: true,
  pageNumbers: true,
}

// ---------- paper geometry ----------

export const PAPERS: { id: PaperId; label: string; wMm: number; hMm: number }[] = [
  { id: 'a4', label: 'A4', wMm: 210, hMm: 297 },
  { id: 'letter', label: 'Letter', wMm: 215.9, hMm: 279.4 },
  { id: 'a5', label: 'A5', wMm: 148, hMm: 210 },
  { id: 'legal', label: 'Legal', wMm: 215.9, hMm: 355.6 },
]

/** CSS pixels per millimetre at 96 dpi */
export const MM_PX = 96 / 25.4
export const mmToPx = (mm: number) => mm * MM_PX

export function paperDims(s: PrintSettings) {
  const p = PAPERS.find((x) => x.id === s.paper) ?? PAPERS[0]
  const swap = s.orientation === 'landscape'
  const wMm = swap ? p.hMm : p.wMm
  const hMm = swap ? p.wMm : p.hMm
  return { wMm, hMm, wPx: mmToPx(wMm), hPx: mmToPx(hMm) }
}

export function contentDims(s: PrintSettings) {
  const { wPx, hPx } = paperDims(s)
  const marginPx = mmToPx(s.marginMm)
  return { marginPx, wPx: wPx - 2 * marginPx, hPx: hPx - 2 * marginPx }
}

/**
 * Dynamic @page rules consumed by the browser print engine.
 * A separate <style> tag inside #print-root keeps these in sync with settings.
 */
export function buildPrintCss(s: PrintSettings): string {
  const { wMm, hMm } = paperDims(s)
  const rules = [`@page { size: ${wMm}mm ${hMm}mm; margin: ${s.marginMm}mm; }`]
  if (s.pageNumbers) {
    rules.push(
      [
        '@page {',
        '  @bottom-center {',
        '    content: "Page " counter(page) " of " counter(pages);',
        '    font-size: 9pt;',
        '    color: #6b7280;',
        '  }',
        '}',
      ].join('\n'),
    )
  }
  return rules.join('\n')
}

// ---------- settings store (persisted to localStorage) ----------

interface PrintStore {
  settings: PrintSettings
  update: (patch: Partial<PrintSettings>) => void
  reset: () => void
}

export const usePrintStore = create<PrintStore>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_PRINT_SETTINGS },
      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      reset: () => set({ settings: { ...DEFAULT_PRINT_SETTINGS } }),
    }),
    {
      name: 'studypad-print-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings }),
    },
  ),
)
