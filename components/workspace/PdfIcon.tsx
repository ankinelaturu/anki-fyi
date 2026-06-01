import { cn } from "@/lib/utils";

/** Lucide has no FilePdf icon; document + label in matching stroke style. */
export function PdfIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path
        d="M8 12.5h8M8 15h6"
        strokeWidth="1.5"
      />
      <text
        x="12"
        y="19.5"
        textAnchor="middle"
        fontSize="5.5"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
        fontFamily="ui-monospace, monospace"
      >
        PDF
      </text>
    </svg>
  );
}
