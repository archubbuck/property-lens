import { cn } from "@/lib/utils";

/**
 * Minimal, dependency-free renderer for stored help-article content.
 * Supports a small markdown-ish subset: `## ` / `### ` headings, `- `/`* `
 * bullet lists, `1. ` numbered lists, and blank-line separated paragraphs.
 * Inline `**bold**` is also supported. This intentionally avoids pulling in
 * a full markdown library per the task's "minimal renderer is fine" note.
 */
export function ArticleBody({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className={cn("space-y-4 text-sm leading-relaxed text-foreground", className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = block.level === 2 ? "h2" : "h3";
          return (
            <HeadingTag
              key={index}
              className={cn(
                "font-serif font-semibold",
                block.level === 2 ? "text-xl pt-2" : "text-lg pt-1"
              )}
            >
              {renderInline(block.text)}
            </HeadingTag>
          );
        }
        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={index}
              className={cn(
                "space-y-1.5 pl-5",
                block.ordered ? "list-decimal" : "list-disc"
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }
        return <p key={index}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}

type Block =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; text: string };

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push({ type: "paragraph", text: paragraphBuffer.join(" ").trim() });
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer && listBuffer.items.length) {
      blocks.push({ type: "list", ordered: listBuffer.ordered, items: listBuffer.items });
    }
    listBuffer = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(##|###)\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length === 2 ? 2 : 3,
        text: headingMatch[2],
      });
      continue;
    }

    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    const numberedMatch = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bulletMatch || numberedMatch) {
      flushParagraph();
      const ordered = Boolean(numberedMatch);
      const text = (bulletMatch ?? numberedMatch)![1];
      if (!listBuffer || listBuffer.ordered !== ordered) {
        flushList();
        listBuffer = { ordered, items: [] };
      }
      listBuffer.items.push(text);
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}
