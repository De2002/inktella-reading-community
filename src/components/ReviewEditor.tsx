import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function ReviewEditor({ initial, onChange }: { initial: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false } as any),
      Link.configure({ openOnClick: false, autolink: true, protocols: ["http", "https"] }),
    ],
    content: initial,
    editorProps: { attributes: { class: "prose-ink" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && initial && editor.isEmpty) editor.commands.setContent(initial);
  }, [editor, initial]);

  if (!editor) return <div className="min-h-[320px]" />;

  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground", active && "bg-muted text-foreground")}
    >
      {icon}
    </button>
  );

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-1 flex flex-wrap gap-0.5 border-b bg-background/95 py-1.5 backdrop-blur">
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-4 w-4" />, "Heading")}
        {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-4 w-4" />, "Subheading")}
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-4 w-4" />, "Bold")}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-4 w-4" />, "Italic")}
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-4 w-4" />, "Bullet list")}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-4 w-4" />, "Numbered list")}
        {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <Quote className="h-4 w-4" />, "Quote")}
        {btn(editor.isActive("link"), () => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const url = prompt("Link address (https://…)");
          if (url && /^https?:\/\//.test(url)) editor.chain().focus().setLink({ href: url }).run();
        }, <Link2 className="h-4 w-4" />, "Link")}
      </div>
      <EditorContent editor={editor} className="pt-4" />
    </div>
  );
}
