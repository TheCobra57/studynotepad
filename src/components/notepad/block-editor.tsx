'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  ListTree,
  PenTool,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  autoResize,
  createBlock,
  isChemBlock,
  isMergeable,
  isTextual,
  newBlockId,
  parseMarkdownToBlocks,
  serializeBlocks,
  type Block,
  type BlockType,
} from '@/lib/notepad/blocks'
import { filterCommands, type ImageAction, type SlashCommand } from './snippets'
import { SlashMenu } from './slash-menu'
import { InlineMarkdown, Latex, MarkdownPreview } from './markdown-preview'
import { processImageFile } from '@/lib/notepad/image'

// ---------------------------------------------------------------------------

export interface BlockEditorHandle {
  /** turn the active (or last) block into a different type */
  transformActive: (type: BlockType) => void
  /** insert a rendered equation block and open its LaTeX editor */
  insertMathBlock: (tex?: string, caretFromEnd?: number) => void
  /** insert `$tex$` at the caret of the active text block, or fall back to an equation block */
  insertInlineOrBlock: (tex: string) => void
  /** wrap the current textarea selection with markers — returns false when no text block is active */
  wrapSelection: (prefix: string, suffix: string, placeholder: string) => boolean
  /** insert one image (data URL) at the pending/active position */
  insertImage: (src: string) => void
  /** insert several images (data URLs) in order */
  insertImages: (srcs: string[]) => void
  /** swap the src of an existing image block (whiteboard annotation flow) */
  replaceImage: (blockId: string, src: string) => void
  /** focus the last block for quick typing */
  focusEnd: () => void
}

interface BlockEditorProps {
  noteId: string
  content: string
  onChange: (markdown: string) => void
  /** image flows that need app-level UI: file picker / clipboard read / whiteboard */
  onImageAction?: (kind: ImageAction) => void
  /** open the whiteboard pre-loaded with this image (annotation) */
  onAnnotateImage?: (blockId: string, src: string) => void
}

interface SlashState {
  id: string
  start: number
  query: string
  index: number
  flip: boolean
}

const TYPO: Partial<Record<BlockType, string>> = {
  p: 'text-[15px] leading-7',
  h1: 'text-[26px] font-bold leading-[2.25rem] tracking-tight md:text-[28px] md:leading-[2.4rem]',
  h2: 'text-[21px] font-semibold leading-[1.85rem] tracking-tight md:text-[22px]',
  h3: 'text-[17px] font-semibold leading-7 tracking-tight',
  bullet: 'text-[15px] leading-7',
  numbered: 'text-[15px] leading-7',
  todo: 'text-[15px] leading-7',
  quote: 'text-[15px] leading-7',
}

const SPACING: Record<BlockType, string> = {
  p: 'pt-[3px] pb-[3px]',
  h1: 'pt-6 pb-1',
  h2: 'pt-5 pb-1',
  h3: 'pt-4 pb-[2px]',
  bullet: 'pt-[3px] pb-[3px]',
  numbered: 'pt-[3px] pb-[3px]',
  todo: 'pt-[3px] pb-[3px]',
  quote: 'pt-1.5 pb-1.5',
  code: 'pt-1.5 pb-1.5',
  divider: 'pt-2.5 pb-2.5',
  math: 'pt-1.5 pb-1.5',
  table: 'pt-1.5 pb-1.5',
  image: 'pt-1.5 pb-1.5',
  toc: 'pt-1.5 pb-1.5',
}

const LABELS: Partial<Record<BlockType, string>> = {
  p: 'paragraph',
  h1: 'heading 1',
  h2: 'heading 2',
  h3: 'heading 3',
  bullet: 'list item',
  numbered: 'numbered item',
  todo: 'to-do item',
  quote: 'quote',
  code: 'code block',
  math: 'equation',
  table: 'table',
  image: 'image',
  toc: 'table of contents',
}

function blockSpacing(type: BlockType, isFirst: boolean): string {
  const s = SPACING[type]
  return isFirst ? s.replace(/pt-\[[^\]]+\]|pt-[0-9.]+/, 'pt-0') : s
}

// ---------------------------------------------------------------------------

/**
 * Notion-style WYSIWYG block editor.
 *
 * Every block is rendered (headings, styled lists, live KaTeX equations…).
 * Clicking a block swaps that single block into an in-place editor, so raw
 * markdown/LaTeX is only ever visible for the block you are editing.
 * Typing "/" opens the quick-insert command menu.
 */
