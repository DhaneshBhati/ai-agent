import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Activity, Trophy, Zap, AlertCircle } from "lucide-react";

// Utility for clean tailwind merges
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Single socket instance connects to the same origin URL
const socket = io();

type Outcome = "DOT" | "SINGLE" | "BOUNDARY" | "WICKET";

export default function PredictionEngine() {
  const [matchState, setMatchState] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [prediction, setPrediction] = useState<Outcome | null>(null);
  const [result, setResult] = useState<any>(null);
  const [squads, setSquads] = useState({ RCB: 0, CSK: 0 });
  
  // Fake user squad for prototype
  const userSquad = "RCB"; 

  useEffect(() => {
    socket.on("match_state", (state) => {
      setMatchState(state);
      setSquads(state.squads);
      setCountdown(state.countdown);
    });

    socket.on("new_ball_ready", (data) => {
      setPrediction(null);
      setResult(null);
      setMatchState({ ...matchState, isPredicting: true, ballNumber: data.ballNumber });
      setCountdown(data.countdown);
      // Haptic feedback if supported on mobile
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(200);
      }
    });

    socket.on("countdown_tick", (time) => setCountdown(time));
    
    socket.on("squad_points_update", (updatedSquads) => {
      setSquads(updatedSquads);
    });

    socket.on("ball_result", (data) => {
      setMatchState((prev: any) => ({ ...prev, isPredicting: false }));
      setResult(data.actual);
      if (data.actual === "BOUNDARY" || data.actual === "WICKET") {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 400]); // Excitement pattern
        }
      }
    });

    return () => {
      socket.off("match_state");
      socket.off("new_ball_ready");
      socket.off("countdown_tick");
      socket.off("squad_points_update");
      socket.off("ball_result");
    };
  }, []);

  const handlePredict = (outcome: Outcome) => {
    if (!matchState?.isPredicting || prediction) return;
    
    setPrediction(outcome);
    socket.emit("user_prediction", { squad: userSquad, outcome, amount: 100 });
  };

  const calculateBarWidth = (squadA: number, squadB: number) => {
    const total = squadA + squadB;
    if (total === 0) return 50;
    return (squadA / total) * 100;
  };

  return (
    <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 w-full max-w-7xl mx-auto">
      
      {/* Left: Squad Battle / Social */}
      <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
        <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
            Squad Tug-of-War
            <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] rounded-full">HOT</span>
          </h3>
          
          <div className="flex-1 flex flex-col justify-center gap-8">
            <div className="space-y-3">
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-bold text-red-500">RCB Ultras</span>
                <span className="text-lg font-mono font-bold text-slate-300">{Math.round(calculateBarWidth(squads.RCB, squads.CSK))}%</span>
              </div>
              <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5 relative">
                <motion.div 
                  className="absolute top-0 bottom-0 left-0 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                  initial={{ width: '50%' }}
                  animate={{ width: `${calculateBarWidth(squads.RCB, squads.CSK)}%` }} 
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs font-mono text-slate-500 text-right">{squads.RCB.toLocaleString()} PTS</p>
            </div>

            <div className="relative h-px bg-white/10 flex items-center justify-center">
              <div className="absolute bg-[#081021] px-3 py-1 border border-white/10 rounded-full text-[10px] font-bold text-slate-500 italic uppercase">Versus</div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-bold text-yellow-500">CSK Fanatics</span>
                <span className="text-lg font-mono font-bold text-slate-300">{Math.round(calculateBarWidth(squads.CSK, squads.RCB))}%</span>
              </div>
              <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5 relative">
                <motion.div 
                  className="absolute top-0 bottom-0 left-0 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]" 
                  initial={{ width: '50%' }}
                  animate={{ width: `${calculateBarWidth(squads.CSK, squads.RCB)}%` }} 
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs font-mono text-slate-500 text-right">{squads.CSK.toLocaleString()} PTS</p>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5 hidden lg:block">
            <p className="text-[10px] text-slate-500 uppercase tracking-tighter mb-3">Live Activity</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold">V</div>
                <p><span className="font-bold">@ViratFan</span> wagered 500 on <span className="text-emerald-400">WICKET</span></p>
              </div>
              <div className="flex items-center gap-3 text-xs opacity-60">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold">D</div>
                <p><span className="font-bold">@DevOpsKing</span> joined CSK Fanatics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Micro-Prediction Engine */}
      <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
        <motion.div 
          className={cn(
            "flex-1 bg-white/5 backdrop-blur-2xl border rounded-[40px] p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500",
            matchState?.isPredicting ? "border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]" : "border-white/10"
          )}
          animate={{
            scale: matchState?.isPredicting && countdown <= 5 ? [1, 1.02, 1] : 1,
            borderColor: matchState?.isPredicting && countdown <= 5 ? "rgba(239,68,68,0.5)" : (matchState?.isPredicting ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.1)")
          }}
          transition={
            matchState?.isPredicting && countdown <= 5
            ? { repeat: Infinity, duration: 0.5 }
            : { duration: 0.2 }
          }
        >
          {/* Inner Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>

          <div className="flex flex-col items-center justify-center relative z-10 w-full">
            <AnimatePresence mode="wait">
              {matchState?.isPredicting ? (
                <motion.div 
                  key="predicting"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="flex flex-col items-center w-full"
                >
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 mb-8 uppercase tracking-[0.2em]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>OVER {matchState?.ballNumber}</span>
                  </div>

                  {/* Countdown Ring */}
                  <div className="relative w-32 h-32 lg:w-48 lg:h-48 mb-8 lg:mb-12 flex items-center justify-center">
                    <svg className="absolute w-full h-full rotate-[-90deg]">
                      <circle cx="50%" cy="50%" r="44%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                      <circle 
                        cx="50%" 
                        cy="50%" 
                        r="44%" 
                        stroke="currentColor" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray="280%" 
                        strokeDashoffset={`${(1 - countdown / 20) * 280}%`}
                        strokeLinecap="round" 
                        className={cn("transition-all duration-1000 ease-linear", countdown <= 5 ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]")} 
                      />
                    </svg>
                    <div className="text-center">
                      <p className={cn("text-5xl lg:text-7xl font-mono font-black leading-none tracking-tighter tabular-nums", countdown <= 5 ? "text-red-500" : "text-white")}>
                        {countdown}
                      </p>
                      <p className={cn("text-[8px] lg:text-[10px] font-bold uppercase tracking-[0.2em] mt-2", countdown <= 5 ? "text-red-400" : "text-emerald-400")}>Seconds</p>
                    </div>
                  </div>

                  <h2 className="text-xl lg:text-2xl font-bold mb-6 tracking-tight text-white">Next Ball Prediction</h2>

                  {/* Interaction Grid */}
                  <div className="grid grid-cols-2 gap-3 lg:gap-4 w-full max-w-sm">
                    {(["DOT", "SINGLE", "BOUNDARY", "WICKET"] as Outcome[]).map((outcome) => {
                      const icons = { DOT: "⚫", SINGLE: "🏃", BOUNDARY: "🔥", WICKET: "☝️" };
                      const payouts = { DOT: "1.2x", SINGLE: "1.5x", BOUNDARY: "4.0x", WICKET: "12.0x" };
                      const isSelected = prediction === outcome;
                      
                      return (
                        <motion.button
                          key={outcome}
                          whileHover={{ scale: prediction ? 1 : 1.02 }}
                          whileTap={{ scale: prediction ? 1 : 0.98 }}
                          onClick={() => handlePredict(outcome)}
                          disabled={!!prediction}
                          className={cn(
                            "group transition-all rounded-2xl p-4 lg:p-6 flex flex-col items-center gap-2",
                            isSelected 
                              ? "bg-emerald-500 border-none shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                              : "bg-white/5 border border-white/10 hover:border-emerald-400/50"
                          )}
                        >
                          <span className="text-2xl lg:text-3xl">{icons[outcome]}</span>
                          <span className={cn("font-bold uppercase tracking-widest text-xs lg:text-sm", isSelected ? "text-white" : "text-slate-300")}>{outcome}</span>
                          <span className={cn("text-[10px] lg:text-xs font-mono", isSelected ? "text-emerald-100" : "text-slate-500")}>{payouts[outcome]} Payout</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  {result ? (
                    <>
                      <h3 className="text-xl font-medium text-slate-400 mb-2 uppercase tracking-widest">Result</h3>
                      <div className={cn(
                        "text-6xl font-black italic tracking-tighter mb-8 drop-shadow-lg",
                        result === "WICKET" ? "text-red-500" :
                        result === "BOUNDARY" ? "text-yellow-400" : "text-white"
                      )}>
                        {result}
                      </div>

                      {prediction === result ? (
                        <motion.div 
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="inline-flex items-center space-x-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                        >
                          <Trophy className="w-5 h-5" />
                          <span>+250 PTS WON</span>
                        </motion.div>
                      ) : prediction ? (
                        <motion.div 
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="inline-flex items-center space-x-2 text-red-400 bg-red-500/10 border border-red-500/30 px-6 py-3 rounded-full font-bold"
                        >
                          <AlertCircle className="w-5 h-5" />
                          <span>-100 PTS LOST</span>
                        </motion.div>
                      ) : (
                         <div className="text-slate-500 text-sm italic">You didn't predict this time.</div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-6">
                        <Zap className="w-16 h-16 text-emerald-500 opacity-20" />
                        <Zap className="w-16 h-16 text-emerald-400 absolute top-0 left-0 animate-pulse drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                      </div>
                      <p className="text-slate-300 font-bold text-lg mb-2">Waiting for next delivery...</p>
                      <p className="text-slate-500 text-sm max-w-[250px]">Stay tuned. The prediction window opens right before the bowler starts their run-up.</p>
                      
                      <button 
                        onClick={() => fetch('/api/admin/next-ball', { method: 'POST' })}
                        className="mt-12 text-[10px] uppercase tracking-widest font-bold bg-white/5 border border-white/10 px-4 py-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                      >
                        (Admin: Trigger Next Ball)
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Right: Global Leaderboard */}
      <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
        <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
            Global Top 5
            <Trophy className="w-3 h-3 text-yellow-500" />
          </h3>
          
          <div className="space-y-3">
            {[
              { rank: 1, name: "Alpha_Dev", pts: "84.2k", color: "text-yellow-400" },
              { rank: 2, name: "Bowl_Out", pts: "79.1k", color: "text-slate-300" },
              { rank: 3, name: "StumpZ_", pts: "62.0k", color: "text-orange-400" },
              { rank: 4, name: "PitchMaster", pts: "55.4k", color: "text-slate-500", opacity: "opacity-80" },
              { rank: 5, name: "CricketCoder", pts: "48.9k", color: "text-slate-500", opacity: "opacity-60" }
            ].map((user) => (
              <div key={user.rank} className={`flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 ${user.opacity || ''}`}>
                <div className="flex items-center gap-3">
                  <span className={`${user.color} font-mono font-bold`}>#{user.rank}</span>
                  <span className="text-sm font-bold truncate max-w-[90px]">{user.name}</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{user.pts}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6">
             <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]"></div>
               <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1 relative z-10">Match Rewards</p>
               <p className="text-xs font-medium text-slate-300 relative z-10">Win <span className="text-emerald-400 font-bold">Premium Swag</span> if your squad wins!</p>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
