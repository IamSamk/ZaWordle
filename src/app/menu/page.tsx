"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { 
  Gamepad2, 
  Zap, 
  Trophy, 
  ArrowLeft, 
  Clock,
  User,
  LogOut,
  BarChart3,
  Play
} from "lucide-react";
import Link from "next/link";

type GameMode = "classic" | "blitz" | "speedrun" | null;
type Difficulty = "easy" | "medium" | "hard" | null;
type TimerDuration = 60 | 180 | 300 | null;

const GAME_STATE_KEY = "wordleop:gameState";

const difficultyColors = {
  easy: "from-emerald-500 to-teal-500",
  medium: "from-sky-500 to-indigo-500",
  hard: "from-purple-500 to-pink-500",
};

const difficultyLabels = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const timerLabels = {
  60: "1 Minute",
  180: "3 Minutes",
  300: "5 Minutes",
};

export default function MenuPage() {
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(null);
  const [timer, setTimer] = useState<TimerDuration>(null);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(GAME_STATE_KEY);
      // Use setTimeout to avoid setState during render
      setTimeout(() => setHasSavedGame(!!saved), 0);
    }
  }, []);

  const handleResumeGame = () => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(GAME_STATE_KEY);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          const params = new URLSearchParams({
            mode: state.mode,
            difficulty: state.difficulty,
            ...(state.timerDuration && { timer: state.timerDuration.toString() }),
          });
          router.push(`/play?${params.toString()}`);
        } catch (error) {
          console.error("Failed to parse saved game:", error);
          window.localStorage.removeItem(GAME_STATE_KEY);
          setHasSavedGame(false);
        }
      }
    }
  };

  const handleStart = () => {
    const params = new URLSearchParams({
      mode: gameMode!,
      difficulty: difficulty!,
      ...(gameMode !== "classic" && { timer: timer!.toString() }),
    });
    router.push(`/play?${params.toString()}`);
  };

  const handleBack = () => {
    if (timer) {
      setTimer(null);
    } else if (difficulty) {
      setDifficulty(null);
    } else if (gameMode) {
      setGameMode(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <Link 
          href="/"
          className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent hover:scale-105 transition-transform"
        >
          WordleOP
        </Link>
        
        <div className="flex items-center gap-4">
          {hasSavedGame && (
            <Button
              onClick={handleResumeGame}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              <Play className="w-5 h-5 mr-2" />
              Resume Game
            </Button>
          )}
          
          <Link href="/leaderboard">
            <Button
              variant="ghost"
              size="lg"
              className="text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Leaderboard
            </Button>
          </Link>
          
          <Link href="/profile">
            <Button
              variant="ghost"
              size="lg"
              className="text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <User className="w-5 h-5 mr-2" />
              Profile
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={handleSignOut}
            className="text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          <AnimatePresence mode="wait">
            {/* Mode Selection */}
            {!gameMode && (
              <motion.div
                key="mode"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <h1 className="text-5xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-12">
                  Select Game Mode
                </h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ModeCard
                    title="Classic"
                    description="Build your daily streak"
                    icon={<Gamepad2 className="w-12 h-12" />}
                    gradient="from-blue-500 to-cyan-500"
                    onClick={() => setGameMode("classic")}
                  />
                  
                  <ModeCard
                    title="Blitz"
                    description="Race against the clock"
                    icon={<Zap className="w-12 h-12" />}
                    gradient="from-yellow-500 to-orange-500"
                    onClick={() => setGameMode("blitz")}
                  />
                  
                  <ModeCard
                    title="Speedrun"
                    description="Maximum words in time limit"
                    icon={<Trophy className="w-12 h-12" />}
                    gradient="from-purple-500 to-pink-500"
                    onClick={() => setGameMode("speedrun")}
                  />
                </div>
              </motion.div>
            )}

            {/* Difficulty Selection */}
            {gameMode && !difficulty && (
              <motion.div
                key="difficulty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-slate-300 hover:text-white mb-4"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                
                <h1 className="text-5xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-12">
                  Select Difficulty
                </h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(["easy", "medium", "hard"] as const).map((diff) => (
                    <DifficultyCard
                      key={diff}
                      difficulty={diff}
                      onClick={() => setDifficulty(diff)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Timer Selection (for Blitz/Speedrun) */}
            {gameMode && gameMode !== "classic" && difficulty && !timer && (
              <motion.div
                key="timer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-slate-300 hover:text-white mb-4"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                
                <h1 className="text-5xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-12">
                  Select Timer
                </h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {([60, 180, 300] as const).map((duration) => (
                    <TimerCard
                      key={duration}
                      duration={duration}
                      onClick={() => {
                        setTimer(duration);
                        // Auto-start after timer selection
                        setTimeout(() => {
                          const params = new URLSearchParams({
                            mode: gameMode!,
                            difficulty: difficulty!,
                            timer: duration.toString(),
                          });
                          router.push(`/play?${params.toString()}`);
                        }, 300);
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Classic mode auto-start */}
            {gameMode === "classic" && difficulty && (
              <motion.div
                key="starting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-white mb-4">
                  Starting game...
                </div>
                {setTimeout(() => handleStart(), 500) && null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  title,
  description,
  icon,
  gradient,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group relative p-8 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-700 hover:border-slate-600 transition-all duration-300 overflow-hidden"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
      />
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        <div className={`text-white bg-gradient-to-br ${gradient} p-4 rounded-xl`}>
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <p className="text-slate-400">{description}</p>
      </div>
    </motion.button>
  );
}

function DifficultyCard({
  difficulty,
  onClick,
}: {
  difficulty: "easy" | "medium" | "hard";
  onClick: () => void;
}) {
  const gradient = difficultyColors[difficulty];
  const label = difficultyLabels[difficulty];
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group p-8 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-700 hover:border-slate-600 transition-all duration-300 relative overflow-hidden"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
      />
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        <div className={`text-5xl font-bold bg-gradient-to-br ${gradient} bg-clip-text text-transparent`}>
          {label}
        </div>
      </div>
    </motion.button>
  );
}

function TimerCard({
  duration,
  onClick,
}: {
  duration: 60 | 180 | 300;
  onClick: () => void;
}) {
  const label = timerLabels[duration];
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group p-8 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-700 hover:border-slate-600 transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        <Clock className="w-12 h-12 text-orange-400" />
        <div className="text-3xl font-bold text-white">{label}</div>
      </div>
    </motion.button>
  );
}
