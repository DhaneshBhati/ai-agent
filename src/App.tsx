/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import PredictionEngine from './components/PredictionCard';

export default function App() {
  return (
    <div className="min-h-screen bg-[#050B18] text-slate-100 font-sans overflow-x-hidden relative select-none flex flex-col">
      {/* Mesh Gradient Backgrounds */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 w-full flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-[1400px] mx-auto min-h-screen">
        {/* Header Section */}
        <header className="flex flex-wrap items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white italic">PITCH<span className="text-emerald-400">PULSE</span></h1>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            <div className="text-center md:text-right">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Match Live</p>
              <p className="text-lg font-mono font-bold">IND <span className="text-emerald-400">182/4</span> <span className="text-slate-400 text-sm font-normal">(18.4)</span></p>
            </div>
            <div className="h-10 w-px bg-white/10 hidden md:block"></div>
            <div className="flex flex-col items-end">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Pulse Points</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-yellow-400 font-mono">14,250</span>
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </header>

        <PredictionEngine />

        {/* Bottom Bar / Ticker */}
        <footer className="mt-auto h-12 bg-white/5 backdrop-blur-md rounded-xl flex items-center px-4 md:px-6 border border-white/10 shrink-0">
          <div className="flex items-center gap-2 md:gap-4 text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-emerald-400 flex-shrink-0">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Connected
            </span>
            <div className="w-px h-4 bg-white/10 hidden md:block"></div>
            <span className="text-slate-400 hidden md:block">Latency: 42ms</span>
          </div>
          <div className="ml-auto flex items-center gap-6 overflow-hidden md:pl-8">
             <div className="flex gap-8 animate-pulse opacity-70 whitespace-nowrap">
               <span className="text-[9px] md:text-[11px] text-slate-500 italic tracking-tighter">PREVIOUS BALL: <span className="text-white font-bold">BOUNDARY (4 RUNS)</span></span>
               <span className="text-[9px] md:text-[11px] text-slate-500 italic tracking-tighter hidden md:inline">PROBABILITY: <span className="text-white font-bold">WICKET 4.2%</span></span>
             </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
