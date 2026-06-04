import { formatExperienceMonth } from "@/lib/formatExperienceDate";
import type { ContentFile } from "@/lib/content-types";

type ExperienceInsightsMetaProps = {
  file: ContentFile;
};

export function ExperienceInsightsMeta({ file }: ExperienceInsightsMetaProps) {
  const start = formatExperienceMonth(file.startDate);
  const end = formatExperienceMonth(file.endDate) ?? "Present";
  const showDates = start || file.endDate;

  if (!file.company && !showDates) return null;

  return (
    <div className="space-y-2 pt-1">
      {file.company ? (
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#f87171]">
          {file.company}
        </div>
      ) : null}
      {showDates ? (
        <div className="flex items-center gap-2 text-[11px] text-[#f87171]/55">
          <span className="shrink-0 tabular-nums">{start ?? "—"}</span>
          <span className="h-px min-w-[1rem] flex-1 bg-[#f87171]/35" aria-hidden />
          <span className="shrink-0 tabular-nums">{end}</span>
        </div>
      ) : null}
    </div>
  );
}
