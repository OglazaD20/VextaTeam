"use client";

import * as React from "react";
import { Loader2Icon, PaperclipIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import {
  deleteTaskAttachment,
  getAttachmentDownloadUrl,
  uploadTaskAttachment,
} from "@/app/(app)/today/actions";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  itemId,
  attachments,
  onChanged,
}: {
  itemId: string;
  attachments: Tables<"task_attachments">[];
  onChanged: () => void;
}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadTaskAttachment(itemId, formData);
    setIsUploading(false);

    if (result.error) {
      toast.error("Upload failed", { description: result.error });
    } else {
      onChanged();
    }
  }

  async function handleOpen(attachmentId: string) {
    const result = await getAttachmentDownloadUrl(attachmentId);
    if (result.error || !result.data) {
      toast.error("Couldn't open that file", { description: result.error });
      return;
    }
    window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(attachmentId: string) {
    setPendingId(attachmentId);
    const result = await deleteTaskAttachment(attachmentId);
    setPendingId(null);
    if (result.error) {
      toast.error("Couldn't remove that file", { description: result.error });
    } else {
      onChanged();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
        >
          <button
            type="button"
            onClick={() => handleOpen(attachment.id)}
            className="flex min-w-0 items-center gap-2 text-left hover:underline"
          >
            <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{attachment.file_name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatFileSize(attachment.file_size_bytes)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleDelete(attachment.id)}
            disabled={pendingId === attachment.id}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
            aria-label="Remove attachment"
          >
            {pendingId === attachment.id ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <Trash2Icon className="size-3.5" />
            )}
          </button>
        </div>
      ))}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
        Add attachment
      </Button>
    </div>
  );
}
