"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getSpeedrunLeaderboard } from "@/lib/supabase/game";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Medal, Award } from "lucide-react";
import Link from "next/link";

type Difficulty = "easy" | "medium" | "hard";
type TimerDuration = 60 | 180 | 300;

const difficultyColors = {
  easy: "from-emerald-500 to-teal-500",
  medium: "from-sky-500 to-indigo-500",
  hard: "from-purple-500 to-pink-500",
};

export default function LeaderboardPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [timer, setTimer] = useState<TimerDuration>(60);
  const [leaderboard, setLeaderboard] = useState<Array<{
    id?: string;
    word_count: number;
    profiles: { username: string } | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await getSpeedrunLeaderboard(difficulty, timer);
        setLeaderboard(data);
      } catch (error) {
        console.error("Error loading leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [difficulty, timer]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (index === 1) return <Medal className="w-6 h-6 text-slate-300" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="text-xl font-bold text-slate-400">{index + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-8" style={{ cursor: 'default' }}>
      <div className="max-w-6xl mx-auto">
        <Link href="/menu">
          <Button
            variant="ghost"
            className="text-slate-300 hover:text-white mb-8"
            style={{ cursor: 'pointer' }}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Menu
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-8">
            Global Leaderboard
          </h1>

          {/* Difficulty Tabs */}
          <div className="flex justify-center gap-4 mb-6">
            {(["easy", "medium", "hard"] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  difficulty === diff
                    ? `bg-gradient-to-r ${difficultyColors[diff]} text-white shadow-lg`
                    : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
                }`}
                style={{ cursor: 'pointer' }}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            ))}
          </div>

          {/* Timer Tabs */}
          <div className="flex justify-center gap-4 mb-8">
            {([60, 180, 300] as const).map((duration) => (
              <button
                key={duration}
                onClick={() => setTimer(duration)}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  timer === duration
                    ? "bg-orange-500 text-white shadow-lg"
                    : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
                }`}
                style={{ cursor: 'pointer' }}
              >
                {duration === 60 ? "1m" : duration === 180 ? "3m" : "5m"}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Leaderboard List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8"
        >
          {loading ? (
            <div className="text-center text-slate-400 py-12">Loading...</div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 hover:bg-slate-800/50 ${
                    index < 3 ? "bg-slate-800/30" : "bg-slate-800/10"
                  }`}
                  style={{ cursor: 'default' }}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 flex justify-center">
                      {getRankIcon(index)}
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white">
                        {entry.profiles?.username || "Anonymous"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      {entry.word_count} words
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-12">
              No scores yet. Be the first!
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
