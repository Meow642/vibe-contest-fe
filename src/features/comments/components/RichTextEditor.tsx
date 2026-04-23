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
import { Button } from "@/components/ui/button";
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
    <Button
      aria-label={label}
      className={cn(
        "size-8 rounded-xl border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
        active ? "bg-slate-950 text-white hover:bg-slate-950 hover:text-white" : "",
      )}
      disabled={disabled}
      size="icon-sm"
      type="button"
      variant="ghost"
      onClick={onClick}
    >
      {children}
    </Button>
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
          "min-h-[15rem] rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-[15px] leading-7 text-slate-800 outline-none [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-slate-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5",
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-1.5">
        <ToolbarButton
          active={state.bold}
          disabled={!editor?.can().chain().focus().toggleBold().run()}
          label="加粗"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <BoldIcon className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          active={state.italic}
          disabled={!editor?.can().chain().focus().toggleItalic().run()}
          label="斜体"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          active={state.underline}
          disabled={!editor?.can().chain().focus().toggleUnderline().run()}
          label="下划线"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          active={state.strike}
          disabled={!editor?.can().chain().focus().toggleStrike().run()}
          label="删除线"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <StrikethroughIcon className="size-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <ToolbarButton
          active={state.bulletList}
          label="无序列表"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListIcon className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          active={state.orderedList}
          label="有序列表"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrderedIcon className="size-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
