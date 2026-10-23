'use client'

import { useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useNotepadStore } from '@/lib/notepad/store'
import { NameDialog } from './name-dialog'

interface SidebarProps {
  onOpenChapter?: () => void
}

export function Sidebar({ onOpenChapter }: SidebarProps) {
  const subjects = useNotepadStore((s) => s.subjects)
  const chapters = useNotepadStore((s) => s.chapters)
  const notes = useNotepadStore((s) => s.notes)
  const selectedChapterId = useNotepadStore((s) => s.selectedChapterId)
  const { addSubject, renameSubject, deleteSubject, addChapter, renameChapter, deleteChapter, selectChapter } =
    useNotepadStore()

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [subjectDialog, setSubjectDialog] = useState<
    { mode: 'create' } | { mode: 'edit'; id: string; name: string; color: string } | null
  >(null)
  const [chapterDialog, setChapterDialog] = useState<
    { mode: 'create'; subjectId: string } | { mode: 'edit'; id: string; name: string } | null
  >(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'subject' | 'chapter'; id: string; name: string } | null>(
    null,
  )

  const chaptersBySubject = useMemo(() => {
    const map = new Map<string, typeof chapters>()
    for (const c of chapters) {
      const list = map.get(c.subjectId) ?? []
      list.push(c)
      map.set(c.subjectId, list)
    }
    return map
  }, [chapters])

  const noteCount = (chapterId: string) => notes.filter((n) => n.chapterId === chapterId).length

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleChapterClick = (chapterId: string) => {
    selectChapter(chapterId)
    onOpenChapter?.()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Subjects
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="New subject"
          onClick={() => setSubjectDialog({ mode: 'create' })}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">New subject</span>
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Subjects and chapters">
        {subjects.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No subjects yet</p>
            <Button size="sm" variant="outline" onClick={() => setSubjectDialog({ mode: 'create' })}>
              <Plus className="h-4 w-4" /> Add subject
            </Button>
          </div>
        )}

        <ul className="space-y-0.5">
          {subjects.map((subject) => {
            const subjectChapters = chaptersBySubject.get(subject.id) ?? []
            const isCollapsed = collapsed.has(subject.id)
            const subjectNoteCount = subjectChapters.reduce((acc, c) => acc + noteCount(c.id), 0)
            return (
              <li key={subject.id}>
                <div
                  className={cn(
                    'group flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors hover:bg-accent',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleCollapse(subject.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    aria-expanded={!isCollapsed}
                  >
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                        !isCollapsed && 'rotate-90',
                      )}
                    />
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: subject.color }}
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium">{subject.name}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
                      {subjectNoteCount}
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Subject options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem onClick={() => setChapterDialog({ mode: 'create', subjectId: subject.id })}>
                        <FolderPlus className="h-4 w-4" /> New chapter
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setSubjectDialog({ mode: 'edit', id: subject.id, name: subject.name, color: subject.color })
                        }
                      >
                        <Pencil className="h-4 w-4" /> Rename / colour
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget({ type: 'subject', id: subject.id, name: subject.name })}
                      >
                        <Trash2 className="h-4 w-4" /> Delete subject
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {!isCollapsed && subjectChapters.length > 0 && (
                  <ul className="ml-4 border-l border-border/70 pl-1 pt-0.5">
                    {subjectChapters.map((chapter) => {
                      const active = chapter.id === selectedChapterId
                      return (
                        <li key={chapter.id} className="group/ch relative">
                          <button
                            type="button"
                            onClick={() => handleChapterClick(chapter.id)}
                            className={cn(
                              'flex w-full min-w-0 items-center gap-1 rounded-md px-2 py-1.5 text-left transition-colors',
                              active
                                ? 'bg-accent font-medium text-accent-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                          >
                            <span className="truncate text-sm">{chapter.name}</span>
                            <span className="ml-auto shrink-0 text-[11px] tabular-nums opacity-60">
                              {noteCount(chapter.id)}
                            </span>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 opacity-0 transition-opacity group-hover/ch:opacity-100 data-[state=open]:opacity-100"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                                <span className="sr-only">Chapter options</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40">
                              <DropdownMenuItem
                                onClick={() => setChapterDialog({ mode: 'edit', id: chapter.id, name: chapter.name })}
                              >
                                <Pencil className="h-4 w-4" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget({ type: 'chapter', id: chapter.id, name: chapter.name })}
                              >
                                <Trash2 className="h-4 w-4" /> Delete chapter
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t p-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => setSubjectDialog({ mode: 'create' })}
        >
          <Plus className="h-4 w-4" /> New subject
        </Button>
      </div>

      {/* Subject create / rename */}
      {subjectDialog && (
        <NameDialog
          onOpenChange={() => setSubjectDialog(null)}
          title={subjectDialog.mode === 'edit' ? 'Rename subject' : 'New subject'}
          label="Subject name"
          submitLabel={subjectDialog.mode === 'edit' ? 'Save' : 'Create'}
          showColor
          initialName={subjectDialog.mode === 'edit' ? subjectDialog.name : ''}
          initialColor={subjectDialog.mode === 'edit' ? subjectDialog.color : undefined}
          onSubmit={(name, color) => {
            if (subjectDialog.mode === 'edit') renameSubject(subjectDialog.id, name, color)
            else addSubject(name, color)
          }}
        />
      )}

      {/* Chapter create / rename */}
      {chapterDialog && (
        <NameDialog
          onOpenChange={() => setChapterDialog(null)}
          title={chapterDialog.mode === 'edit' ? 'Rename chapter' : 'New chapter'}
          label="Chapter name"
          submitLabel={chapterDialog.mode === 'edit' ? 'Save' : 'Create'}
          initialName={chapterDialog.mode === 'edit' ? chapterDialog.name : ''}
          onSubmit={(name) => {
            if (chapterDialog.mode === 'edit') renameChapter(chapterDialog.id, name)
            else if (chapterDialog.mode === 'create') addChapter(chapterDialog.subjectId, name)
          }}
        />
      )}

      {/* Delete confirmations */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === 'subject' ? 'subject' : 'chapter'} “{deleteTarget?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'subject'
                ? 'All of its chapters and notes will be deleted too. This cannot be undone.'
                : 'All notes inside this chapter will be deleted too. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return
                if (deleteTarget.type === 'subject') deleteSubject(deleteTarget.id)
                else deleteChapter(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
