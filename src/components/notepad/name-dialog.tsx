'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { SUBJECT_COLORS } from '@/lib/notepad/constants'

interface NameDialogProps {
  /** Called when the dialog is dismissed or closed */
  onOpenChange: () => void
  title: string
  label: string
  initialName?: string
  initialColor?: string
  showColor?: boolean
  submitLabel?: string
  onSubmit: (name: string, color: string) => void
}

/**
 * Rendered conditionally by the parent (mounted fresh per use),
 * so initial values come straight from props — no state-sync effects.
 */
export function NameDialog({
  onOpenChange,
  title,
  label,
  initialName = '',
  initialColor = SUBJECT_COLORS[0].value,
  showColor = false,
  submitLabel = 'Save',
  onSubmit,
}: NameDialogProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed, color)
    onOpenChange()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onOpenChange()}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name-dialog-input">{label}</Label>
            <Input
              id="name-dialog-input"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={showColor ? 'e.g. Chemistry' : 'e.g. Organic Chemistry'}
              maxLength={60}
            />
          </div>
          {showColor && (
            <div className="space-y-2">
              <Label>Colour</Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={`Colour ${c.name}`}
                    title={c.name}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      color === c.value ? 'scale-110 border-foreground' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
