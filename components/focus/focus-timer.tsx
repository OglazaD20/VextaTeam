"use client";

import * as React from "react";
import { PauseIcon, PlayIcon, SquareIcon } from "lucide-react";
import { toast } from "sonner";

import { endFocusSession, startFocusSession } from "@/app/(app)/focus/actions";
import { Button } from "@/components/ui/button";
import { MoodCheckDialog } from "@/components/focus/mood-check-dialog";
import { ProgressRing } from "@/components/focus/progress-ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Phase = "work" | "break";
type Status = "idle" | "running" | "completed";

interface TimerState {
  status: Status;
  phase: Phase;
  totalCycles: number;
  currentCycle: number;
  secondsLeft: number;
  isPaused: boolean;
  workSecondsElapsed: number;
}

type Action =
  | { type: "SET_CYCLES"; cycles: number }
  | { type: "START" }
  | { type: "TICK" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "RESET" };

function makeInitialState(totalCycles: number): TimerState {
  return {
    status: "idle",
    phase: "work",
    totalCycles,
    currentCycle: 1,
    secondsLeft: 0,
    isPaused: false,
    workSecondsElapsed: 0,
  };
}

function reducer(
  state: TimerState,
  action: Action,
  config: { focusBlockMinutes: number; breakMinutes: number },
): TimerState {
  switch (action.type) {
    case "SET_CYCLES":
      return makeInitialState(action.cycles);
    case "START":
      return {
        ...state,
        status: "running",
        phase: "work",
        currentCycle: 1,
        secondsLeft: config.focusBlockMinutes * 60,
        workSecondsElapsed: 0,
        isPaused: false,
      };
    case "TOGGLE_PAUSE":
      return { ...state, isPaused: !state.isPaused };
    case "TICK": {
      if (state.status !== "running" || state.isPaused) return state;

      if (state.secondsLeft > 1) {
        return { ...state, secondsLeft: state.secondsLeft - 1 };
      }

      // Current phase's time just ran out.
      if (state.phase === "work") {
        const workSecondsElapsed =
          state.workSecondsElapsed + config.focusBlockMinutes * 60;

        if (state.currentCycle >= state.totalCycles) {
          return { ...state, status: "completed", workSecondsElapsed, secondsLeft: 0 };
        }

        return {
          ...state,
          phase: "break",
          secondsLeft: config.breakMinutes * 60,
          workSecondsElapsed,
        };
      }

      return {
        ...state,
        phase: "work",
        currentCycle: state.currentCycle + 1,
        secondsLeft: config.focusBlockMinutes * 60,
      };
    }
    case "RESET":
      return makeInitialState(state.totalCycles);
    default:
      return state;
  }
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface PendingEnd {
  interrupted: boolean;
  actualDurationMinutes: number;
  pomodoroCycles: number;
}

export function FocusTimer({
  focusBlockMinutes,
  breakMinutes,
}: {
  focusBlockMinutes: number;
  breakMinutes: number;
}) {
  const config = React.useMemo(
    () => ({ focusBlockMinutes, breakMinutes }),
    [focusBlockMinutes, breakMinutes],
  );
  const [state, dispatch] = React.useReducer(
    (s: TimerState, a: Action) => reducer(s, a, config),
    3,
    makeInitialState,
  );
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [isStarting, setIsStarting] = React.useState(false);
  const [pendingEnd, setPendingEnd] = React.useState<PendingEnd | null>(null);

  // Natural completion: the reducer flips to "completed" on its own once
  // the last work block ends. The mood dialog's open state derives directly
  // from state.status below; this effect only notifies (no local state).
  React.useEffect(() => {
    if (state.status === "completed") {
      toast.success("Focus session complete");
    }
  }, [state.status]);

  React.useEffect(() => {
    if (state.status !== "running" || state.isPaused) return;
    const interval = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(interval);
  }, [state.status, state.isPaused]);

  async function handleStart() {
    setIsStarting(true);
    const result = await startFocusSession(state.totalCycles * focusBlockMinutes);
    setIsStarting(false);
    if (result.error || !result.data) {
      toast.error("Couldn't start focus session", { description: result.error });
      return;
    }
    setSessionId(result.data.id);
    dispatch({ type: "START" });
  }

  function handleEndEarly() {
    const currentBlockElapsed =
      state.phase === "work" ? focusBlockMinutes * 60 - state.secondsLeft : 0;
    const pomodoroCycles =
      state.phase === "break" ? state.currentCycle : Math.max(0, state.currentCycle - 1);

    setPendingEnd({
      interrupted: true,
      actualDurationMinutes: Math.round(
        (state.workSecondsElapsed + currentBlockElapsed) / 60,
      ),
      pomodoroCycles,
    });
    dispatch({ type: "RESET" });
  }

  async function handleMoodSubmit(result: { mood?: number; energy?: number }) {
    // Early-end already populated pendingEnd; natural completion hasn't, so
    // derive the same shape from current reducer state in that case.
    const pending: PendingEnd =
      pendingEnd ?? {
        interrupted: false,
        actualDurationMinutes: Math.round(state.workSecondsElapsed / 60),
        pomodoroCycles: state.totalCycles,
      };
    const idToClose = sessionId;
    setPendingEnd(null);
    setSessionId(null);
    dispatch({ type: "RESET" });

    if (!idToClose) return;

    const actionResult = await endFocusSession(idToClose, {
      actualDurationMinutes: pending.actualDurationMinutes,
      pomodoroCycles: pending.pomodoroCycles,
      interrupted: pending.interrupted,
      moodAfter: result.mood,
      energyAfter: result.energy,
    });

    if (actionResult.error) {
      toast.error("Couldn't save that session", { description: actionResult.error });
    }
  }

  const blockTotalSeconds =
    (state.phase === "work" ? focusBlockMinutes : breakMinutes) * 60;
  const progress =
    state.status === "running" ? 1 - state.secondsLeft / blockTotalSeconds : 0;

  return (
    <div className="flex flex-col items-center gap-6">
      {state.status !== "running" ? (
        <>
          <ProgressRing progress={0}>
            <span className="text-3xl font-semibold tabular-nums">
              {focusBlockMinutes}:00
            </span>
            <span className="text-xs text-muted-foreground">per cycle</span>
          </ProgressRing>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Cycles</span>
            <Select
              value={String(state.totalCycles)}
              onValueChange={(value) =>
                dispatch({ type: "SET_CYCLES", cycles: Number(value) })
              }
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button size="lg" onClick={handleStart} disabled={isStarting}>
            <PlayIcon /> Start focus session
          </Button>
        </>
      ) : (
        <>
          <ProgressRing
            progress={progress}
            className={cn(state.phase === "break" && "stroke-success")}
          >
            <span className="text-3xl font-semibold tabular-nums">
              {formatClock(state.secondsLeft)}
            </span>
            <span className="text-xs text-muted-foreground">
              {state.phase === "work" ? "Focus" : "Break"} · Cycle{" "}
              {state.currentCycle} of {state.totalCycles}
            </span>
          </ProgressRing>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => dispatch({ type: "TOGGLE_PAUSE" })}
            >
              {state.isPaused ? <PlayIcon /> : <PauseIcon />}
              {state.isPaused ? "Resume" : "Pause"}
            </Button>
            <Button variant="ghost" size="lg" onClick={handleEndEarly}>
              <SquareIcon /> End early
            </Button>
          </div>
        </>
      )}

      <MoodCheckDialog
        open={state.status === "completed" || !!pendingEnd}
        onOpenChange={(open) => !open && setPendingEnd(null)}
        onSubmit={handleMoodSubmit}
      />
    </div>
  );
}
