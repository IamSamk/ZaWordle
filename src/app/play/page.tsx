import { GameShell } from "@/components/game/game-shell";
import { loadDictionary } from "@/lib/dictionary";

export default async function PlayPage() {
  const dictionary = await loadDictionary();

  return <GameShell dictionary={dictionary} />;
}
