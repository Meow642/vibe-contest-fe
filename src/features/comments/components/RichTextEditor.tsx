import type { ReactNode } from "react";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  initialValue?: string;
  onChange: (html: string, plainText: string) => void;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}

const defaultToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  bulletList: false,
  orderedList: false,
};

function ToolbarButton({
  active = false,
  children,
  disabled = false,
  label,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors",
        active ? "text-[#000311]" : "text-slate-400",
        disabled ? "cursor-not-allowed opacity-40" : "hover:text-[#000311]",
      )}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  initialValue = "<p></p>",
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: "写下此刻最想说的话，支持基础富文本格式...",
      }),
    ],
    content: initialValue,
    editorProps: {
      attributes: {
        class:
          "h-full text-[15px] leading-7 text-[#000311] outline-none [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-slate-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML(), currentEditor.getText());
    },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      underline: currentEditor?.isActive("underline") ?? false,
      strike: currentEditor?.isActive("strike") ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
    }),
  }) ?? defaultToolbarState;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-3">
        <ToolbarButton
          active={state.bold}
          disabled={!editor?.can().chain().focus().toggleBold().run()}
          label="加粗"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <BoldIcon className="size-5" />
        </ToolbarButton>

        <ToolbarButton
          active={state.italic}
          disabled={!editor?.can().chain().focus().toggleItalic().run()}
          label="斜体"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className="size-5" />
        </ToolbarButton>

        <ToolbarButton
          active={state.underline}
          disabled={!editor?.can().chain().focus().toggleUnderline().run()}
          label="下划线"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-5" />
        </ToolbarButton>

        <ToolbarButton
          active={state.strike}
          disabled={!editor?.can().chain().focus().toggleStrike().run()}
          label="删除线"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <StrikethroughIcon className="size-5" />
        </ToolbarButton>

        <ToolbarButton
          active={state.bulletList}
          label="无序列表"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListIcon className="size-5" />
        </ToolbarButton>

        <ToolbarButton
          active={state.orderedList}
          label="有序列表"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrderedIcon className="size-5" />
        </ToolbarButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <EditorContent className="h-full" editor={editor} />
      </div>
    </div>
  );
}
