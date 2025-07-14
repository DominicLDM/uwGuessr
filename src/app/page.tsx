export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-8">
      <div className="text-center max-w-md mx-auto">
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            <span className="text-yellow-500">uw</span>Guessr
          </h1>
          <div className="w-16 h-1 bg-yellow-500 mx-auto rounded-full"></div>
        </div>

        {/* Building Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white dark:bg-gray-700 rounded-full shadow-lg">
            <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.84L18 11v7h-2v-6H8v6H6v-7l6-5.16z"/>
            </svg>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">
            Under Construction
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {"We're working hard to bring something amazing to the 'Loo. Check back soon for updates!"}
          </p>
        </div>

        {/* Hardcoded Progress indicator */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-yellow-500 h-2 rounded-full animate-pulse" style={{ width: '45%' }}></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Coming Soon
          </p>
        </div>

        {/* Footer */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          © 2025 uwGuessr. All rights reserved.
        </div>
      </div>
    </div>
  );
}