"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import "./rich-text-editor.css";

export interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "Enter content...",
  className = "",
  minHeight = "150px",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert prose-sm max-w-none focus:outline-none",
          "min-h-[150px] px-3 py-2 text-zinc-100",
        ),
        style: "font-family: KaiTi, 'STKaiti', '楷体', '楷体GB_2312', Calibri, sans-serif;",
      },
    },
  });

  // Update editor content when value changes from outside
  React.useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className={cn("space-y-1.5", className)}>
        {label && (
          <label className="block text-sm font-medium text-zinc-300">
            {label}
          </label>
        )}
        <div
          className="w-full rounded-[8px] border border-white/10 bg-zinc-900 px-3 py-2"
          style={{ minHeight }}
        />
      </div>
    );
  }

  const MenuBar = () => {
    return (
      <div className="flex flex-wrap gap-1 rounded-t-[8px] border border-white/10 border-b-0 bg-zinc-800/50 px-2 py-1.5">
        {/* Text Style */}
        <div className="flex gap-1 border-r border-white/10 pr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium transition-colors",
              editor.isActive("bold")
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
            )}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "rounded px-2 py-1 text-xs italic transition-colors",
              editor.isActive("italic")
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
            )}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              "rounded px-2 py-1 text-xs line-through transition-colors",
              editor.isActive("strike")
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
            )}
          >
            S
          </button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r border-white/10 pr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              "rounded px-2 py-1 text-xs font-bold transition-colors",
              editor.isActive("heading", { level: 1 })
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
            )}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "rounded px-2 py-1 text-xs font-bold transition-colors",
              editor.isActive("heading", { level: 2 })
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
            )}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(
              "rounded px-2 py-1 text-xs font-bold transition-colors",
              editor.isActive("heading", { level: 3 })
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
            )}
          >
            H3
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-white/10 pr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              "rounded px-2 py-1 text-xs transition-colors",
              editor.isActive("bulletList")
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
            )}
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              "rounded px-2 py-1 text-xs transition-colors",
              editor.isActive("orderedList")
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
            )}
          >
            1. List
          </button>
        </div>

        {/* Alignment & Cleanup */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={cn(
              "rounded px-2 py-1 text-xs transition-colors",
              editor.isActive("paragraph")
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
            )}
          >
            ¶
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            className="rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
          >
            Clear
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      <div
        className="RichTextEditor rounded-[8px] border border-white/10 bg-zinc-900/70 focus-within:ring-2 focus-within:ring-blue-500/60 focus-within:border-blue-500/60"
      >
        <MenuBar />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
