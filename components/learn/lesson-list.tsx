"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookmarkIcon, ChevronDownIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  createLesson,
  deleteLesson,
  toggleLessonBookmark,
  toggleLessonCompleted,
  updateLessonContent,
} from "@/app/(app)/learn/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function LessonList({ courseId, lessons }: { courseId: string; lessons: Tables<"lessons">[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [newTitle, setNewTitle] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;
    startTransition(async () => {
      const result = await createLesson({ courseId, title: newTitle.trim() });
      if (result.error) {
        toast.error("Couldn't add that lesson", { description: result.error });
        return;
      }
      setNewTitle("");
      router.refresh();
    });
  }

  function handleDelete(lessonId: string) {
    startTransition(async () => {
      await deleteLesson(lessonId, courseId);
      router.refresh();
    });
  }

  function handleToggleBookmark(lesson: Tables<"lessons">) {
    startTransition(async () => {
      await toggleLessonBookmark(lesson.id, courseId, !lesson.is_bookmarked);
      router.refresh();
    });
  }

  function handleToggleCompleted(lesson: Tables<"lessons">) {
    startTransition(async () => {
      await toggleLessonCompleted(lesson.id, courseId, !lesson.is_completed);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {lessons.map((lesson) => (
        <div key={lesson.id} className="rounded-xl border border-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <Checkbox
              checked={lesson.is_completed}
              onCheckedChange={() => handleToggleCompleted(lesson)}
              disabled={isPending}
              aria-label="Mark lesson complete"
            />
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === lesson.id ? null : lesson.id)}
              className={cn(
                "flex flex-1 items-center gap-1.5 text-left text-sm",
                lesson.is_completed && "text-muted-foreground line-through",
              )}
            >
              <ChevronDownIcon
                className={cn("size-3.5 shrink-0 transition-transform", expandedId === lesson.id && "rotate-180")}
              />
              {lesson.title}
            </button>
            <button
              type="button"
              onClick={() => handleToggleBookmark(lesson)}
              aria-label={lesson.is_bookmarked ? "Remove bookmark" : "Bookmark lesson"}
              className={cn(
                "text-muted-foreground transition-colors hover:text-primary",
                lesson.is_bookmarked && "text-primary",
              )}
            >
              <BookmarkIcon className="size-3.5" fill={lesson.is_bookmarked ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(lesson.id)}
              aria-label={`Delete ${lesson.title}`}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2Icon className="size-3.5" />
            </button>
          </div>
          {expandedId === lesson.id && <LessonNotes courseId={courseId} lesson={lesson} />}
        </div>
      ))}

      <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a lesson…"
          className="h-8 text-sm"
        />
        <Button type="submit" size="icon" variant="ghost" className="size-8 shrink-0" disabled={!newTitle.trim() || isPending} aria-label="Add lesson">
          {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <PlusIcon className="size-3.5" />}
        </Button>
      </form>
    </div>
  );
}

function LessonNotes({ courseId, lesson }: { courseId: string; lesson: Tables<"lessons"> }) {
  const router = useRouter();
  const [content, setContent] = React.useState(lesson.content ?? "");
  const [isSaving, startTransition] = React.useTransition();
  const [saved, setSaved] = React.useState(true);

  function handleSave() {
    startTransition(async () => {
      const result = await updateLessonContent({ lessonId: lesson.id, content, courseId });
      if (result.error) {
        toast.error("Couldn't save notes", { description: result.error });
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setSaved(false);
        }}
        placeholder="Notes for this lesson…"
        className="min-h-24 text-sm"
      />
      <div className="flex items-center justify-end gap-2">
        {saved && content === (lesson.content ?? "") && (
          <span className="text-xs text-muted-foreground">Saved</span>
        )}
        <Button size="sm" variant="secondary" onClick={handleSave} disabled={isSaving || saved}>
          {isSaving && <Loader2Icon className="animate-spin" />}
          Save notes
        </Button>
      </div>
    </div>
  );
}
