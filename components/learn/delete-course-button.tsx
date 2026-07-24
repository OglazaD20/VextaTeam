"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteCourse } from "@/app/(app)/learn/actions";
import { useTranslations } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { messages } = useTranslations();
  const [isPending, startTransition] = React.useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCourse(courseId);
      if (result.error) {
        toast.error(messages.learn.courseDeleteError, { description: result.error });
        return;
      }
      toast.success(messages.learn.courseDeleted);
      router.push("/learn");
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isPending}>
      {isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
      {messages.common.delete}
    </Button>
  );
}
