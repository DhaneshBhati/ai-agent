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
        <PredictionEngine />
      </div>
    </div>
  );
}
