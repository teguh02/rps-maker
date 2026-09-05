import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import { memo, useEffect, useMemo } from 'react'
import { FontSize } from '../services/fontSizeExtension'
import { editorRegistry } from '../services/editorRegistry'
import { logger } from '../utils/logger'

export interface RTEProps {
  content: string
  onUpdate: (html: string) => void
  placeholder?: string
  /** Compact mode for table cells / small inputs */
  compact?: boolean
}

function RTEInner({ content, onUpdate, placeholder, compact }: RTEProps) {
  const extensions = useMemo(() => {
    const placeholderExt = Placeholder.configure({ placeholder: placeholder || 'Ketik teks di sini...' })
    if (compact) {
      return [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
        }),
        Underline,
        TextStyle,
        FontFamily,
        FontSize,
        TextAlign.configure({ types: ['paragraph'] }),
        placeholderExt,
      ]
    }
    return [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      placeholderExt,
    ]
  }, [placeholder, compact])

  const editor = useEditor({
    extensions,
    content: content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onUpdate(html)
    },
    editorProps: {
      attributes: {
        class: compact
          ? 'prose prose-sm max-w-none focus:outline-none min-h-[38px] p-1 text-xs'
          : 'prose prose-sm max-w-none focus:outline-none min-h-screen p-4',
      },
      // Block inline image pasting/dropping — WYSIWYG is text formatting only.
      handlePaste: (view, event) => {
        const types = event.clipboardData?.types || []
        const hasFiles = types.includes('Files') || types.includes('application/x-msdownload')
        const hasImage = Array.from(event.clipboardData?.items || []).some(item => item.type.startsWith('image/'))
        if (hasFiles || hasImage) {
          return true
        }
        return false
      },
      handleDrop: (view, event) => {
        const hasFiles = (event.dataTransfer?.types || []).includes('Files')
        if (hasFiles) {
          return true
        }
        return false
      },
    },
  })

  // Register editor focus state with the global registry so the ribbon can format it.
  useEffect(() => {
    if (!editor) return
    const onFocus = () => {
      logger.debug('RTE', 'rte.focus', { compact })
      editorRegistry.setActive(editor)
    }
    const onBlur = () => editorRegistry.handleBlur(editor)
    const onTransaction = () => {
      if (editorRegistry.getSnapshot().active) {
        editorRegistry.setActive(editor)
      }
    }
    editor.on('focus', onFocus)
    editor.on('blur', onBlur)
    editor.on('transaction', onTransaction)
    return () => {
      editor.off('focus', onFocus)
      editor.off('blur', onBlur)
      editor.off('transaction', onTransaction)
      editorRegistry.clearFor(editor)
    }
  }, [editor, compact])

  // Sync editor content when prop changes (e.g. after AI generate / undo / redo)
  useEffect(() => {
    if (editor && content !== undefined) {
      const current = editor.getHTML()
      if (current !== content) {
        editor.commands.setContent(content || '', { emitUpdate: false })
      }
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={`rte-root ${compact ? 'rte-compact' : ''}`}>
      <EditorContent editor={editor} />
    </div>
  )
}

// Custom comparator: only re-render when the actual content/placeholder/compact change.
// (onUpdate closures are recreated every render by callers, so identity can't be used.)
function rtePropsEqual(prev: RTEProps, next: RTEProps): boolean {
  return prev.content === next.content && prev.placeholder === next.placeholder && prev.compact === next.compact
}

export const RTE = memo(RTEInner, rtePropsEqual)