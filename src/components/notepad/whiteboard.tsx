'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Brush,
  Check,
  Eraser,
  ImagePlus,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { processDataUrl } from '@/lib/notepad/image'

/** fixed backing-store resolution — enough for crisp printing, any display size */
const CANVAS_W = 1600
const CANVAS_H = 1000

const BRUSH_COLORS = [
  '#1f2937', // ink
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // yellow-ochre
  '#16a34a', // green
  '#2563eb', // blue
  '#7c3aed', // violet
  '#db2777', // pink
] as const

interface WhiteboardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** called with the compressed PNG/JPEG of the drawing */
  onInsert: (dataUrl: string) => void
  /** optional image to pre-load (annotation flow) */
  initialImage?: string | null
}

/**
 * Freehand whiteboard: multi-colour brushes, adjustable width, eraser,
 * single-step undo, image import — insert the result into the note as an
 * image block.
 */
export function Whiteboard({ open, onOpenChange, onInsert, initialImage }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const [color, setColor] = useState<string>(BRUSH_COLORS[0])
  const [width, setWidth] = useState(6)
  const [erasing, setErasing] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [inserting, setInserting] = useState(false)

  // mutable drawing state (kept out of React to avoid re-renders mid-stroke)
  const drawingRef = useRef(false)
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)
  const undoSnapRef = useRef<string | null>(null)

  // ----- canvas setup / reset whenever the board opens -----
  // Radix mounts the portal content one commit after `open` flips, so retry
  // on animation frames until the canvas element is actually attached.
  useEffect(() => {
    if (!open) return
    let raf = 0
    let frames = 0
    const tryInit = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        if (frames++ < 30) raf = requestAnimationFrame(tryInit)
        return
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      undoSnapRef.current = null

      if (initialImage) {
        const img = new Image()
        img.onload = () => drawContain(ctx, img)
        img.src = initialImage
      }
    }
    tryInit()
    return () => cancelAnimationFrame(raf)
  }, [open, initialImage])

  // ----- helpers -----

  const snapshot = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    undoSnapRef.current = canvas.toDataURL('image/png')
    setCanUndo(true)
  }

  const restoreSnapshot = () => {
    const snap = undoSnapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!snap || !canvas || !ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.drawImage(img, 0, 0)
    }
    img.src = snap
    undoSnapRef.current = null
    setCanUndo(false) // single-step undo — the snapshot is spent
  }

  const canvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    }
  }

  const strokeStyle = () => (erasing ? '#ffffff' : color)

  // ----- drawing -----

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    snapshot() // remember the pre-stroke state for the one-step undo
    drawingRef.current = true
    const pt = canvasPoint(e)
    lastPtRef.current = pt
    // a plain click should leave a dot
    ctx.strokeStyle = strokeStyle()
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pt.x, pt.y)
    ctx.lineTo(pt.x + 0.01, pt.y + 0.01)
    ctx.stroke()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const last = lastPtRef.current
    if (!ctx || !last) return
    const pt = canvasPoint(e)
    ctx.strokeStyle = strokeStyle()
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    lastPtRef.current = pt
  }

  const handlePointerUp = () => {
    drawingRef.current = false
    lastPtRef.current = null
  }

  // ----- toolbar actions -----

  const clearBoard = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    snapshot()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  }

  const handleImportFile = (file: File) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      snapshot()
      drawContain(ctx, img)
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const handleInsert = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setInserting(true)
    void processDataUrl(canvas.toDataURL('image/png'))
      .then(({ dataUrl }) => {
        onInsert(dataUrl)
        setInserting(false)
      })
      .catch(() => setInserting(false))
  }

  // ----- render -----

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88dvh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b px-5 py-3">
          <div className="space-y-0.5">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Brush className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Whiteboard
            </DialogTitle>
            <DialogDescription>
              Draw, then insert it into your note as an image.
              {initialImage ? ' Annotate the loaded image and insert the result.' : ''}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5"
              onClick={() => importInputRef.current?.click()}
              title="Place an image on the board to annotate it"
            >
              <ImagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5"
              onClick={clearBoard}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Tools */}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted/30 px-5 py-2"
          role="toolbar"
          aria-label="Whiteboard tools"
        >
          <div className="flex items-center gap-1">
            {BRUSH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Brush colour ${c}`}
                aria-pressed={color === c && !erasing}
                onClick={() => {
                  setColor(c)
                  setErasing(false)
                }}
                className={cn(
                  'h-6 w-6 rounded-full border border-black/10 shadow-sm transition-transform',
                  color === c && !erasing
                    ? 'scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background'
                    : 'hover:scale-105',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            {/* custom colour */}
            <label
              className="relative ml-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-foreground/60"
              title="Custom colour"
            >
              <span
                className="absolute inset-[3px] rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value)
                  setErasing(false)
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Custom brush colour"
              />
            </label>
          </div>

          <div className="flex min-w-[150px] items-center gap-2">
            <span
              className="rounded-full"
              style={{
                backgroundColor: erasing ? '#ffffff' : color,
                width: `${Math.max(5, Math.min(18, width / 2))}px`,
                height: `${Math.max(5, Math.min(18, width / 2))}px`,
                boxShadow: erasing ? 'inset 0 0 0 1px #d1d5db' : undefined,
              }}
              aria-hidden
            />
            <Slider
              value={[width]}
              min={2}
              max={40}
              step={1}
              onValueChange={(v) => setWidth(v[0] ?? 6)}
              className="flex-1"
              aria-label="Brush width"
            />
            <span className="w-7 text-right text-xs tabular-nums text-muted-foreground">
              {width}px
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant={erasing ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-1.5 px-2.5"
              onClick={() => setErasing((v) => !v)}
              aria-pressed={erasing}
              title="Eraser (draws in white)"
            >
              <Eraser className="h-4 w-4" />
              <span className="hidden sm:inline">Eraser</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5"
              onClick={restoreSnapshot}
              disabled={!canUndo}
              title="Undo the last change"
            >
              <Undo2 className="h-4 w-4" />
              <span className="hidden sm:inline">Undo</span>
            </Button>
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground md:flex">
              <RotateCcw className="h-3 w-3" aria-hidden /> one step
            </span>
          </div>
        </div>

        {/* Drawing surface */}
        <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-muted/50 p-3">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="whiteboard-canvas max-h-full max-w-full rounded-md shadow-sm"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Whiteboard drawing area"
          />
        </div>

        <DialogFooter className="border-t px-5 py-3">
          <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
            Tip — draw diagrams, label structures, or import a picture and annotate it.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsert} disabled={inserting} className="gap-1.5">
              <Check className="h-4 w-4" />
              {inserting ? 'Preparing…' : 'Insert into note'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <input
        ref={importInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) handleImportFile(file)
        }}
        aria-label="Import an image onto the whiteboard"
      />
    </Dialog>
  )
}

/** draw an image centred, scaled to fit inside the board (contain) */
function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.min(CANVAS_W / img.naturalWidth, CANVAS_H / img.naturalHeight, 1)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h)
}
