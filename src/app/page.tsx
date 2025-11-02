import { GameShell } from "@/components/game/game-shell";
import { loadDictionary } from "@/lib/dictionary";

export default async function Home() {
  const dictionary = await loadDictionary();

  return <GameShell dictionary={dictionary} />;
}
