"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/supabase/auth";
import {
  getUserProfile,
  getDailyStreak,
  getBestBlitzScores,
  getUserSpeedrunScores,
} from "@/lib/supabase/game";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame, Zap, Trophy } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<{ username: string; email: string } | null>(null);
  const [streak, setStreak] = useState<{ current_streak: number; longest_streak: number } | null>(null);
  const [blitzScores, setBlitzScores] = useState<Array<{ id?: string; difficulty: string; best_time: number; times_achieved: number }>>([]);
  const [speedrunScores, setSpeedrunScores] = useState<Array<{ id?: string; difficulty: string; timer_duration: number; word_count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const loadProfileData = async () => {
        try {
          const [profileData, streakData, blitzData, speedrunData] =
            await Promise.all([
              getUserProfile(user.id),
              getDailyStreak(user.id),
              getBestBlitzScores(user.id),
              getUserSpeedrunScores(user.id),
            ]);

          setProfile(profileData);
          setStreak(streakData);
          setBlitzScores(blitzData);
          setSpeedrunScores(speedrunData);
        } catch (error) {
          console.error("Error loading profile:", error);
        } finally {
          setLoading(false);
        }
      };

      loadProfileData();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-2xl text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/menu">
          <Button
            variant="ghost"
            className="text-slate-300 hover:text-white mb-8"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Menu
          </Button>
        </Link>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 mb-8"
        >
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-4xl font-bold text-white">
                {profile?.username?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {profile?.username || "User"}
              </h1>
              <p className="text-slate-400">{profile?.email}</p>
            </div>
          </div>
        </motion.div>

        {/* Daily Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-orange-500/20 p-8 mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Flame className="w-8 h-8 text-orange-400" />
            <h2 className="text-3xl font-bold text-white">Daily Streak</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                {streak?.current_streak || 0}
              </div>
              <div className="text-slate-400 mt-2">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                {streak?.longest_streak || 0}
              </div>
              <div className="text-slate-400 mt-2">Longest Streak</div>
            </div>
          </div>
        </motion.div>

        {/* Blitz Scores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-yellow-500/20 p-8 mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Zap className="w-8 h-8 text-yellow-400" />
            <h2 className="text-3xl font-bold text-white">Blitz Records</h2>
          </div>
          <div className="space-y-4">
            {blitzScores.length > 0 ? (
              blitzScores.map((score) => (
                <div
                  key={score.id}
                  className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="capitalize text-lg font-semibold text-white">
                      {score.difficulty}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-400">
                      {score.best_time}s
                    </div>
                    <div className="text-sm text-slate-400">
                      Achieved {score.times_achieved} time
                      {score.times_achieved !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-8">
                No blitz scores yet
              </div>
            )}
          </div>
        </motion.div>

        {/* Speedrun Scores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Trophy className="w-8 h-8 text-purple-400" />
            <h2 className="text-3xl font-bold text-white">Speedrun Records</h2>
          </div>
          <div className="space-y-4">
            {speedrunScores.length > 0 ? (
              speedrunScores.map((score) => (
                <div
                  key={score.id}
                  className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg"
                >
                  <div>
                    <div className="capitalize text-lg font-semibold text-white">
                      {score.difficulty}
                    </div>
                    <div className="text-sm text-slate-400">
                      {score.timer_duration / 60} minute
                      {score.timer_duration !== 60 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-400">
                      {score.word_count} words
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-8">
                No speedrun scores yet
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
