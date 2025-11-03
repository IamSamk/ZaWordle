import { LandingExperience } from "@/components/landing/landing-experience";
import { loadDictionary } from "@/lib/dictionary";

const gatherLandingWords = (dictionary: Awaited<ReturnType<typeof loadDictionary>>): string[] => {
  const combined = [...dictionary.easy, ...dictionary.medium, ...dictionary.hard];

  if (combined.length === 0) {
    return [];
  }

  const unique = Array.from(new Set(combined.map(({ word }) => word.toUpperCase())));
  const limit = Math.min(100, unique.length);
  const step = Math.max(1, Math.floor(unique.length / limit));
  const selection: string[] = [];

  for (let index = 0; index < limit; index += 1) {
    selection.push(unique[(index * step) % unique.length]);
  }

  return selection;
};

export default async function Home() {
  const dictionary = await loadDictionary();
  const landingWords = gatherLandingWords(dictionary);

  return <LandingExperience words={landingWords} />;
}
