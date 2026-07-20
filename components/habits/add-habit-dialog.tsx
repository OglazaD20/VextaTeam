"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

import { HabitEditorDialog } from "@/components/habits/habit-editor-dialog";
import { Button } from "@/components/ui/button";

export function AddHabitDialog() {
  const [isOpen, setOpen] = React.useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon /> New habit
      </Button>
      <HabitEditorDialog open={isOpen} onOpenChange={setOpen} />
    </>
  );
}
