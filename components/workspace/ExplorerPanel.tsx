"use client";

import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { FileIcon } from "@/components/workspace/FileIcon";
import type { ContentFile, ContentFolder } from "@/lib/content-types";
import { FOLDER_LABELS } from "@/lib/folders";
import { WORKSPACE_PANEL_TITLE_CLASS } from "@/lib/workspace-chrome";
import { cn } from "@/lib/utils";

type ExplorerPanelProps = {
  folders: ContentFolder[];
  activeSlug: string;
  expanded: Record<string, boolean>;
  onToggleFolder: (folder: string) => void;
  onSelectFile: (slug: string) => void;
};

export function ExplorerPanel({
  folders,
  activeSlug,
  expanded,
  onToggleFolder,
  onSelectFile,
}: ExplorerPanelProps) {
  return (
    <>
      <div className={WORKSPACE_PANEL_TITLE_CLASS}>Explorer</div>
      <div className="min-h-0 flex-1 overflow-auto p-2 text-xs">
        {folders.map((folder) => {
          const isOpen = expanded[folder.name] ?? true;
          const containsActive = folder.files.some((file) => file.slug === activeSlug);
          return (
            <div key={folder.name} className="mb-1">
              <button
                type="button"
                className="flex w-full items-center gap-1 rounded px-1 py-1 text-left text-ide-muted hover:bg-ide-active hover:text-ide-text"
                onClick={() => onToggleFolder(folder.name)}
              >
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {isOpen ? (
                  <FolderOpen className={cn("h-3.5 w-3.5", containsActive ? "text-ide-blue" : "text-ide-muted")} />
                ) : (
                  <Folder className={cn("h-3.5 w-3.5", containsActive ? "text-ide-blue" : "text-ide-muted")} />
                )}
                <span>{FOLDER_LABELS[folder.name] ?? folder.name.toUpperCase()}</span>
              </button>
              {isOpen && (
                <div className="ml-4 border-l border-[#303030] pl-2">
                  {folder.files.map((file) => (
                    <ExplorerFileRow
                      key={file.slug}
                      file={file}
                      isActive={activeSlug === file.slug}
                      onSelect={() => onSelectFile(file.slug)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ExplorerFileRow({
  file,
  isActive,
  onSelect,
}: {
  file: ContentFile;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded px-1 py-1 text-left text-[12px] hover:bg-ide-active",
        isActive ? "bg-ide-active text-white" : "text-ide-text"
      )}
    >
      <FileIcon file={file} selected={isActive} />
      <span className="min-w-0 flex-1 truncate">{file.title}</span>
      {file.featured && (
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", isActive ? "bg-ide-blue" : "bg-ide-yellow")}
          aria-label="Featured"
        />
      )}
    </button>
  );
}
