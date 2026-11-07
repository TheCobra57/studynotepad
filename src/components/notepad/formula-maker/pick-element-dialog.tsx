'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CATEGORY_META, type ChemElement } from '@/lib/notepad/formula/elements'
import { cn } from '@/lib/utils'

interface PickElementDialogProps {
  /** the element awaiting its optional n/q fields — null closes the dialog */
  element: ChemElement | null
  onClose: () => void
  /** confirmed with trimmed values — either may be empty (placeholder stays) */
  onConfirm: (symbol: string, count: string, charge: string) => void
}

/**
 * Small popup shown when an element tile or list row is tapped. Collects the
 * two values that normally live in the tiny dashed placeholders on the
 * workspace chip — the subscript count (n) and the ionic charge (q) — via a
 * real form, which is far easier to hit on a phone. Both fields are optional:
 * leaving one empty keeps that placeholder on the inserted token.
 */
export function PickElementDialog({ element, onClose, onConfirm }: PickElementDialogProps) {
  const [count, setCount] = useState('')
  const [charge, setCharge] = useState('')

  // fresh, empty fields on every pick
  useEffect(() => {
    if (element) {
      setCount('')
      setCharge('')
    }
  }, [element])

  const submit = () => {
    if (!element) return
    onConfirm(element.symbol, count.trim(), charge.trim())
    onClose()
  }

  return (
    <Dialog open={!!element} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-72 gap-3 rounded-xl p-4 sm:max-w-72">
        {element && (
          <>
            <div className="flex items-center gap-3 pr-7">
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold',
                  CATEGORY_META[element.category].tile,
                )}
                aria-hidden="true"
              >
                {element.symbol}
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate text-base font-bold leading-tight">
                  {element.name}
                </DialogTitle>
                <DialogDescription className="text-[11px] leading-tight">
                  Element #{element.number} — both fields optional
                </DialogDescription>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="pick-element-count"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Valency (n)
                </label>
                <Input
                  id="pick-element-count"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  placeholder="e.g. 2  (the small subscript)"
                  inputMode="numeric"
                  autoFocus
                  className="h-9"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="pick-element-charge"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Ionic charge (q)
                </label>
                <Input
                  id="pick-element-charge"
                  value={charge}
                  onChange={(e) => setCharge(e.target.value)}
                  placeholder="e.g. 2-  or  +"
                  className="h-9"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-9">
                  Add to formula
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
