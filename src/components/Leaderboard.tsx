import React from "react";
import { Trophy, Link } from "lucide-react";
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
  leaderboardData
}: LeaderboardModalProps & { leaderboardData?: Array<{ uid: string; name: string; rounds: Array<{ score: number; timetaken: number }>; totalScore: number }> }) {

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

  const { data, loading: gqlLoading, error, refetch } = useQuery(ALL_SCORES_QUERY, {
    variables: { day: today },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first'
  });
  const [minLoading, setMinLoading] = React.useState(true);
  React.useEffect(() => {
    if (!show) return;
    setMinLoading(true);
    const timer = setTimeout(() => setMinLoading(false), 700);
    return () => clearTimeout(timer);
  }, [show, today]);
  const loading = gqlLoading || minLoading;

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

  // Share button logic
  const [shareStatus, setShareStatus] = React.useState<string>("");
  const handleShare = React.useCallback(() => {
    if (!leaderboardData || leaderboardData.length === 0) return;
    const localPlayer = leaderboardData.find((p) => p.uid === 'local-player');
    if (!localPlayer) return;
    // Emoji mapping for round scores
    const getEmoji = (score: number) => {
      if (score >= 4000) return '🟩';
      if (score >= 1000) return '🟨';
      return '🟥';
    };
    // Show emoji and score for each round, each on a new line
    const roundEmojis = localPlayer.rounds
      ? localPlayer.rounds.map((r) => `${getEmoji(r.score)} ${r.score}`).join('\n')
      : '';
    const totalScore = localPlayer.totalScore || 0;
    const text = `uwGuessr #${dailyNumber} ${totalScore}/25000\n${roundEmojis}\nPlay: https://uwguessr.com`;
    navigator.clipboard.writeText(text).then(() => {
      setShareStatus("Copied!");
      setTimeout(() => setShareStatus(""), 1000);
    }, () => {
      setShareStatus("Failed to copy");
      setTimeout(() => setShareStatus(""), 1000);
    });
  }, [leaderboardData, dailyNumber]);

  const getRankTextColor = (rank: number): string => {
    switch (rank) {
      case 1: return "text-yellow-600"; // Gold
      case 2: return "text-gray-600";   // Silver
      case 3: return "text-[#cd7f32]"; // Bronze 
      default: return "text-black";
    }
  };

  // Get local user info for today's daily
  const localUserKey = `uwGuessrDailyUser_${today}`;
  const [localUser, setLocalUser] = React.useState<{ name: string } | null>(null);
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(localUserKey);
      console.log("Stored local user:", stored);
      if (stored) {
        setLocalUser(JSON.parse(stored));
      } else {
        setLocalUser(null);
      }
    } catch {
      setLocalUser(null);
    }
  }, [localUserKey, show]);

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
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="grid grid-cols-[1fr_56px_80px] gap-2 md:gap-3 py-2 sm:py-2 md:py-2.5 items-center px-2 sm:px-3 md:px-4">
                      <div className={`font-bold text-sm sm:text-base md:text-lg ${getRankTextColor(i)}`}>
                        {i}. <span className="inline-block align-middle h-3 w-16 sm:h-4 sm:w-24 bg-gray-200 rounded blur-[1px]" />
                      </div>
                      <div className="text-right justify-self-end text-xs sm:text-sm md:text-base font-sans tabular-nums">
                        <span className="inline-block h-3 w-8 sm:h-4 sm:w-10 bg-gray-200 rounded blur-[1px]" />
                      </div>
                      <div className="text-right justify-self-end font-bold text-xs sm:text-sm md:text-base font-sans tabular-nums">
                        <span className="inline-block h-3 w-12 sm:h-4 sm:w-16 bg-gray-200 rounded blur-[1px]" />
                      </div>
                    </div>
                  ))}
                  <div className="border-t-2 border-black my-2" />
                  <div className="grid grid-cols-[1fr_72px_120px] gap-2 md:gap-3 py-1 sm:py-1 md:py-2 lg:py-3 items-center px-3 sm:px-3 md:px-4">
                    <div className="font-bold text-black text-sm sm:text-base md:text-lg">Avg:</div>
                    <div className="text-right justify-self-end text-xs sm:text-sm md:text-base font-medium font-sans tabular-nums">
                      <span className="inline-block h-4 w-10 bg-gray-200 rounded blur-[1px]" />
                    </div>
                    <div className="text-right justify-self-end text-xs sm:text-sm md:text-base font-bold font-sans tabular-nums">
                      <span className="inline-block h-4 w-16 bg-gray-200 rounded blur-[1px]" />
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

          {/* Leaderboard count or user position */}
          <div className="text-center text-xs sm:text-sm md:text-base text-gray-600 mb-2">
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <span>Loading leaderboard</span>
              </div>
            ) : processedData ? (
              localUser ? (() => {
                // Find user position by matching score and timetaken
                const allScores: ScoreData[] = [...(data?.allScores ?? [])];
                allScores.sort((a, b) => {
                  if (b.score !== a.score) return b.score - a.score;
                  return a.timetaken - b.timetaken;
                });
                // Get local user's total score and time from leaderboardData prop
                let userScore = null;
                let userTime = null;
                if (leaderboardData && leaderboardData.length > 0) {
                  userScore = leaderboardData[0].totalScore;
                  // Local time to s
                  userTime = Math.round(leaderboardData[0].rounds.reduce((sum, r) => sum + r.timetaken, 0) / 1000);
                }
                let userIdx = -1;
                if (userScore !== null && userTime !== null) {
                  userIdx = allScores.findIndex(p => p.score === userScore && p.timetaken === userTime);
                }
                if (userIdx !== -1) {
                  return (
                    <span className="text-s text-gray-600">
                      You placed #{userIdx + 1}/{processedData.totalPlayers} today!
                    </span>
                  );
                }
                // fallback to normal count if not found
                return (
                  <span className="text-s text-gray-600">
                    {processedData.totalPlayers} {processedData.totalPlayers === 1 ? 'person' : 'people'} on the leaderboard today!
                  </span>
                );
              })() : (
                <span className="text-s text-gray-600">
                  {processedData.totalPlayers} {processedData.totalPlayers === 1 ? 'person' : 'people'} on the leaderboard today!
                </span>
              )
            ) : (
              <span>Unable to load leaderboard</span>
            )}
          </div>
          {/* Countdown to midnight EDT */}
          <div className="text-center text-[12px] sm:text-s text-gray-600">New Daily in {countdown}</div>
          {/* Share button bottom right */}
          <button
            onClick={handleShare}
            className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-lg shadow-lg flex items-center gap-1 sm:gap-2 transition-colors cursor-pointer text-xs sm:text-base"
            style={{zIndex: 10}}
            aria-label="Share leaderboard"
          >
            <span>Share</span>
            <Link size={15} className="text-black sm:w-[22px] sm:h-[22px] w-[15px] h-[15px]" />
          </button>
          {shareStatus && (
            <div className="absolute bottom-16 right-3 bg-black text-white text-xs rounded px-2 py-1 shadow-lg">{shareStatus}</div>
          )}
        </div>
      </div>
    </div>
  );
}