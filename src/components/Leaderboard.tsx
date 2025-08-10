import React from "react";
import { Trophy, } from "lucide-react";
import { useQuery, gql } from '@apollo/client';

const ALL_SCORES_QUERY = gql`
  query AllScores($day: String!) {
    allScores(day: $day) {
      uid
      name
      score
      timetaken
    }
  }
`;

interface LeaderboardModalProps {
  show: boolean;
  onClose: () => void;
}

interface ScoreData {
  uid: string;
  name: string;
  score: number;
  timetaken: number;
}

export default function LeaderboardModal({ 
  show, 
  onClose,
}: LeaderboardModalProps) {

  // Get EDT-localized date
  const nyDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = nyDate.getFullYear();
  const month = String(nyDate.getMonth() + 1).padStart(2, '0');
  const day = String(nyDate.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  // Calculate daily challenge number based on EDT
  const startDate = new Date(Date.UTC(2025, 7, 10)); // August is 7 (0-indexed)
  // Get EDT date as UTC midnight
  const edtDate = new Date(Date.UTC(year, nyDate.getMonth(), nyDate.getDate()));
  const diffTime = edtDate.getTime() - startDate.getTime();
  const dailyNumber = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const { data, loading, error, refetch } = useQuery(ALL_SCORES_QUERY, {
    variables: { day: today },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first'
  });

  // Refetch
  React.useEffect(() => {
    if (show) {
      refetch({ day: today }).catch(() => {});
    }
  }, [show, refetch, today]);

  // Countdown to next midnight in EDT and refresh on rollover
  const [countdown, setCountdown] = React.useState<string>("");
  React.useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => {
      const nowNY = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const nextNY = new Date(nowNY);
      nextNY.setDate(nowNY.getDate() + 1);
      nextNY.setHours(0, 0, 0, 0);
      const diffMs = nextNY.getTime() - nowNY.getTime();
      if (diffMs <= 0) {
        // Day changed in EDT; refetch for new day
        const nyDateFresh = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const y = nyDateFresh.getFullYear();
        const m = String(nyDateFresh.getMonth() + 1).padStart(2, '0');
        const d = String(nyDateFresh.getDate()).padStart(2, '0');
        refetch({ day: `${y}-${m}-${d}` }).catch(() => {});
      }
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const ss = String(totalSeconds % 60).padStart(2, '0');
      setCountdown(`${hh}:${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [show, refetch]);

  const formatTime = (seconds: number): string => {
    return `${seconds}s`;
  };

  // Process the data
  const processedData = React.useMemo(() => {
    if (!data?.allScores) return null;

    const scores: ScoreData[] = [...data.allScores];
    
    // Sort by score descending, then by time ascending (faster time breaks ties)
    scores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timetaken - b.timetaken;
    });

    // Get top 5
    const top5 = scores.slice(0, 5);

    // Calculate average score and time
    const totalPlayers = scores.length;
    const avgScore = totalPlayers > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / totalPlayers) : 0;
    const avgTime = totalPlayers > 0 ? Math.round(scores.reduce((sum, s) => sum + s.timetaken, 0) / totalPlayers) : 0;

    return {
      top5,
      totalPlayers,
      avgScore,
      avgTime
    };
  }, [data]);

  const getRankTextColor = (rank: number): string => {
    switch (rank) {
      case 1: return "text-yellow-600"; // Gold
      case 2: return "text-gray-600";   // Silver
      case 3: return "text-[#cd7f32]"; // Bronze (deeper copper tone)
      default: return "text-black";
    }
  };

  const getRankStyle = (rank: number): string => {
    switch (rank) {
      case 1: return "bg-yellow-100 border-yellow-300";
      case 2: return "bg-gray-50 border-gray-200";
      case 3: return "bg-orange-50 border-orange-200";
      default: return "border-gray-100";
    }
  };

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
          className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 cursor-pointer rounded-full hover:text-yellow-500 flex items-center justify-center transition-colors text-sm sm:text-base md:text-lg"
          aria-label="Close leaderboard"
        >
          ✕
        </button>

        <div className="flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-4 md:mb-5">
            <Trophy size={24} className="text-yellow-500 mx-auto mb-2 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
            <h2 className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-black mb-1">Daily Challenge #{dailyNumber}</h2>
          </div>

          {/* Error State */}
          {error && (
            <div className="text-center text-red-600 mb-4">
              Failed to load leaderboard data. Please try again.
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="w-full mb-4 sm:mb-4 md:mb-5">
            <div className="grid grid-cols-[1fr_72px_120px] gap-2 md:gap-3 mb-2 sm:mb-2 md:mb-3 text-sm sm:text-sm md:text-base font-bold text-gray-600 border-b-2 border-gray-200 pb-2 px-3 sm:px-3 md:px-4">
              <div>Player</div>
              <div className="text-right">Time</div>
              <div className="text-right">Score</div>
            </div>
            <div className="space-y-0.5 sm:space-y-0.5 md:space-y-1">
              {loading ? (
                <>
                  {/* Loading */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`grid grid-cols-3 gap-3 sm:gap-3 md:gap-4 py-2 sm:py-2 md:py-3 items-center rounded-xl px-3 sm:px-3 md:px-4 border-2 ${getRankStyle(i)}`}>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="text-center">
                        <div className="w-8 h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
                      </div>
                      <div className="text-right">
                        <div className="w-8 h-4 bg-gray-200 rounded animate-pulse ml-auto"></div>
                      </div>
                    </div>
                  ))}
                  {/* Loading user row */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-3 md:gap-4 py-1 sm:py-1 md:py-2 items-center px-3 sm:px-3 md:px-4">
                    <div className="text-black text-sm sm:text-base md:text-lg">
                      <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="text-center text-xs sm:text-sm md:text-base">
                      <div className="w-8 h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </div>
                    <div className="text-right text-xs sm:text-sm md:text-base">
                      <div className="w-8 h-4 bg-gray-200 rounded animate-pulse ml-auto"></div>
                    </div>
                  </div>
                  {/* Loading average row */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-3 md:gap-4 py-1 sm:py-1 md:py-2 lg:py-3 items-center border-t-2 border-black mt-2 sm:mt-2 md:mt-3 pt-2 sm:pt-2 md:pt-3 px-3 sm:px-3 md:px-4">
                    <div className="font-bold text-black text-sm sm:text-base md:text-lg">Avg:</div>
                    <div className="text-center">
                      <div className="w-8 h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
                    </div>
                    <div className="text-right">
                      <div className="w-8 h-4 bg-gray-200 rounded animate-pulse ml-auto"></div>
                    </div>
                  </div>
                </>
              ) : processedData ? (
                <>
                  {/* Top 5 players */}
                  {processedData.top5.map((player, index) => {
                    const rank = index + 1;
                    const textColor = getRankTextColor(rank);
                    return (
                      <div key={player.uid} className="grid grid-cols-[1fr_72px_120px] gap-2 md:gap-3 py-2 sm:py-2 md:py-2.5 items-center px-3 sm:px-3 md:px-4">
                        <div className={`font-bold text-sm sm:text-base md:text-lg ${textColor}`}>
                          {rank}. {player.name}
                        </div>
                        <div className="text-right justify-self-end text-xs sm:text-sm md:text-base font-sans tabular-nums">
                          {formatTime(player.timetaken)}
                        </div>
                        <div className="text-right justify-self-end font-bold text-xs sm:text-sm md:text-base font-sans tabular-nums">
                          {player.score.toLocaleString('en-US')}
                        </div>
                      </div>
                    );
                  })}

                  <div className="border-t-2 border-black my-2" />
                  {/* Average row */}
                  <div className="grid grid-cols-[1fr_72px_120px] gap-2 md:gap-3 py-1 sm:py-1 md:py-2 lg:py-3 items-center px-3 sm:px-3 md:px-4">
                    <div className="font-bold text-black text-sm sm:text-base md:text-lg">Avg:</div>
                    <div className="text-right justify-self-end text-xs sm:text-sm md:text-base font-medium font-sans tabular-nums">
                      {formatTime(processedData.avgTime)}
                    </div>
                    <div className="text-right justify-self-end text-xs sm:text-sm md:text-base font-bold font-sans tabular-nums">
                      {processedData.avgScore.toLocaleString('en-US')}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Leaderboard count */}
          <div className="text-center text-xs sm:text-sm md:text-base text-gray-600 mb-2">
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <span>Loading leaderboard</span>
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : processedData ? (
              <span className="text-xs text-gray-500">
                {processedData.totalPlayers} {processedData.totalPlayers === 1 ? 'person' : 'people'} on the leaderboard today!
              </span>
            ) : (
              <span>Unable to load leaderboard</span>
            )}
          </div>
          {/* Countdown to midnight EDT */}
          <div className="text-center text-[11px] sm:text-xs text-gray-500">New Daily in {countdown}</div>
        </div>
      </div>
    </div>
  );
}