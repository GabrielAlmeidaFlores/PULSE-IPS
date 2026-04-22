"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Bold,
  Italic,
  UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Undo,
  Redo,
  RemoveFormatting,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  maxHeight?: number
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 transition-colors disabled:opacity-30 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      style={{ borderRadius: 0 }}
    >
      {children}
    </button>
  )
}

function ToolbarDivider(): React.ReactElement {
  return <div className="w-px h-5 bg-border mx-0.5 self-center" />
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 320, maxHeight }: RichTextEditorProps): React.ReactElement {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {},
        orderedList: {},
        blockquote: false,
        code: false,
        codeBlock: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder ?? "Escreva o conteúdo aqui...",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: value,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
    immediatelyRender: false,
  })

  if (!editor) return <div className="border border-border bg-input" style={{ minHeight, borderRadius: 0 }} />

  return (
    <div className="border border-border bg-input flex flex-col" style={{ borderRadius: 0 }}>
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-card">
        <ToolbarButton
          title="Negrito (Ctrl+B)"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Itálico (Ctrl+I)"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Sublinhado (Ctrl+U)"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title="Título 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Título 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Título 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title="Lista com marcadores"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Lista numerada"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title="Linha horizontal"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Remover formatação"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title="Desfazer (Ctrl+Z)"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Refazer (Ctrl+Y)"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto px-4 py-3 text-[13px] text-foreground prose-editor"
        style={{ minHeight, ...(maxHeight !== undefined ? { maxHeight, overflowY: "auto" } : {}) }}
      />
    </div>
  )
}
