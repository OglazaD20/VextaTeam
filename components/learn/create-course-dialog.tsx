"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { createCourse } from "@/app/(app)/learn/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateCourseDialog() {
  const router = useRouter();
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createCourse({
        title: String(formData.get("title") ?? ""),
        subject: String(formData.get("subject") ?? "general"),
        examDate: String(formData.get("examDate") ?? ""),
        dailyStudyGoalMinutes: formData.get("dailyStudyGoalMinutes")
          ? Number(formData.get("dailyStudyGoalMinutes"))
          : undefined,
      });

      if (result.error || !result.data) {
        setError(result.error ?? "Couldn't create that course");
        toast.error("Couldn't create course", { description: result.error });
        return;
      }

      toast.success("Course created");
      setOpen(false);
      router.push(`/learn/${result.data.id}`);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> New course
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-title">Title</Label>
            <Input id="course-title" name="title" placeholder="Organic Chemistry" required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-subject">Subject</Label>
            <Input id="course-subject" name="subject" placeholder="Chemistry" defaultValue="general" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-exam">Exam date (optional)</Label>
              <Input id="course-exam" name="examDate" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-goal">Daily goal (min)</Label>
              <Input id="course-goal" name="dailyStudyGoalMinutes" type="number" min={5} step={5} placeholder="30" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Create course
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
