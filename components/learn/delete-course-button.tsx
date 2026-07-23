"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteCourse } from "@/app/(app)/learn/actions";
import { Button } from "@/components/ui/button";

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCourse(courseId);
      if (result.error) {
        toast.error("Couldn't delete that course", { description: result.error });
        return;
      }
      toast.success("Course deleted");
      router.push("/learn");
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isPending}>
      {isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
      Delete
    </Button>
  );
}