export const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
  function BlockEditor({ noteId, content, onChange, onImageAction, onAnnotateImage }, ref) {
    const [blocks, setBlocks] = useState<Block[]>(() => parseMarkdownToBlocks(content))
    const [activeId, setActiveId] = useState<string | null>(null)
    const [slash, setSlash] = useState<SlashState | null>(null)
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [dropIndex, setDropIndex] = useState<number | null>(null)
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
    const [imgResize, setImgResize] = useState<{ id: string; w: number } | null>(null)
    const [fileDragOver, setFileDragOver] = useState(false)
    /** heading block briefly highlighted after a ToC link jump */
    const [flashId, setFlashId] = useState<string | null>(null)

    const taRefs = useRef(new Map<string, HTMLTextAreaElement>())
    const blocksRef = useRef(blocks)
    const serializedRef = useRef(serializeBlocks(blocks))
    const activeIdRef = useRef<string | null>(null)
    const slashRef = useRef<SlashState | null>(null)
    const onChangeRef = useRef(onChange)
    const debounceRef = useRef<number | undefined>(undefined)
    const blurTimerRef = useRef<number | undefined>(undefined)
    const pendingImageRef = useRef<{ replaceId?: string; afterId?: string } | null>(null)
    const onImageActionRef = useRef(onImageAction)
    const onAnnotateImageRef = useRef(onAnnotateImage)
    const flashTimerRef = useRef<number | undefined>(undefined)

    // keep refs in sync after every render (lint-safe: no writes during render)
    useEffect(() => {
      blocksRef.current = blocks
      activeIdRef.current = activeId
      slashRef.current = slash
      onChangeRef.current = onChange
      onImageActionRef.current = onImageAction
      onAnnotateImageRef.current = onAnnotateImage
    })

    // ------------------------------------------------------------------
    // persistence — debounced markdown sync + flush on unmount / leave
    // ------------------------------------------------------------------

    const commit = (next: Block[]) => {
      blocksRef.current = next
      setBlocks(next)
      const md = serializeBlocks(next)
      serializedRef.current = md
      if (debounceRef.current !== undefined) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = undefined
        onChangeRef.current(md)
      }, 600)
    }

    const flush = () => {
      if (debounceRef.current === undefined) return
      window.clearTimeout(debounceRef.current)
      debounceRef.current = undefined
      onChangeRef.current(serializeBlocks(blocksRef.current))
    }

    useEffect(() => {
      const onLeave = () => flush()
      window.addEventListener('beforeunload', onLeave)
      return () => {
        window.removeEventListener('beforeunload', onLeave)
        flush()
      }
    }, [])

    // external content change while the same note stays open (e.g. import)
    useEffect(() => {
      if (content === serializedRef.current) return
      const t = window.setTimeout(() => {
        if (activeIdRef.current) return // never clobber an in-progress edit
        if (onChangeRef.current === undefined) return
        const parsed = parseMarkdownToBlocks(content)
        serializedRef.current = serializeBlocks(parsed)
        blocksRef.current = parsed
        setBlocks(parsed)
        setActiveId(null)
        setSlash(null)
      }, 0)
      return () => window.clearTimeout(t)
    }, [content, noteId])

    // click away from the editor (and outside the toolbar/menus) → stop editing
    useEffect(() => {
      if (!activeId) return
      const onPointerDown = (e: PointerEvent) => {
        const t = e.target as HTMLElement | null
        if (!t) return
        if (
          t.closest(
            '[data-block-editor], [role="toolbar"], [role="menu"], [data-radix-popper-content-wrapper]',
          )
        ) {
          return
        }
        setActiveId(null)
        setSlash(null)
      }
      document.addEventListener('pointerdown', onPointerDown)
      return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [activeId])

    // clicking anything that is not the selected image (or its toolbar) deselects it
    useEffect(() => {
      if (!selectedImageId) return
      const onPointerDown = (e: PointerEvent) => {
        const t = e.target as HTMLElement | null
        if (!t) return
        if (t.closest('[data-image-ui]')) return
        setSelectedImageId(null)
      }
      document.addEventListener('pointerdown', onPointerDown)
      return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [selectedImageId])

    useEffect(
      () => () => {
        if (blurTimerRef.current !== undefined) window.clearTimeout(blurTimerRef.current)
        if (flashTimerRef.current !== undefined) window.clearTimeout(flashTimerRef.current)
      },
      [],
    )

    // ------------------------------------------------------------------
    // focus helpers
    // ------------------------------------------------------------------

    const focusBlock = (
      id: string,
      caret: 'start' | 'end' | number = 'end',
      selEnd?: number,
    ) => {
      requestAnimationFrame(() => {
        const ta = taRefs.current.get(id)
        if (!ta) return
        ta.focus()
        const len = ta.value.length
        let pos: number
        if (caret === 'start') pos = 0
        else if (caret === 'end') pos = len
        else pos = caret < 0 ? Math.max(0, len + caret) : Math.min(caret, len)
        ta.setSelectionRange(pos, selEnd !== undefined ? Math.min(selEnd, len) : pos)
        autoResize(ta)
      })
    }

    const registerTa = (id: string) => (el: HTMLTextAreaElement | null) => {
      if (el) {
        taRefs.current.set(id, el)
        autoResize(el)
      } else {
        taRefs.current.delete(id)
      }
    }

    const cancelBlurDeactivate = () => {
      if (blurTimerRef.current !== undefined) {
        window.clearTimeout(blurTimerRef.current)
        blurTimerRef.current = undefined
      }
    }

    const handleFocus = (id: string) => {
      cancelBlurDeactivate()
      setActiveId(id)
    }

    const handleBlurDeactivate = (id: string, relatedTarget: EventTarget | null) => {
      cancelBlurDeactivate()
      // Keep the block "active" when focus moves to the formatting toolbar or a
      // menu — the toolbar needs to act on the block the user was just editing.
      const rt = relatedTarget as HTMLElement | null
      if (rt && rt.closest('[role="toolbar"], [role="menu"]')) return
      blurTimerRef.current = window.setTimeout(() => {
        blurTimerRef.current = undefined
        setActiveId((cur) => (cur === id ? null : cur))
        setSlash((cur) => (cur && cur.id === id ? null : cur))
      }, 140)
    }

    const activate = (id: string, caret: 'start' | 'end' | number = 'end') => {
      cancelBlurDeactivate()
      setActiveId(id)
      focusBlock(id, caret)
    }

    // ------------------------------------------------------------------
    // block operations
    // ------------------------------------------------------------------

    const setBlockText = (id: string, text: string) => {
      commit(blocksRef.current.map((b) => (b.id === id ? { ...b, text } : b)))
    }

    const transformBlock = (id: string, type: BlockType, text?: string) => {
      commit(
        blocksRef.current.map((b) => {
          if (b.id !== id) return b
          const next: Block = { ...b, type, text: text !== undefined ? text : b.text }
          if (type === 'todo' && next.checked === undefined) next.checked = false
          if (type === 'code' && next.lang === undefined) next.lang = ''
          if (type !== 'todo') delete next.checked
          if (type !== 'code') delete next.lang
          if (type !== 'image') {
            delete next.src
            delete next.width
          }
          return next
        }),
      )
    }

    const insertBlockAfter = (id: string | null, block: Block) => {
      const arr = [...blocksRef.current]
      const idx = id ? arr.findIndex((b) => b.id === id) : arr.length - 1
      const at = idx === -1 ? arr.length : idx + 1
      arr.splice(at, 0, block)
      commit(arr)
      return block
    }

    const removeBlock = (id: string) => {
      const arr = blocksRef.current.filter((b) => b.id !== id)
      if (arr.length === 0) arr.push(createBlock('p'))
      commit(arr)
    }

    // keyboard: Escape deselects, Delete/Backspace removes the selected image
    useEffect(() => {
      if (!selectedImageId) return
      const onKeyDown = (e: KeyboardEvent) => {
        const ae = document.activeElement
        const typing =
          ae instanceof HTMLElement &&
          (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || ae.isContentEditable)
        if (typing) return
        if (e.key === 'Escape') {
          setSelectedImageId(null)
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          removeBlock(selectedImageId)
          setSelectedImageId(null)
        }
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }, [selectedImageId])

    const toggleTodo = (id: string) => {
      commit(blocksRef.current.map((b) => (b.id === id ? { ...b, checked: !b.checked } : b)))
    }

    const moveBlockBy = (idx: number, delta: number) => {
      const to = idx + delta
      if (to < 0 || to >= blocksRef.current.length) return
      const arr = [...blocksRef.current]
      const [moved] = arr.splice(idx, 1)
      arr.splice(to, 0, moved)
      commit(arr)
    }

    const duplicateBlock = (idx: number) => {
      const arr = [...blocksRef.current]
      const copy: Block = { ...arr[idx], id: newBlockId() }
      arr.splice(idx + 1, 0, copy)
      commit(arr)
    }

    const insertAtCaret = (id: string, text: string) => {
      const ta = taRefs.current.get(id)
      if (!ta) return
      const s = ta.selectionStart ?? ta.value.length
      const e = ta.selectionEnd ?? s
      const next = ta.value.slice(0, s) + text + ta.value.slice(e)
      setBlockText(id, next)
      focusBlock(id, s + text.length)
    }

    const setBlockImageWidth = (id: string, width: number) => {
      commit(blocksRef.current.map((b) => (b.id === id ? { ...b, width } : b)))
    }

    /**
     * Place processed images into the document. Honours a pending anchor set
     * by a slash command (replace the empty "…/image" paragraph, or insert
     * after the block that typed it); otherwise replaces an empty active
     * paragraph or inserts after the active block / at the end.
     */
    const insertImagesInternal = (srcs: string[]) => {
      if (!srcs.length) return
      const arr = [...blocksRef.current]
      let replaceId = pendingImageRef.current?.replaceId
      const afterPending = pendingImageRef.current?.afterId
      pendingImageRef.current = null

      if (!replaceId) {
        const active = activeIdRef.current
          ? arr.find((b) => b.id === activeIdRef.current)
          : null
        if (active && active.type === 'p' && active.text.trim() === '') {
          replaceId = active.id
        }
      }

      const mkImage = (src: string): Block => ({
        id: newBlockId(),
        type: 'image',
        text: '',
        src,
        width: 100,
      })

      let first: Block
      if (replaceId) {
        const i = arr.findIndex((b) => b.id === replaceId)
        if (i >= 0) {
          first = mkImage(srcs[0])
          arr[i] = first
          let at = i + 1
          for (const s of srcs.slice(1)) arr.splice(at++, 0, mkImage(s))
          commit(arr)
          setActiveId(null)
          setSlash(null)
          setSelectedImageId(first.id)
          return
        }
      }
      const anchorId = afterPending ?? activeIdRef.current
      let idx = anchorId ? arr.findIndex((b) => b.id === anchorId) : -1
      if (idx === -1) idx = arr.length - 1
      first = mkImage(srcs[0])
      arr.splice(idx + 1, 0, first)
      let at = idx + 2
      for (const s of srcs.slice(1)) arr.splice(at++, 0, mkImage(s))
      commit(arr)
      setActiveId(null)
      setSlash(null)
      setSelectedImageId(first.id)
    }

    /** compress image files and drop them in as image blocks */
    const insertImageFiles = async (files: File[]) => {
      const srcs: string[] = []
      for (const f of files) {
        try {
          srcs.push((await processImageFile(f)).dataUrl)
        } catch {
          // unreadable file — skip it
        }
      }
      if (srcs.length) insertImagesInternal(srcs)
    }

    const numberAt = (idx: number) => {
      let n = 1
      for (let i = idx - 1; i >= 0 && blocks[i].type === 'numbered'; i--) n++
      return n
    }

    // ------------------------------------------------------------------
    // table of contents block
    // ------------------------------------------------------------------

    /** live heading list — H1–H3 blocks, in document order */
    const tocEntries = useMemo(
      () =>
        blocks
          .filter((b) => b.type === 'h1' || b.type === 'h2' || b.type === 'h3')
          .map((b) => ({
            id: b.id,
            level: (b.type === 'h1' ? 1 : b.type === 'h2' ? 2 : 3) as 1 | 2 | 3,
            text: b.text,
          })),
      [blocks],
    )

    /** jump to a heading block: smooth-scroll it into view and flash it */
    const scrollToBlock = (id: string) => {
      const el = document.querySelector(`[data-block-id="${id}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlashId(id)
      if (flashTimerRef.current !== undefined) window.clearTimeout(flashTimerRef.current)
      flashTimerRef.current = window.setTimeout(() => {
        flashTimerRef.current = undefined
        setFlashId(null)
      }, 1800)
    }

    /** presentational ToC block — entries are clickable, content auto-updates */
    const renderToc = (): ReactNode => (
      <div className="toc-card group/toc relative overflow-hidden rounded-lg border bg-muted/20">
        <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3.5 py-2">
          <ListTree className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Contents
          </span>
          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/70">
            {tocEntries.length} heading{tocEntries.length === 1 ? '' : 's'}
          </span>
        </div>
        {tocEntries.length === 0 ? (
          <p className="px-3.5 py-3 text-[13px] leading-6 text-muted-foreground">
            No headings yet — add H1, H2 or H3 headings and they will show up here
            automatically.
          </p>
        ) : (
          <nav aria-label="Table of contents" className="max-h-72 overflow-y-auto px-2 py-1.5">
            <ul>
              {tocEntries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => scrollToBlock(e.id)}
                    title={`Jump to “${e.text.replace(/[*$`]/g, '')}”`}
                    className={cn(
                      'flex w-full items-baseline gap-1.5 rounded-md px-1.5 py-1 text-left text-[13px] leading-6 text-foreground/80 transition-colors hover:bg-accent hover:text-foreground',
                      e.level === 2 && 'pl-5',
                      e.level === 3 && 'pl-8',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'shrink-0 text-muted-foreground/50',
                        e.level === 1 && 'font-bold text-foreground/70',
                      )}
                    >
                      {e.level === 1 ? '§' : e.level === 2 ? '–' : '·'}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate',
                        e.level === 1 && 'font-semibold',
                      )}
                    >
                      <InlineMarkdown text={e.text || 'Untitled heading'} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <span className="pointer-events-none absolute bottom-1.5 right-2.5 text-[10px] text-muted-foreground/0 transition-colors group-hover/toc:text-muted-foreground/60">
          updates automatically
        </span>
      </div>
    )

    const prevTextual = (idx: number): Block | null => {
      for (let i = idx - 1; i >= 0; i--) {
        if (isTextual(blocks[i].type)) return blocks[i]
      }
      return null
    }

    const nextTextual = (idx: number): Block | null => {
      for (let i = idx + 1; i < blocks.length; i++) {
        if (isTextual(blocks[i].type)) return blocks[i]
      }
      return null
    }

    // ------------------------------------------------------------------
    // slash command menu
    // ------------------------------------------------------------------

    const slashQuery = slash?.query ?? ''
    const slashCommands = useMemo(() => filterCommands(slashQuery), [slashQuery])

    const handleTextChange = (block: Block, e: { target: HTMLTextAreaElement }) => {
      const value = e.target.value
      setBlockText(block.id, value)
      autoResize(e.target)
      if (isTextual(block.type)) {
        const caret = e.target.selectionStart ?? value.length
        const m = value.slice(0, caret).match(/(?:^|\s)\/([\w-]*)$/)
        if (m) {
          const query = m[1].toLowerCase()
          const rect = e.target.getBoundingClientRect()
          const flip = rect.bottom + 340 > window.innerHeight
          setSlash((prev) => ({
            id: block.id,
            start: caret - m[1].length - 1,
            query,
            index: prev && prev.query === query ? prev.index : 0,
            flip,
          }))
          return
        }
      }
      setSlash(null)
    }

    const applyCommand = (cmd: SlashCommand) => {
      const current = slashRef.current
      const targetId =
        current?.id ?? activeIdRef.current ?? blocksRef.current[blocksRef.current.length - 1]?.id
      if (!targetId) return
      const target = blocksRef.current.find((b) => b.id === targetId)
      if (!target) return

      // strip the typed "/query" that opened the menu
      let stripped = target.text
      if (current && current.id === targetId) {
        const ta = taRefs.current.get(targetId)
        const caret = ta ? (ta.selectionStart ?? target.text.length) : target.text.length
        stripped = target.text.slice(0, current.start) + target.text.slice(caret)
      }
      setSlash(null)

      // ---- inline insertions stay inside the current text block ----
      if (cmd.inline) {
        const at = current ? current.start : stripped.length
        const next = stripped.slice(0, at) + cmd.inline + stripped.slice(at)
        setBlockText(targetId, next)
        cancelBlurDeactivate()
        setActiveId(targetId)
        focusBlock(targetId, at + cmd.inline.length)
        return
      }

      // ---- image flows are orchestrated by the editor pane ----
      if (cmd.imageAction) {
        if (stripped !== target.text) setBlockText(targetId, stripped)
        // an empty paragraph that only served as the "/" trigger is replaced
        // by the incoming image; otherwise the image lands right below
        if (target.type === 'p' && stripped.trim() === '') {
          pendingImageRef.current = { replaceId: targetId }
        } else {
          pendingImageRef.current = { afterId: targetId }
        }
        setActiveId(null)
        onImageActionRef.current?.(cmd.imageAction)
        return
      }

      if (!cmd.blockType) return
      const type = cmd.blockType

      // ---- divider: never replaces text, inserts a line ----
      if (type === 'divider') {
        if (stripped.trim() === '' && target.type === 'p') {
          const idx = blocksRef.current.findIndex((b) => b.id === targetId)
          const arr = [...blocksRef.current]
          arr[idx] = createBlock('divider')
          const fresh = createBlock('p')
          arr.splice(idx + 1, 0, fresh)
          commit(arr)
          activate(fresh.id, 'start')
        } else {
          if (stripped !== target.text) setBlockText(targetId, stripped)
          insertBlockAfter(targetId, createBlock('divider'))
          activate(targetId, 'end')
        }
        return
      }

      // ---- table of contents: same flow as the divider (block + fresh line) ----
      if (type === 'toc') {
        if (stripped.trim() === '' && target.type === 'p') {
          const idx = blocksRef.current.findIndex((b) => b.id === targetId)
          const arr = [...blocksRef.current]
          arr[idx] = createBlock('toc')
          const fresh = createBlock('p')
          arr.splice(idx + 1, 0, fresh)
          commit(arr)
          activate(fresh.id, 'start')
        } else {
          if (stripped !== target.text) setBlockText(targetId, stripped)
          insertBlockAfter(targetId, createBlock('toc'))
          activate(targetId, 'end')
        }
        return
      }

      // ---- transform the empty paragraph in place, else insert below ----
      if (target.type === 'p' && stripped.trim() === '') {
        transformBlock(targetId, type, cmd.blockText ?? '')
        cancelBlurDeactivate()
        setActiveId(targetId)
        focusBlock(targetId, cmd.caretFromEnd ?? (cmd.blockText ? 'end' : 'start'))
        return
      }

      if (stripped !== target.text) setBlockText(targetId, stripped)
      const nb = insertBlockAfter(targetId, createBlock(type, cmd.blockText ?? ''))
      cancelBlurDeactivate()
      setActiveId(nb.id)
      focusBlock(nb.id, cmd.caretFromEnd ?? (cmd.blockText ? 'end' : 'start'))
    }

    const openInsertMenu = (id: string) => {
      cancelBlurDeactivate()
      setActiveId(id)
      focusBlock(id, 'end')
      setSlash((prev) => ({ id, start: 0, query: '', index: 0, flip: prev?.flip ?? false }))
    }

    const handlePlusClick = (id: string) => {
      const target = blocksRef.current.find((b) => b.id === id)
      if (!target) return
      if (target.type === 'p' && target.text.trim() === '') {
        openInsertMenu(id)
        return
      }
      const nb = insertBlockAfter(id, createBlock('p'))
      openInsertMenu(nb.id)
    }

    // ------------------------------------------------------------------
    // keyboard behaviour for text blocks
    // ------------------------------------------------------------------

    const wrapSelection = (prefix: string, suffix: string, placeholder: string): boolean => {
      const id = activeIdRef.current
      if (!id) return false
      const block = blocksRef.current.find((b) => b.id === id)
      if (!block || (!isTextual(block.type) && block.type !== 'table')) return false
      const ta = taRefs.current.get(id)
      if (!ta) return false
      const start = ta.selectionStart ?? ta.value.length
      const end = ta.selectionEnd ?? start
      const inner = ta.value.slice(start, end) || placeholder
      const next = ta.value.slice(0, start) + prefix + inner + suffix + ta.value.slice(end)
      setBlockText(id, next)
      focusBlock(id, start + prefix.length, start + prefix.length + inner.length)
      return true
    }

    const handleTextKeyDown = (
      e: ReactKeyboardEvent<HTMLTextAreaElement>,
      block: Block,
      idx: number,
    ) => {
      const ta = e.currentTarget
      const { selectionStart: s, selectionEnd: en, value } = ta

      // slash menu navigation
      if (slash && slash.id === block.id && slashCommands.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSlash((p) => (p ? { ...p, index: (p.index + 1) % slashCommands.length } : p))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSlash((p) =>
            p ? { ...p, index: (p.index - 1 + slashCommands.length) % slashCommands.length } : p,
          )
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          const item = slashCommands[slash.index]
          if (item) applyCommand(item)
          else setSlash(null)
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setSlash(null)
          return
        }
      }

      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        wrapSelection('**', '**', 'bold text')
        return
      }
      if (mod && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        wrapSelection('*', '*', 'italic text')
        return
      }
      if (mod && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        wrapSelection('`', '`', 'code')
        return
      }
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        if (block.type === 'todo') toggleTodo(block.id)
        else {
          setActiveId(null)
          ta.blur()
        }
        return
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        // empty list/quote block → back to plain paragraph (Notion behaviour)
        if (block.type !== 'p' && value.trim() === '') {
          transformBlock(block.id, 'p', '')
          return
        }
        const before = value.slice(0, s)
        const after = value.slice(en)
        const nextType: BlockType =
          block.type === 'bullet' || block.type === 'numbered' || block.type === 'todo'
            ? block.type
            : 'p'
        const nb = createBlock(nextType, after)
        const arr = [...blocksRef.current]
        const i = arr.findIndex((b) => b.id === block.id)
        arr[i] = { ...arr[i], text: before }
        arr.splice(i + 1, 0, nb)
        commit(arr)
        cancelBlurDeactivate()
        setActiveId(nb.id)
        focusBlock(nb.id, 'start')
        return
      }

      if (e.key === 'Backspace' && s === en && s === 0) {
        if (block.type !== 'p' && value === '') {
          e.preventDefault()
          transformBlock(block.id, 'p', '')
          return
        }
        if (value === '') {
          e.preventDefault()
          const prev = idx > 0 ? blocksRef.current[idx - 1] : null
          removeBlock(block.id)
          if (prev && isTextual(prev.type)) activate(prev.id, 'end')
          return
        }
        if (idx > 0) {
          const prev = blocksRef.current[idx - 1]
          if (prev.type === 'divider') {
            e.preventDefault()
            removeBlock(prev.id)
            return
          }
          if (isMergeable(prev.type)) {
            e.preventDefault()
            const joinAt = prev.text.length
            const arr = [...blocksRef.current]
            arr[idx - 1] = { ...prev, text: prev.text + value }
            arr.splice(idx, 1)
            commit(arr)
            cancelBlurDeactivate()
            setActiveId(prev.id)
            focusBlock(prev.id, joinAt)
            return
          }
        }
        return
      }

      if (e.key === 'ArrowUp' && s === en) {
        const singleLine = ta.scrollHeight - ta.clientHeight < 4
        if (s === 0 || singleLine) {
          const prev = prevTextual(idx)
          if (prev) {
            e.preventDefault()
            activate(prev.id, 'end')
          }
        }
        return
      }
      if (e.key === 'ArrowDown' && s === en) {
        const singleLine = ta.scrollHeight - ta.clientHeight < 4
        if (s === value.length || singleLine) {
          const nxt = nextTextual(idx)
          if (nxt) {
            e.preventDefault()
            activate(nxt.id, 'start')
          }
        }
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const nxt = nextTextual(idx)
        if (nxt) activate(nxt.id, 'start')
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlash(null)
        setActiveId(null)
        ta.blur()
      }
    }

    // ------------------------------------------------------------------
    // drag & drop reorder
    // ------------------------------------------------------------------

    const handleDragStart = (e: React.DragEvent, idx: number) => {
      setDragIndex(idx)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(idx))
    }

    const handleDragEnd = () => {
      setDragIndex(null)
      setDropIndex(null)
    }

    const handleRowDragOver = (e: React.DragEvent, idx: number) => {
      if (dragIndex === null) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const rect = e.currentTarget.getBoundingClientRect()
      setDropIndex(e.clientY < rect.top + rect.height / 2 ? idx : idx + 1)
    }

    const handleRowDrop = (e: React.DragEvent) => {
      e.preventDefault()
      if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
        const arr = [...blocksRef.current]
        const [moved] = arr.splice(dragIndex, 1)
        arr.splice(dropIndex > dragIndex ? dropIndex - 1 : dropIndex, 0, moved)
        commit(arr)
      }
      setDragIndex(null)
      setDropIndex(null)
    }

    // ------------------------------------------------------------------
    // imperative API for the toolbar
    // ------------------------------------------------------------------

    useImperativeHandle(
      ref,
      () => ({
        transformActive: (type: BlockType) => {
          const id = activeIdRef.current
          if (id) {
            const b = blocksRef.current.find((x) => x.id === id)
            if (b) {
              if (type === 'divider') {
                const idx = blocksRef.current.findIndex((x) => x.id === id)
                const arr = [...blocksRef.current]
                arr.splice(idx + 1, 0, createBlock('divider'))
                commit(arr)
                return
              }
              transformBlock(id, type)
              if (isTextual(type) || type === 'code' || type === 'table') {
                cancelBlurDeactivate()
                setActiveId(id)
                focusBlock(id, 'end')
              }
              return
            }
          }
          const arr = blocksRef.current
          const last = arr[arr.length - 1]
          if (type === 'divider') {
            commit([...arr, createBlock('divider')])
            return
          }
          if (last && last.type === 'p' && last.text.trim() === '') {
            transformBlock(last.id, type)
            if (isTextual(type) || type === 'code' || type === 'table') {
              activate(last.id, 'end')
            }
          } else {
            const nb = createBlock(type)
            commit([...arr, nb])
            if (isTextual(type) || type === 'code' || type === 'table') {
              activate(nb.id, 'start')
            }
          }
        },
        insertMathBlock: (tex?: string, caretFromEnd?: number) => {
          const id = activeIdRef.current
          const active = id ? blocksRef.current.find((b) => b.id === id) : undefined
          const caret = caretFromEnd ?? (tex ? 'end' : 'start')
          if (active && active.type === 'p' && active.text.trim() === '') {
            transformBlock(active.id, 'math', tex ?? '')
            activate(active.id, caret)
            return
          }
          const nb = createBlock('math', tex ?? '')
          if (id) insertBlockAfter(id, nb)
          else commit([...blocksRef.current, nb])
          activate(nb.id, caret)
        },
        insertInlineOrBlock: (tex: string) => {
          const id = activeIdRef.current
          const active = id ? blocksRef.current.find((b) => b.id === id) : undefined
          if (active && isTextual(active.type)) {
            const ta = taRefs.current.get(active.id)
            const pos = ta ? (ta.selectionStart ?? active.text.length) : active.text.length
            const ins = `$${tex}$`
            const next = active.text.slice(0, pos) + ins + active.text.slice(pos)
            setBlockText(active.id, next)
            cancelBlurDeactivate()
            setActiveId(active.id)
            focusBlock(active.id, pos + ins.length)
            return
          }
          // no text block active — insert as a rendered equation block instead
          const nb = createBlock('math', tex)
          if (id) insertBlockAfter(id, nb)
          else commit([...blocksRef.current, nb])
          activate(nb.id, 'end')
        },
        wrapSelection,
        insertImage: (src: string) => {
          insertImagesInternal([src])
        },
        insertImages: (srcs: string[]) => {
          insertImagesInternal(srcs)
        },
        replaceImage: (blockId: string, src: string) => {
          const exists = blocksRef.current.some((b) => b.id === blockId)
          if (!exists) {
            insertImagesInternal([src])
            return
          }
          commit(
            blocksRef.current.map((b) => (b.id === blockId ? { ...b, src } : b)),
          )
          setActiveId(null)
          setSelectedImageId(blockId)
        },
        focusEnd: () => {
          const last = blocksRef.current[blocksRef.current.length - 1]
          if (!last) return
          if (
            isTextual(last.type) ||
            last.type === 'math' ||
            last.type === 'code' ||
            last.type === 'table'
          ) {
            activate(last.id, 'end')
          }
        },
      }),
      [],
    )

    // ------------------------------------------------------------------
    // rendering
    // ------------------------------------------------------------------

    const renderTextEditing = (block: Block, idx: number): ReactNode => {
      const placeholder =
        block.type === 'h1'
          ? 'Heading 1'
          : block.type === 'h2'
            ? 'Heading 2'
            : block.type === 'h3'
              ? 'Heading 3'
              : block.type === 'quote'
                ? 'Quote'
                : block.type === 'p'
                  ? "Type '/' for commands — or just write"
                  : 'List item'

      const ta = (
        <textarea
          ref={registerTa(block.id)}
          value={block.text}
          rows={1}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => handleTextChange(block, e)}
          onKeyDown={(e) => handleTextKeyDown(e, block, idx)}
          onFocus={() => handleFocus(block.id)}
          onBlur={(e) => handleBlurDeactivate(block.id, e.relatedTarget)}
          className={cn(
            'w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/50',
            TYPO[block.type] ?? 'text-[15px] leading-7',
            block.type === 'todo' && block.checked && 'text-muted-foreground line-through',
          )}
        />
      )

      switch (block.type) {
        case 'bullet':
          return (
            <div className="flex items-start gap-2.5">
              <span
                className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/70"
                aria-hidden
              />
              <div className="min-w-0 flex-1">{ta}</div>
            </div>
          )
        case 'numbered':
          return (
            <div className="flex items-start gap-2">
              <span className="w-4 shrink-0 text-right text-[15px] leading-7 tabular-nums text-muted-foreground">
                {numberAt(idx)}.
              </span>
              <div className="min-w-0 flex-1">{ta}</div>
            </div>
          )
        case 'todo':
          return (
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={!!block.checked}
                onCheckedChange={() => toggleTodo(block.id)}
                className="mt-1"
                aria-label={block.checked ? 'Mark as not done' : 'Mark as done'}
              />
              <div className="min-w-0 flex-1">{ta}</div>
            </div>
          )
        case 'quote':
          return (
            <div className="rounded-r-md border-l-[3px] border-emerald-600/50 bg-muted/40 py-1 pl-3.5 pr-2">
              {ta}
            </div>
          )
        default:
          return ta
      }
    }

    const renderTextRendered = (block: Block, idx: number): ReactNode => {
      const onlyEmptyParagraph =
        block.type === 'p' && blocks.length === 1 && block.text.trim() === ''
      const content = block.text ? (
        <InlineMarkdown text={block.text} />
      ) : onlyEmptyParagraph ? (
        <span className="text-muted-foreground/60">
          Type <span className="font-semibold">/</span> for commands — or just start writing. Try{' '}
          <span className="font-semibold">/chem</span> for equations.
        </span>
      ) : (
        <span aria-hidden>&nbsp;</span>
      )

      const interactive = {
        onClick: () => activate(block.id),
        tabIndex: 0,
        role: 'button' as const,
        'aria-label': `Edit ${LABELS[block.type] ?? 'block'}`,
        onKeyDown: (e: ReactKeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            activate(block.id)
          }
        },
      }

      switch (block.type) {
        case 'h1':
          return (
            <h1
              {...interactive}
              className="cursor-text text-[26px] font-bold leading-[2.25rem] tracking-tight outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring md:text-[28px] md:leading-[2.4rem]"
            >
              {content}
            </h1>
          )
        case 'h2':
          return (
            <h2
              {...interactive}
              className="cursor-text text-[21px] font-semibold leading-[1.85rem] tracking-tight outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring md:text-[22px]"
            >
              {content}
            </h2>
          )
        case 'h3':
          return (
            <h3
              {...interactive}
              className="cursor-text text-[17px] font-semibold leading-7 tracking-tight outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
            >
              {content}
            </h3>
          )
        case 'bullet':
          return (
            <div {...interactive} className="flex cursor-text items-start gap-2.5 outline-none">
              <span
                className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/70"
                aria-hidden
              />
              <div className="min-w-0 flex-1 text-[15px] leading-7">{content}</div>
            </div>
          )
        case 'numbered':
          return (
            <div {...interactive} className="flex cursor-text items-start gap-2 outline-none">
              <span className="w-4 shrink-0 text-right text-[15px] leading-7 tabular-nums text-muted-foreground">
                {numberAt(idx)}.
              </span>
              <div className="min-w-0 flex-1 text-[15px] leading-7">{content}</div>
            </div>
          )
        case 'todo':
          return (
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={!!block.checked}
                onCheckedChange={() => toggleTodo(block.id)}
                className="mt-1"
                aria-label={block.checked ? 'Mark as not done' : 'Mark as done'}
              />
              <div
                {...interactive}
                className={cn(
                  'min-w-0 flex-1 cursor-text text-[15px] leading-7 outline-none',
                  block.checked && 'text-muted-foreground line-through',
                )}
              >
                {content}
              </div>
            </div>
          )
        case 'quote':
          return (
            <div
              {...interactive}
              className="cursor-text rounded-r-md border-l-[3px] border-emerald-600/50 bg-muted/40 py-1 pl-3.5 pr-2 text-[15px] leading-7 outline-none"
            >
              {content}
            </div>
          )
        default:
          return (
            <div
              {...interactive}
              className="min-h-[28px] cursor-text text-[15px] leading-7 outline-none"
            >
              {content}
            </div>
          )
      }
    }

    const renderMath = (block: Block, editing: boolean): ReactNode => {
      const isChem = isChemBlock(block.text)
      if (editing) {
        return (
          <div className="rounded-lg border bg-muted/30 p-3 shadow-sm">
            <textarea
              ref={registerTa(block.id)}
              value={block.text}
              rows={1}
              spellCheck={false}
              placeholder={
                isChem
                  ? '\\ce{2H2 + O2 -> 2H2O}'
                  : 'E = mc^2   ·   chemistry: \\ce{2H2 + O2 -> 2H2O}'
              }
              onChange={(e) => {
                setBlockText(block.id, e.target.value)
                autoResize(e.currentTarget)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  setActiveId(null)
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  setActiveId(null)
                }
              }}
              onFocus={() => handleFocus(block.id)}
              onBlur={(e) => handleBlurDeactivate(block.id, e.relatedTarget)}
              className="w-full resize-none bg-transparent font-mono text-[13px] leading-6 outline-none placeholder:text-muted-foreground/50"
            />
            <div className="block-math mt-2 min-h-[52px] overflow-x-auto rounded-md border bg-background px-3 py-2 text-center">
              {block.text.trim() ? (
                <Latex tex={block.text} display />
              ) : (
                <span className="text-xs italic text-muted-foreground">
                  Live preview — type LaTeX above
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>
                LaTeX · chemistry wraps in{' '}
                <code className="rounded bg-muted px-1 py-0.5">{'\\ce{…}'}</code> · Enter to save
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto h-6 px-2.5 text-[11px]"
                onClick={() => setActiveId(null)}
              >
                Done
              </Button>
            </div>
          </div>
        )
      }
      return (
        <div
          role="button"
          tabIndex={0}
          aria-label="Edit equation"
          onClick={() => activate(block.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              activate(block.id)
            }
          }}
          className="block-math group/math my-1 w-full cursor-pointer overflow-x-auto rounded-md px-2 py-2 text-center outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {block.text.trim() ? (
            <Latex tex={block.text} display />
          ) : (
            <span className="text-sm italic text-muted-foreground/70">
              Empty equation — click to edit
            </span>
          )}
          <span className="pointer-events-none block text-[10px] text-muted-foreground/0 transition-colors group-hover/math:text-muted-foreground/70">
            click to edit LaTeX
          </span>
        </div>
      )
    }

    const renderCode = (block: Block, editing: boolean): ReactNode => {
      if (editing) {
        return (
          <div className="overflow-hidden rounded-lg border">
            <input
              value={block.lang ?? ''}
              onChange={(e) =>
                commit(
                  blocksRef.current.map((b) =>
                    b.id === block.id ? { ...b, lang: e.target.value } : b,
                  ),
                )
              }
              placeholder="language (e.g. python) — optional"
              aria-label="Code language"
              className="w-full border-b bg-muted/50 px-3 py-1 font-mono text-[11px] outline-none placeholder:text-muted-foreground/50"
            />
            <textarea
              ref={registerTa(block.id)}
              value={block.text}
              rows={1}
              spellCheck={false}
              placeholder="Write code…"
              onChange={(e) => {
                setBlockText(block.id, e.target.value)
                autoResize(e.currentTarget)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setActiveId(null)
                } else if (e.key === 'Tab') {
                  e.preventDefault()
                  insertAtCaret(block.id, '  ')
                }
              }}
              onFocus={() => handleFocus(block.id)}
              onBlur={(e) => handleBlurDeactivate(block.id, e.relatedTarget)}
              className="w-full resize-none bg-muted/20 p-3 font-mono text-[13px] leading-6 outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        )
      }
      return (
        <div
          role="button"
          tabIndex={0}
          aria-label="Edit code block"
          onClick={() => activate(block.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              activate(block.id)
            }
          }}
          className="cursor-text overflow-hidden rounded-lg border bg-muted/40 outline-none hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {block.lang ? (
            <div className="border-b bg-muted px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {block.lang}
            </div>
          ) : null}
          <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-6">
            <code>{block.text || ' '}</code>
          </pre>
        </div>
      )
    }

    const renderTable = (block: Block, editing: boolean): ReactNode => {
      if (editing) {
        return (
          <div className="rounded-lg border bg-muted/30 p-3 shadow-sm">
            <textarea
              ref={registerTa(block.id)}
              value={block.text}
              rows={1}
              spellCheck={false}
              placeholder={'| Term | Meaning |\n|---|---|\n|  |  |'}
              onChange={(e) => {
                setBlockText(block.id, e.target.value)
                autoResize(e.currentTarget)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setActiveId(null)
                }
              }}
              onFocus={() => handleFocus(block.id)}
              onBlur={(e) => handleBlurDeactivate(block.id, e.relatedTarget)}
              className="w-full resize-none bg-transparent font-mono text-[12px] leading-5 outline-none placeholder:text-muted-foreground/50"
            />
            <div className="mt-2 overflow-x-auto rounded-md border bg-background p-2 [&_table]:my-0">
              <MarkdownPreview content={block.text} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Markdown table · live preview above · Esc to finish
            </p>
          </div>
        )
      }
      return (
        <div
          role="button"
          tabIndex={0}
          aria-label="Edit table"
          onClick={() => activate(block.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              activate(block.id)
            }
          }}
          className="block-math min-h-[44px] cursor-text overflow-x-auto rounded-md outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring [&_table]:my-0"
        >
          <MarkdownPreview content={block.text} />
        </div>
      )
    }

    // ------------------------------------------------------------------
    // image blocks — select, resize (handles + presets), drag to move
    // ------------------------------------------------------------------

    const startImageResize = (
      e: React.PointerEvent<HTMLElement>,
      block: Block,
      corner: 'nw' | 'ne' | 'sw' | 'se',
    ) => {
      e.preventDefault()
      e.stopPropagation()
      const handleEl = e.currentTarget
      const figure = handleEl.closest('figure')
      const baseW = figure?.getBoundingClientRect().width ?? 600
      const startX = e.clientX
      const startW = block.width ?? 100
      const dir = corner === 'ne' || corner === 'se' ? 1 : -1
      let finalW = startW
      setSelectedImageId(block.id)
      handleEl.setPointerCapture(e.pointerId)
      const onMove = (ev: PointerEvent) => {
        const pct = startW + ((ev.clientX - startX) / baseW) * 100 * dir
        finalW = Math.round(Math.min(100, Math.max(10, pct)))
        setImgResize({ id: block.id, w: finalW })
      }
      const finish = () => {
        handleEl.removeEventListener('pointermove', onMove)
        handleEl.removeEventListener('pointerup', finish)
        handleEl.removeEventListener('pointercancel', finish)
        setImgResize(null)
        setBlockImageWidth(block.id, finalW)
      }
      handleEl.addEventListener('pointermove', onMove)
      handleEl.addEventListener('pointerup', finish)
      handleEl.addEventListener('pointercancel', finish)
    }

    const renderImage = (block: Block, idx: number): ReactNode => {
      const selected = selectedImageId === block.id
      const w = imgResize?.id === block.id ? imgResize.w : (block.width ?? 100)
      return (
        <figure
          data-image-ui
          className="group/image relative"
          onPointerDown={() => {
            cancelBlurDeactivate()
            setSelectedImageId(block.id)
          }}
        >
          <img
            src={block.src}
            alt={block.text || 'Image'}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragEnd={handleDragEnd}
            style={{ width: `${w}%` }}
            className="block-img mx-auto cursor-grab select-none rounded-lg active:cursor-grabbing"
          />

          {selected && (
            <>
              {/* selection frame hugging the image */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 right-0 mx-auto rounded-lg ring-2 ring-primary"
                style={{ width: `${w}%` }}
              >
                {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                  <span
                    key={corner}
                    role="button"
                    tabIndex={0}
                    aria-label={`Resize image (${corner} corner)`}
                    onPointerDown={(e) => startImageResize(e, block, corner)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setBlockImageWidth(
                          block.id,
                          Math.min(100, Math.max(10, (block.width ?? 100) + (corner === 'nw' || corner === 'sw' ? -10 : 10))),
                        )
                      }
                    }}
                    className={cn(
                      'pointer-events-auto absolute h-3.5 w-3.5 rounded-sm border-2 border-primary bg-background shadow-sm',
                      corner === 'nw' && 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
                      corner === 'se' && 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
                      corner === 'ne' && 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
                      corner === 'sw' && 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
                    )}
                  />
                ))}
              </div>

              {/* floating size toolbar */}
              <div
                data-image-ui
                className="absolute -top-10 left-1/2 z-30 -translate-x-1/2"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBlockImageWidth(block.id, p)}
                      className={cn(
                        'h-7 rounded-md px-2 text-[11px] font-medium tabular-nums transition-colors',
                        Math.round(w) === p
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      )}
                    >
                      {p}%
                    </button>
                  ))}
                  <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
                  <button
                    type="button"
                    title="Annotate on the whiteboard"
                    aria-label="Annotate on the whiteboard"
                    onClick={() => onAnnotateImageRef.current?.(block.id, block.src ?? '')}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete image"
                    aria-label="Delete image"
                    onClick={() => {
                      setSelectedImageId(null)
                      removeBlock(block.id)
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* live size readout */}
              <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground">
                {Math.round(w)}% — drag a corner to resize, drag the image to move
              </span>
            </>
          )}
        </figure>
      )
    }

    // ------------------------------------------------------------------
    // paste & drop image handling
    // ------------------------------------------------------------------

    const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile()
          if (f) files.push(f)
        }
      }
      if (!files.length) return // normal text paste — let the browser handle it
      e.preventDefault()
      void insertImageFiles(files)
    }

    const handleFileDragOver = (e: React.DragEvent) => {
      const types = Array.from(e.dataTransfer?.types ?? [])
      if (!types.includes('Files')) return // internal block reorder
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setFileDragOver(true)
    }

    const handleFileDragLeave = (e: React.DragEvent) => {
      const related = e.relatedTarget as Node | null
      if (related && e.currentTarget.contains(related)) return
      setFileDragOver(false)
    }

    const handleFileDrop = (e: React.DragEvent) => {
      setFileDragOver(false)
      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (!files.length) return // not an image drop — let block reorder finish
      e.preventDefault()
      void insertImageFiles(files)
    }

    const renderBlock = (block: Block, idx: number): ReactNode => {
      const editing = activeId === block.id
      if (block.type === 'math') return renderMath(block, editing)
      if (block.type === 'code') return renderCode(block, editing)
      if (block.type === 'table') return renderTable(block, editing)
      if (block.type === 'image') return renderImage(block, idx)
      if (block.type === 'divider') return <hr className="border-border" />
      if (block.type === 'toc') return renderToc()
      return editing ? renderTextEditing(block, idx) : renderTextRendered(block, idx)
    }

    const handleAppendClick = () => {
      const arr = blocksRef.current
      const last = arr[arr.length - 1]
      if (last && isTextual(last.type) && last.text === '') {
        activate(last.id, 'end')
        return
      }
      const nb = createBlock('p')
      commit([...arr, nb])
      activate(nb.id, 'start')
    }

    return (
      <div
        className="relative min-h-full"
        aria-label="Note content"
        data-block-editor
        onPaste={handlePaste}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        {/* drop-to-insert overlay while dragging image files over the note */}
        {fileDragOver && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[1px]">
            <p className="rounded-lg bg-background/90 px-4 py-2 text-sm font-medium text-primary shadow">
              Drop images to add them to the note
            </p>
          </div>
        )}
        <div className="pb-2">
          {blocks.map((block, idx) => {
            const editing = activeId === block.id
            const gutterVisible = editing
            return (
              <div
                key={block.id}
                data-block-id={block.id}
                className={cn(
                  'group relative rounded-lg pl-11 transition-[background-color,box-shadow,opacity] duration-500 sm:pl-12',
                  dragIndex === idx && 'opacity-40',
                  // ToC jump target: brief highlight ring that fades out
                  flashId === block.id &&
                    'bg-primary/5 ring-2 ring-primary/60 ring-offset-2 ring-offset-background',
                )}
                onDragOver={(e) => handleRowDragOver(e, idx)}
                onDrop={(e) => handleRowDrop(e)}
              >
                {/* left gutter: insert + drag handle */}
                <div
                  className={cn(
                    'absolute left-0 top-0 flex items-start gap-0.5 pt-[5px] transition-opacity',
                    gutterVisible
                      ? 'opacity-100'
                      : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100',
                  )}
                >
                  <button
                    type="button"
                    title="Insert block below"
                    aria-label="Insert block below"
                    onClick={() => handlePlusClick(block.id)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        draggable
                        title="Drag to reorder — click for options"
                        aria-label="Block options"
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragEnd={handleDragEnd}
                        className="flex h-5 w-5 cursor-grab items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="bottom" className="w-44">
                      <DropdownMenuItem onClick={() => moveBlockBy(idx, -1)} disabled={idx === 0}>
                        <ArrowUp className="h-4 w-4" /> Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => moveBlockBy(idx, 1)}
                        disabled={idx === blocks.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" /> Move down
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateBlock(idx)}>
                        <Copy className="h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => removeBlock(block.id)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* drop indicator */}
                {dropIndex === idx && (
                  <div className="pointer-events-none absolute -top-px left-0 right-0 h-[2px] rounded-full bg-primary" />
                )}

                <div className={cn('relative min-w-0', blockSpacing(block.type, idx === 0))}>
                  {renderBlock(block, idx)}
                </div>

                {/* slash quick-insert menu anchored to this block */}
                {slash?.id === block.id && (
                  <SlashMenu
                    commands={slashCommands}
                    activeIndex={slash.index}
                    query={slash.query}
                    flip={slash.flip}
                    onSelect={applyCommand}
                    onHover={(i) => setSlash((p) => (p ? { ...p, index: i } : p))}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* click-to-append zone + final drop indicator */}
        <div className="relative min-h-[120px] cursor-text" onClick={handleAppendClick}>
          {dropIndex === blocks.length && (
            <div className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] rounded-full bg-primary" />
          )}
        </div>
      </div>
    )
  },
)
