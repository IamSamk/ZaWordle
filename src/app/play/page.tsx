import { GameShell } from "@/components/game/game-shell";
import { loadDictionary } from "@/lib/dictionary";
import { redirect } from "next/navigation";

type PlayPageProps = {
  searchParams: Promise<{
    mode?: string;
    difficulty?: string;
    timer?: string;
  }>;
};

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const params = await searchParams;
  const dictionary = await loadDictionary();

  const mode = (params.mode || "classic") as "classic" | "blitz" | "speedrun";
  const difficulty = (params.difficulty || "easy") as "easy" | "medium" | "hard";
  const timerDuration = params.timer ? parseInt(params.timer) : undefined;

  // Validate that blitz and speedrun modes have a timer
  if ((mode === "blitz" || mode === "speedrun") && !timerDuration) {
    redirect("/menu");
  }

  return (
    <GameShell
      dictionary={dictionary}
      mode={mode}
      initialDifficulty={difficulty}
      timerDuration={timerDuration}
    />
  );
}
