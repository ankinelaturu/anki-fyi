"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="prose-strong">{children}</strong>,
  em: ({ children }) => <em className="prose-em">{children}</em>,
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="prose-kw" {...props}>
        {children}
      </code>
    );
  },
};

type MarkdownProseProps = {
  children: string;
  className?: string;
};

export function MarkdownProse({ children, className }: MarkdownProseProps) {
  return (
    <div className={className ?? "prose-ide mx-auto max-w-4xl"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
