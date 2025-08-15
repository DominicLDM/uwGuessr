import React from "react";
import { User, ChevronRight } from "lucide-react";
import { Filter } from "bad-words";
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

interface NameInputProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  totalScore: number;
  timeTaken: number;
  supabaseToken: string | null;
}

const NameInput: React.FC<NameInputProps> = ({ show, onClose, onSubmit, totalScore, timeTaken, supabaseToken }) => {
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Initialize obscenity matcher
  const obscenityMatcher = React.useMemo(() => {
    return new RegExpMatcher({
      ...englishDataset.build(),
      ...englishRecommendedTransformers,
    });
  }, []);


  const filterProfanity = (inputName: string): string => {
    // bad words filter
    const filter = new Filter();
    let cleanName = filter.clean(inputName.trim());

    // Obscenity filter
    if (obscenityMatcher.hasMatch(cleanName)) {
      // Get all matches and censor them
      const matches = obscenityMatcher.getAllMatches(cleanName);
      
      // Sort matches by start index in descending order to avoid index shifting issues
      matches.sort((a, b) => b.startIndex - a.startIndex);
      
      // Replace each match with asterisks
      for (const match of matches) {
        const replacement = '*'.repeat(match.endIndex - match.startIndex);
        cleanName = cleanName.slice(0, match.startIndex) + replacement + cleanName.slice(match.endIndex);
      }
    }
    
    return cleanName;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    if (name.trim()) {
      const cleanName = filterProfanity(name);
      const nyDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const year = nyDate.getFullYear();
      const month = String(nyDate.getMonth() + 1).padStart(2, '0');
      const day = String(nyDate.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      // check that the uwGuessrDaily_today key exists in localStorage
      const localDaily = localStorage.getItem(`uwGuessrDaily_${today}`);
      if (!localDaily || localDaily === '[]') {
        setError('Your results are from a previous day or missing. Please play today\'s daily challenge before submitting.');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }

      if (!supabaseToken) {
        setError('Authentication token not ready');
        return;
      }
      
      setLoading(true);
      
      try {
        // Clamp values for safety
        const clampedScore = Math.max(0, Math.min(totalScore, 25000));
        const clampedTime = Math.max(0, Math.min(Math.floor(timeTaken / 1000), 24 * 60 * 60));
        
        // Submit via GraphQL mutation
        const mutation = `
          mutation SubmitDailyScore($date: String!, $name: String!, $score: Int!, $timeTaken: Int!, $authToken: String!) {
            submitDailyScore(date: $date, name: $name, score: $score, timeTaken: $timeTaken, authToken: $authToken) {
              id
              date
              name
              score
              time_taken
              user_id
              created_at
            }
          }
        `;

        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              date: today,
              name: cleanName,
              score: clampedScore,
              timeTaken: clampedTime,
              authToken: supabaseToken
            }
          })
        });

        const result = await response.json();
        
        if (result.errors) {
          console.error('GraphQL errors:', result.errors);
          throw new Error(result.errors[0]?.message || 'Failed to submit score');
        }
        
        if (!result.data?.submitDailyScore) {
          throw new Error('No data returned from submission');
        }
        
        // Mark today's submission so Results page can detect that a name was submitted
        try {
          localStorage.setItem(`uwGuessrDailySubmitted_${today}`, 'true');
        } catch (storageError) {
          console.warn('Could not save to localStorage:', storageError);
        }
        
        setLoading(false);
        onSubmit(cleanName);
        
      } catch (err: unknown) {
        console.error('Submit error:', err);
        if (typeof err === 'object' && err !== null && 'message' in err) {
          setError((err as { message?: string }).message || 'Failed to submit score');
        } else {
          setError('Failed to submit score');
        }
        setLoading(false);
      }
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
          aria-label="Close name input"
        >
          ✕
        </button>

        <div className="flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-4 md:mb-5">
            <User size={24} className="text-yellow-600 mx-auto mb-2 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
            <h2 className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-black mb-1">You made it out the KW!</h2>
            <p className="text-sm sm:text-sm md:text-base text-gray-600">Enter your username to join the leaderboard</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-600 text-sm mb-2 font-semibold text-center bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}

          {/* Show loading spinner if token not ready */}
          {!supabaseToken && (
            <div className="flex items-center justify-center mb-2">
              <span className="loader w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mr-2"></span>
              <span className="text-yellow-600 text-sm">Verifying player...</span>
            </div>
          )}

          {/* Name Input Form */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pr-12 pl-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-300 focus:border-yellow-400 focus:outline-none text-black font-medium text-center text-base"
                placeholder="Enter your username"
                autoFocus
                maxLength={20}
                aria-label="Enter your username"
                disabled={loading || !supabaseToken}
              />
              {name.trim() && (
                <button
                  type="submit"
                  aria-label="Submit username"
                  className="group absolute inset-y-0 right-2 my-auto h-9 w-9 rounded-md bg-yellow-400 hover:bg-yellow-500 border-2 border-black flex items-center justify-center text-black shadow transition-colors cursor-pointer overflow-hidden"
                  disabled={loading || !supabaseToken}
                >
                  {loading ? (
                    <span className="loader w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NameInput;