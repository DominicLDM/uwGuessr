import React from "react";
import { Trophy } from "lucide-react";

interface LeaderboardModalProps {
  show: boolean;
  onClose: () => void;
  totalScore: number;
}

export default function LeaderboardModal({ show, onClose, totalScore }: LeaderboardModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl border-4 border-black shadow-2xl max-w-sm sm:max-w-sm md:max-w-md lg:max-w-lg w-full mx-4 p-4 sm:p-5 md:p-6 lg:p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 cursor-pointer rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-lg text-black font-bold"
          aria-label="Close leaderboard"
        >
          ✕
        </button>

        <div className="flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-4 md:mb-5">
            <Trophy size={24} className="text-yellow-600 mx-auto mb-2 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
            <h2 className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-black mb-1">Daily Challenge #428</h2>
          </div>

          {/* Leaderboard Table */}
          <div className="w-full mb-4 sm:mb-4 md:mb-5">
            <div className="grid grid-cols-3 gap-3 sm:gap-3 md:gap-4 mb-2 sm:mb-2 md:mb-3 text-sm sm:text-sm md:text-base font-bold text-gray-600 border-b-2 border-gray-200 pb-2">
              <div>Player</div>
              <div className="text-center">Time</div>
              <div className="text-right">Score</div>
            </div>
            <div className="space-y-1 sm:space-y-1 md:space-y-1">
              <div className="grid grid-cols-3 gap-3 sm:gap-3 md:gap-4 py-2 sm:py-2 md:py-3 items-center bg-yellow-100 rounded-xl px-3 sm:px-3 md:px-4 border-2 border-yellow-300">
                <div className="font-bold text-black text-sm sm:text-base md:text-lg">🥇 Alice</div>
                <div className="text-center text-xs sm:text-sm md:text-base">2:07</div>
                <div className="text-right font-bold text-xs sm:text-sm md:text-base">25k</div>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-3 md:gap-4 py-2 sm:py-2 md:py-3 items-center bg-gray-50 rounded-xl px-3 sm:px-3 md:px-4 border border-gray-200">
                <div className="font-bold text-black text-sm sm:text-base md:text-lg">🥈 Bob</div>
                <div className="text-center text-xs sm:text-sm md:text-base">3:12</div>
                <div className="text-right font-bold text-xs sm:text-sm md:text-base">23k</div>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-3 md:gap-4 py-2 sm:py-2 md:py-3 items-center bg-orange-50 rounded-xl px-3 sm:px-3 md:px-4 border border-orange-200">
                <div className="font-bold text-black text-sm sm:text-base md:text-lg">🥉 Charlie</div>
                <div className="text-center text-xs sm:text-sm md:text-base">4:18</div>
                <div className="text-right font-bold text-xs sm:text-sm md:text-base">22k</div>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-3 md:gap-4 py-1 sm:py-1 md:py-2 items-center px-3 sm:px-3 md:px-4">
                <div className="text-black text-sm sm:text-base md:text-lg">4. Dana</div>
                <div className="text-center text-xs sm:text-sm md:text-base text-gray-600">5:23</div>
                <div className="text-right text-xs sm:text-sm md:text-base">21k</div>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-3 md:gap-4 py-1 sm:py-1 md:py-2 items-center bg-yellow-50 rounded-xl px-3 sm:px-3 md:px-4 border-2 border-yellow-200">
                <div className="font-bold text-black text-sm sm:text-base md:text-lg">5. You</div>
                <div className="text-center text-xs sm:text-sm md:text-base">6:28</div>
                <div className="text-right font-bold text-xs sm:text-sm md:text-base text-yellow-600">{Math.round(totalScore/1000)}k</div>
              </div>
              {/* Average row */}
              <div className="grid grid-cols-3 gap-3 sm:gap-3 md:gap-4 py-1 sm:py-1 md:py-2 lg:py-3 items-center border-t-2 border-black mt-2 sm:mt-2 md:mt-3 pt-2 sm:pt-2 md:pt-3 px-3 sm:px-3 md:px-4">
                <div className="font-bold text-black text-sm sm:text-base md:text-lg">Avg:</div>
                <div className="text-center text-xs sm:text-sm md:text-base font-medium">8:07</div>
                <div className="text-right text-xs sm:text-sm md:text-base font-bold">18k</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="text-center text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-3 md:mb-4 lg:mb-5">
            You placed higher than <span className="font-bold text-black">91%</span> of players
          </div>

          {/* Name Input with Submit */}
          <div className="w-full flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 sm:px-3 md:px-4 py-2 sm:py-2 md:py-3 rounded-xl bg-gray-50 border-2 border-gray-300 focus:border-yellow-400 focus:outline-none text-black font-medium text-center text-sm sm:text-sm md:text-base"
              placeholder="Enter your name"
            />
            <button className="group px-6 py-3 bg-yellow-400 hover:bg-yellow-500 rounded-2xl font-bold text-black border-4 border-black transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer">
              <span className="text-lg">Submit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
