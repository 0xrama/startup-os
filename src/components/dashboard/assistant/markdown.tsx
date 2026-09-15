"use client";

import { memo } from "react";
import { type Block, parseBlocks, parseInline } from "./markdown-parser";

const HEADING_CLASS = {
  1: "mt-5 mb-2 text-[15px] font-semibold tracking-tight first:mt-0",
  2: "mt-5 mb-2 text-[14px] font-semibold tracking-tight first:mt-0",
  3: "mt-4 mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0",
} as const;

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, tokenIndex) => {
        const key = `${tokenIndex}-${token.kind}`;

        if (token.kind === "strong") {
          return (
            <strong key={key} className="font-semibold text-foreground">
              {token.value}
            </strong>
          );
        }

        if (token.kind === "emphasis") {
          return (
            <em key={key} className="italic">
              {token.value}
            </em>
          );
        }

        if (token.kind === "code") {
          return (
            <code
              key={key}
              className="bg-secondary px-1 py-0.5 font-mono text-[12.5px]"
            >
              {token.value}
            </code>
          );
        }

        if (token.kind === "link") {
          return (
            <a
              key={key}
              href={token.href}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-2"
            >
              {token.value}
            </a>
          );
        }

        return <span key={key}>{token.value}</span>;
      })}
    </>
  );
}

function MarkdownBlock({ block }: { block: Block }) {
  if (block.kind === "heading") {
    // SAFETY: the parser caps level at 1-3, so the tag is h3, h4, or h5.
    // Headings start at h3 because the page owns the h1 and h2 above them.
    const Tag = `h${block.level + 2}` as "h3" | "h4" | "h5";

    return (
      <Tag className={HEADING_CLASS[block.level]}>
        <Inline text={block.text} />
      </Tag>
    );
  }

  if (block.kind === "rule") {
    return <hr className="my-4 border-border" />;
  }

  if (block.kind === "code") {
    return (
      <pre className="my-3 overflow-x-auto border border-border bg-secondary/50 p-3 font-mono text-[12.5px] leading-relaxed">
        <code>{block.text}</code>
      </pre>
    );
  }

  if (block.kind === "table") {
    return (
      <div className="my-3 overflow-x-auto border border-border">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-secondary/50">
              {block.header.map((cell, cellIndex) => (
                <th
                  key={cellIndex}
                  className="border-b border-border px-3 py-2 text-left font-medium"
                >
                  <Inline text={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-border last:border-0"
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 align-top">
                    <Inline text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.kind === "list") {
    const ListTag = block.ordered ? "ol" : "ul";

    return (
      <ListTag
        start={block.ordered ? block.start : undefined}
        className={`my-2 space-y-1.5 pl-5 marker:text-muted-foreground ${block.ordered ? "list-decimal" : "list-disc"}`}
      >
        {block.items.map((item, itemIndex) => (
          <li
            key={itemIndex}
            style={item.depth > 0 ? { marginLeft: item.depth * 16 } : undefined}
          >
            <Inline text={item.text} />
          </li>
        ))}
      </ListTag>
    );
  }

  return (
    <p className="my-2 whitespace-pre-line first:mt-0 last:mb-0">
      <Inline text={block.text} />
    </p>
  );
}

export const Markdown = memo(function Markdown({ source }: { source: string }) {
  return (
    <div className="text-[14px] leading-7 text-foreground/90">
      {parseBlocks(source).map((block, blockIndex) => (
        <MarkdownBlock key={blockIndex} block={block} />
      ))}
    </div>
  );
});
