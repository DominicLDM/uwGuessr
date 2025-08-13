import React from "react";
import { User, ChevronRight } from "lucide-react";
import { Filter } from "bad-words";
import { useMutation, gql } from '@apollo/client';

const ADD_SCORE = gql`
  mutation AddScore($date: String!, $name: String!, $score: Int!, $time_taken: Int!) {
    addDailyScore(date: $date, name: $name, score: $score, time_taken: $time_taken) {
      id
      date
      name
      score
      time_taken
      created_at
    }
  }
`;


interface NameInputProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  totalScore: number;
  timeTaken: number;
}

export default function NameInput({ show, onClose, onSubmit, totalScore, timeTaken }: NameInputProps) {
  const [name, setName] = React.useState("");
  const [addScore] = useMutation(ADD_SCORE);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    const filter = new Filter();
    e.preventDefault();
    if (name.trim()) {
      const cleanName = filter.clean(name.trim());
      const nyDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const year = nyDate.getFullYear();
      const month = String(nyDate.getMonth() + 1).padStart(2, '0');
      const day = String(nyDate.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      // Submit score to Supabase
      await addScore({
        variables: {
          date: date,
          name: cleanName,
          score: totalScore,
          time_taken: Math.floor(timeTaken / 1000)
        }
      });
      // Mark today's submission so Results page can detect that a name was submitted
      try {
        localStorage.setItem(`uwGuessrDailySubmitted_${date}`, 'true');
      } catch {}
      onSubmit(cleanName);
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
              />
              {name.trim() && (
                <button
                  type="submit"
                  aria-label="Submit username"
                  className="group absolute inset-y-0 right-2 my-auto h-9 w-9 rounded-md bg-yellow-400 hover:bg-yellow-500 border-2 border-black flex items-center justify-center text-black shadow transition-colors cursor-pointer overflow-hidden"
                >
                  <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
