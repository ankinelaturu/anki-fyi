"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { AnalyticsBlock } from "@/components/analytics/AnalyticsBlock";

function getAnalyticsSource(child: ReactNode): string | null {
  if (!isValidElement<{ children?: ReactNode }>(child)) return null;
  const { children } = child.props;
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(String).join("");
  return null;
}

function createMarkdownComponents(externalLinkIcon: boolean): Components {
  return {
    a: ({ href, children }) => {
      const external = Boolean(href?.startsWith("http"));

      return (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className={external && externalLinkIcon ? "inline-flex items-center gap-1" : undefined}
        >
          {children}
          {external && externalLinkIcon ? (
            <>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
              <span className="sr-only"> (opens in new tab)</span>
            </>
          ) : null}
        </a>
      );
    },
    strong: ({ children }) => <strong className="prose-strong">{children}</strong>,
    em: ({ children }) => <em className="prose-em">{children}</em>,
    pre: ({ children }) => {
      const child = Children.only(children);
      const source = getAnalyticsSource(child);
      if (source !== null) {
        return <AnalyticsBlock source={source} />;
      }
      return <pre>{children}</pre>;
    },
    code: ({ className, children, ...props }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        if (className?.includes("language-analytics")) {
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
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
}

const defaultMarkdownComponents = createMarkdownComponents(false);

type MarkdownProseProps = {
  children: string;
  className?: string;
  /** Show external-link icon after http(s) links (e.g. Ask Anki project links). */
  externalLinkIcon?: boolean;
};

export function MarkdownProse({
  children,
  className,
  externalLinkIcon = false,
}: MarkdownProseProps) {
  const components = externalLinkIcon
    ? createMarkdownComponents(true)
    : defaultMarkdownComponents;

  return (
    <div className={className ?? "prose-ide mx-auto max-w-4xl"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
