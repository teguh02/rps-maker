import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export interface RTEProps {
  content: string
  onUpdate: (html: string) => void
  placeholder?: string
}

export function RTE({ content, onUpdate, placeholder }: RTEProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || placeholder || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (html) {
        onUpdate(html)
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-screen p-4',
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className="prose prose-sm max-w-none rounded-lg bg-white border focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-screen">
      <EditorContent editor={editor} />
    </div>
  )
}