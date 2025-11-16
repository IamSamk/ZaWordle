import { supabase } from "./client";
import type { Database } from "./types";

export type Difficulty = "easy" | "medium" | "hard";
export type TimerDuration = 60 | 180 | 300;

type BlitzScoreRow = Database["public"]["Tables"]["blitz_scores"]["Row"];
type SpeedrunScoreRow = Database["public"]["Tables"]["speedrun_scores"]["Row"];
type DailyStreakRow = Database["public"]["Tables"]["daily_streaks"]["Row"];

// Save blitz score (best time per difficulty)
export async function saveBlitzScore(
  userId: string,
  difficulty: Difficulty,
  time: number
) {
  const { data: existing, error: selectError } = await supabase
    .from("blitz_scores")
    .select("*")
    .eq("user_id", userId)
    .eq("difficulty", difficulty)
    .single<BlitzScoreRow>();

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError;
  }

  if (!existing) {
    // First time - insert
    const { error } = await supabase.from("blitz_scores").insert([
      {
        user_id: userId,
        difficulty,
        best_time: time,
        times_achieved: 1,
      }
    ] as never);
    if (error) throw error;
    return { isNewRecord: true, timesAchieved: 1 };
  }

  if (time < existing.best_time) {
    // New best time
    const { error } = await supabase
      .from("blitz_scores")
      .update({
        best_time: time,
        times_achieved: 1,
      } as never)
      .eq("id", existing.id);
    if (error) throw error;
    return { isNewRecord: true, timesAchieved: 1 };
  } else if (time === existing.best_time) {
    // Matched best time
    const { error } = await supabase
      .from("blitz_scores")
      .update({
        times_achieved: existing.times_achieved + 1,
      } as never)
      .eq("id", existing.id);
    if (error) throw error;
    return { isNewRecord: false, timesAchieved: existing.times_achieved + 1 };
  }

  return { isNewRecord: false, timesAchieved: existing.times_achieved };
}

// Save speedrun score
export async function saveSpeedrunScore(
  userId: string,
  difficulty: Difficulty,
  timerDuration: TimerDuration,
  wordCount: number
) {
  const { data: existing, error: selectError } = await supabase
    .from("speedrun_scores")
    .select("*")
    .eq("user_id", userId)
    .eq("difficulty", difficulty)
    .eq("timer_duration", timerDuration)
    .single<SpeedrunScoreRow>();

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError;
  }

  if (!existing || wordCount > existing.word_count) {
    const { error } = await supabase.from("speedrun_scores").upsert([
      {
        user_id: userId,
        difficulty,
        timer_duration: timerDuration,
        word_count: wordCount,
      }
    ] as never);
    if (error) throw error;
    return { isNewRecord: !existing || wordCount > existing.word_count };
  }

  return { isNewRecord: false };
}

// Update daily streak
export async function updateDailyStreak(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data: streak, error: selectError } = await supabase
    .from("daily_streaks")
    .select("*")
    .eq("user_id", userId)
    .single<DailyStreakRow>();

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError;
  }

  if (!streak) {
    // Create new streak
    const { error } = await supabase.from("daily_streaks").insert([
      {
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_played_date: today,
      }
    ] as never);
    if (error) throw error;
    return { currentStreak: 1, longestStreak: 1 };
  }

  if (streak.last_played_date === today) {
    // Already played today
    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
    };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = 1;
  if (streak.last_played_date === yesterdayStr) {
    // Consecutive day
    newStreak = streak.current_streak + 1;
  }

  const newLongest = Math.max(newStreak, streak.longest_streak);

  const { error } = await supabase
    .from("daily_streaks")
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_played_date: today,
    } as never)
    .eq("user_id", userId);

  if (error) throw error;
  return { currentStreak: newStreak, longestStreak: newLongest };
}

// Get best blitz scores for a user
export async function getBestBlitzScores(userId: string) {
  const { data, error } = await supabase
    .from("blitz_scores")
    .select("*")
    .eq("user_id", userId)
    .order("difficulty", { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get speedrun scores for a user
export async function getUserSpeedrunScores(userId: string) {
  const { data, error } = await supabase
    .from("speedrun_scores")
    .select("*")
    .eq("user_id", userId)
    .order("word_count", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get speedrun leaderboard
export async function getSpeedrunLeaderboard(
  difficulty: Difficulty,
  timerDuration: TimerDuration,
  limit = 100
) {
  const { data, error } = await supabase
    .from("speedrun_scores")
    .select(
      `
      *,
      profiles:user_id (username)
    `
    )
    .eq("difficulty", difficulty)
    .eq("timer_duration", timerDuration)
    .order("word_count", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// Get user profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

// Get daily streak
export async function getDailyStreak(userId: string) {
  const { data, error } = await supabase
    .from("daily_streaks")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}
