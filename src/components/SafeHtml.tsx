import { useEffect, useState } from "react";

/** Renders user-written HTML after sanitising it in the browser. */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  const [clean, setClean] = useState<string | null>(null);
  useEffect(() => {
    import("dompurify").then(({ default: DOMPurify }) => {
      DOMPurify.addHook("afterSanitizeAttributes", (node) => {
        if (node.tagName === "A") {
          node.setAttribute("target", "_blank");
          node.setAttribute("rel", "noopener noreferrer nofollow ugc");
        }
      });
      setClean(
        DOMPurify.sanitize(html, {
          ALLOWED_TAGS: ["p", "h2", "h3", "strong", "em", "b", "i", "a", "ul", "ol", "li", "blockquote", "br", "img"],
          ALLOWED_ATTR: ["href", "src", "alt", "target", "rel"],
        }),
      );
    });
  }, [html]);
  if (clean === null) return <div className={className} />;
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
