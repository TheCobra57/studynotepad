'use client'

import { useEffect, useRef, useState } from 'react'
import { Printer, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { useNotepadStore, useSelectedNote } from '@/lib/notepad/store'
import {
  PAPERS,
  contentDims,
  paperDims,
  usePrintStore,
  type PaperId,
} from '@/lib/notepad/print'
import { PrintBody } from './print-body'

interface PrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ZoomMode = 'fit' | '75' | '100'

interface MeasuredItem {
  el: HTMLElement
  h: number
  heading: boolean
}

export function PrintDialog({ open, onOpenChange }: PrintDialogProps) {
  const note = useSelectedNote()
  const chapters = useNotepadStore((s) => s.chapters)
  const subjects = useNotepadStore((s) => s.subjects)
  const settings = usePrintStore((s) => s.settings)
  const update = usePrintStore((s) => s.update)
  const reset = usePrintStore((s) => s.reset)

  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit')
  const [tick, setTick] = useState(0)
  const [printing, setPrinting] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)

  const chapter = note ? (chapters.find((c) => c.id === note.chapterId) ?? null) : null
  const subject = chapter ? (subjects.find((s) => s.id === chapter.subjectId) ?? null) : null

  const { wPx: paperW, hPx: paperH } = paperDims(settings)
  const { marginPx, wPx: contentW, hPx: contentH } = contentDims(settings)

  // re-run the preview build whenever the preview column resizes
  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (!el) return
    const bump = () => setTick((t) => t + 1)
    const ro = new ResizeObserver(bump)
    ro.observe(el)
    window.addEventListener('resize', bump)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', bump)
    }
  }, [open])

  // paginate the note (real page breaks) and build the preview sheets
  useEffect(() => {
    if (!open || !note) return
    const raf = requestAnimationFrame(() => {
      const measure = measureRef.current
      const stack = stackRef.current
      if (!measure || !stack) return
      const contentEl = measure.querySelector<HTMLElement>('.print-content')
      if (!contentEl) return

      // effective zoom — "fit" is computed from the live preview column width
      const scroll = scrollRef.current
      let effZoom: number
      if (zoomMode === 'fit' && scroll) {
        const cs = getComputedStyle(scroll)
        const avail =
          scroll.clientWidth -
          parseFloat(cs.paddingLeft || '0') -
          parseFloat(cs.paddingRight || '0') -
          10 /* scrollbar safety */
        effZoom = Math.min(1, Math.max(0.25, avail / paperW))
      } else {
        effZoom = Number(zoomMode) / 100
      }

      // ---- measure top-level blocks (incl. the optional title block) ----
      const items: MeasuredItem[] = []
      for (const child of Array.from(contentEl.children)) {
        if (!(child instanceof HTMLElement)) continue
        const cs = getComputedStyle(child)
        const h =
          child.getBoundingClientRect().height +
          parseFloat(cs.marginTop || '0') +
          parseFloat(cs.marginBottom || '0')
        items.push({ el: child, h, heading: /^H[1-6]$/.test(child.tagName) })
      }

      // ---- greedy pagination — mirrors the print CSS break rules ----
      const groups: MeasuredItem[][] = []
      let cur: MeasuredItem[] = []
      let used = 0
      const flush = () => {
        if (cur.length) {
          groups.push(cur)
          cur = []
          used = 0
        }
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const nxt = items[i + 1]
        // this block doesn't fit -> close the current page first
        const overflows = used + it.h > contentH && cur.length > 0
        // a heading must not be stranded at the bottom of a page
        const strandedHeading =
          it.heading && cur.length > 0 && !!nxt && nxt.h <= contentH && used + it.h + nxt.h > contentH
        if (overflows || strandedHeading) flush()
        cur.push(it)
        used += it.h
      }
      flush()
      if (!groups.length) groups.push([]) // empty note -> one blank page

      // ---- build the preview DOM ----
      stack.textContent = ''
      groups.forEach((group, pageIdx) => {
        const sheet = document.createElement('div')
        sheet.className = 'print-sheet'
        sheet.style.width = `${Math.round(paperW * effZoom)}px`
        sheet.style.height = `${Math.round(paperH * effZoom)}px`
        sheet.style.margin = '0 auto 18px'

        const scale = document.createElement('div')
        scale.style.width = `${paperW}px`
        scale.style.height = `${paperH}px`
        scale.style.transform = `scale(${effZoom})`
        scale.style.transformOrigin = 'top left'
        scale.style.overflow = 'hidden'

        const page = document.createElement('div')
        page.className = 'print-sheet-page'
        page.style.padding = `${marginPx}px`

        const body = document.createElement('div')
        body.className = 'markdown-body print-content'
        body.style.fontSize = `${settings.textSizePt}pt`
        for (const it of group) body.appendChild(it.el.cloneNode(true))
        page.appendChild(body)

        if (settings.pageNumbers) {
          const foot = document.createElement('div')
          foot.className = 'print-sheet-foot'
          foot.textContent = `Page ${pageIdx + 1} of ${groups.length}`
          foot.style.bottom = `${Math.max(2, marginPx * 0.5 - 6)}px`
          page.appendChild(foot)
        }

        scale.appendChild(page)
        sheet.appendChild(scale)
        stack.appendChild(sheet)
      })

      if (countRef.current) {
        countRef.current.textContent =
          groups.length === 1 ? '1 page' : `${groups.length} pages`
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [open, note, settings, paperW, paperH, marginPx, contentW, contentH, zoomMode, tick])

  if (!note) return null

  const ptLabel = `${settings.textSizePt % 1 === 0 ? settings.textSizePt : settings.textSizePt.toFixed(1)} pt`

  const handlePrint = () => {
    setPrinting(true)
    requestAnimationFrame(() => {
      try {
        window.print()
      } catch {
        // some embedded environments block window.print — ignore
      }
      setPrinting(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="flex-row items-start justify-between space-y-0 border-b px-6 py-4">
          <div className="space-y-1">
            <DialogTitle>Print note</DialogTitle>
            <DialogDescription>
              {subject ? `${subject.name} · ` : ''}
              {chapter ? `${chapter.name} · ` : ''}“{note.title || 'Untitled note'}” — the preview
              matches the printed page.
            </DialogDescription>
          </div>
          <ToggleGroup
            type="single"
            value={zoomMode}
            onValueChange={(v) => v && setZoomMode(v as ZoomMode)}
            variant="outline"
            size="sm"
            className="mt-1"
          >
            <ToggleGroupItem value="fit">Fit</ToggleGroupItem>
            <ToggleGroupItem value="75">75%</ToggleGroupItem>
            <ToggleGroupItem value="100">100%</ToggleGroupItem>
          </ToggleGroup>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Settings column */}
          <div className="max-h-[42dvh] w-full shrink-0 space-y-6 overflow-y-auto border-b px-6 py-5 md:max-h-none md:w-[310px] md:border-b-0 md:border-r">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Paper
              </h3>
              <div className="space-y-2">
                <Label className="text-xs">Size</Label>
                <Select value={settings.paper} onValueChange={(v) => update({ paper: v as PaperId })}>
                  <SelectTrigger className="h-9 w-full" aria-label="Paper size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPERS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label} · {p.wMm}×{p.hMm} mm
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Orientation</Label>
                <ToggleGroup
                  type="single"
                  value={settings.orientation}
                  onValueChange={(v) => v && update({ orientation: v as 'portrait' | 'landscape' })}
                  variant="outline"
                  className="flex w-full"
                >
                  <ToggleGroupItem value="portrait" className="flex-1">
                    Portrait
                  </ToggleGroupItem>
                  <ToggleGroupItem value="landscape" className="flex-1">
                    Landscape
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Layout
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Margins</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {settings.marginMm} mm
                  </span>
                </div>
                <Slider
                  value={[settings.marginMm]}
                  min={0}
                  max={40}
                  step={1}
                  onValueChange={(v) => update({ marginMm: v[0] ?? 18 })}
                  aria-label="Page margins"
                />
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Text size</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">{ptLabel}</span>
                </div>
                <Slider
                  value={[settings.textSizePt]}
                  min={9}
                  max={16}
                  step={0.5}
                  onValueChange={(v) => update({ textSizePt: v[0] ?? 12 })}
                  aria-label="Text size"
                />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Colour
              </h3>
              <ToggleGroup
                type="single"
                value={settings.colorMode}
                onValueChange={(v) => v && update({ colorMode: v as 'color' | 'bw' })}
                variant="outline"
                className="flex w-full"
              >
                <ToggleGroupItem value="color" className="flex-1">
                  Full colour
                </ToggleGroupItem>
                <ToggleGroupItem value="bw" className="flex-1">
                  Black &amp; white
                </ToggleGroupItem>
              </ToggleGroup>
            </section>

            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Options
              </h3>
              <SwitchRow
                label="Print backgrounds"
                hint="Backgrounds of code blocks, quotes and tables"
                checked={settings.backgrounds}
                onCheckedChange={(v) => update({ backgrounds: v })}
              />
              <SwitchRow
                label="Title block"
                hint="Title, subject · chapter and date on page 1"
                checked={settings.titleBlock}
                onCheckedChange={(v) => update({ titleBlock: v })}
              />
              <SwitchRow
                label="Page numbers"
                hint="“Page X of Y” centred in the footer"
                checked={settings.pageNumbers}
                onCheckedChange={(v) => update({ pageNumbers: v })}
              />
            </section>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-[11px] text-muted-foreground">Settings are saved in this browser</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs"
                onClick={reset}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>

          {/* Live page preview */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b px-4 py-2">
              <span
                ref={countRef}
                className="text-xs font-medium tabular-nums text-muted-foreground"
              >
                …
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                live preview — exactly what prints
              </span>
            </div>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-muted/50 p-4 md:p-6">
              {/* hidden measurement render at true page width */}
              <div
                ref={measureRef}
                aria-hidden
                className="print-measure"
                style={{ width: `${contentW}px` }}
              >
                <PrintBody note={note} subject={subject} chapter={chapter} settings={settings} />
              </div>
              {/* visible paginated sheets */}
              <div
                ref={stackRef}
                className={cn(
                  settings.colorMode === 'bw' && 'print-bw',
                  !settings.backgrounds && 'print-no-bg',
                )}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="items-center gap-3 border-t px-6 py-4">
          <p className="mr-auto hidden text-xs text-muted-foreground lg:block">
            Tip — choose “Save as PDF” as the destination to get a PDF.
          </p>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint} disabled={printing} className="gap-1.5">
              <Printer className="h-4 w-4" />
              {printing ? 'Preparing…' : 'Print'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60">
      <span className="space-y-0.5">
        <span className="block text-xs font-medium leading-none">{label}</span>
        <span className="block text-[11px] leading-snug text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
    </label>
  )
}
