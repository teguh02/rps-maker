import type { Editor } from '@tiptap/react'

export interface EditorFormatSnapshot {
  active: boolean
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  bulletList: boolean
  orderedList: boolean
  align: string | null
  fontFamily: string | null
  fontSize: string | null
}

const initialSnapshot: EditorFormatSnapshot = {
  active: false,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  bulletList: false,
  orderedList: false,
  align: null,
  fontFamily: null,
  fontSize: null,
}

let activeEditor: Editor | null = null
let snapshot: EditorFormatSnapshot = { ...initialSnapshot }
const subscribers = new Set<() => void>()

function emit() {
  subscribers.forEach(fn => fn())
}

function refreshSnapshot() {
  if (!activeEditor) {
    snapshot = { ...initialSnapshot }
    emit()
    return
  }
  const textStyle = activeEditor.getAttributes('textStyle') as { fontFamily?: string; fontSize?: string } | undefined
  snapshot = {
    active: true,
    bold: activeEditor.isActive('bold'),
    italic: activeEditor.isActive('italic'),
    underline: activeEditor.isActive('underline'),
    strike: activeEditor.isActive('strike'),
    bulletList: activeEditor.isActive('bulletList'),
    orderedList: activeEditor.isActive('orderedList'),
    align: activeEditor.isActive({ textAlign: 'left' })
      ? 'left'
      : activeEditor.isActive({ textAlign: 'center' })
        ? 'center'
        : activeEditor.isActive({ textAlign: 'right' })
          ? 'right'
          : activeEditor.isActive({ textAlign: 'justify' })
            ? 'justify'
            : null,
    fontFamily: textStyle?.fontFamily ?? null,
    fontSize: textStyle?.fontSize ?? null,
  }
  emit()
}

export const editorRegistry = {
  getSnapshot: () => snapshot,
  subscribe(fn: () => void) {
    subscribers.add(fn)
    return () => {
      subscribers.delete(fn)
    }
  },
  setActive(editor: Editor) {
    if (activeEditor !== editor) {
      activeEditor = editor
      refreshSnapshot()
    } else {
      refreshSnapshot()
    }
  },
  handleBlur(editor: Editor) {
    // Delay clearing so clicks on ribbon controls (which blur the editor) keep it active.
    window.setTimeout(() => {
      const el = document.activeElement as HTMLElement | null
      if (el && (el.closest('.ribbon') || el.closest('.rte-root'))) return
      if (activeEditor === editor) {
        activeEditor = null
        refreshSnapshot()
      }
    }, 0)
  },
  clearFor(editor: Editor) {
    if (activeEditor === editor) {
      activeEditor = null
      refreshSnapshot()
    }
  },
  runCommand(command: string, value?: string) {
    const e = activeEditor
    if (!e) return
    const chain = e.chain().focus()
    switch (command) {
      case 'bold': chain.toggleBold(); break
      case 'italic': chain.toggleItalic(); break
      case 'underline': chain.toggleUnderline(); break
      case 'strike': chain.toggleStrike(); break
      case 'bulletList': chain.toggleBulletList(); break
      case 'orderedList': chain.toggleOrderedList(); break
      case 'align':
        if (value === 'left') chain.setTextAlign('left')
        else if (value === 'center') chain.setTextAlign('center')
        else if (value === 'right') chain.setTextAlign('right')
        else if (value === 'justify') chain.setTextAlign('justify')
        break
      case 'fontFamily':
        if (value) chain.setFontFamily(value)
        break
      case 'fontSize':
        if (value) chain.setFontSize(value)
        break
      case 'clearFormat':
        chain.clearNodes().unsetAllMarks()
        break
      default:
        return
    }
    chain.run()
    refreshSnapshot()
  },
}