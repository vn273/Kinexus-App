import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, User, Sparkles, ExternalLink, AlertCircle, Briefcase } from 'lucide-react';
import { useContacts } from '../contexts/ContactContext';
import { useAuth } from '../contexts/AuthContext';
import { intelligentSearch, intelligentLeadSearch, EXAMPLE_AI_QUERIES, EXAMPLE_LEAD_QUERIES } from '../services/intelligentSearchService';
import { isGeminiAvailable } from '../services/geminiService';
import { getUsageStats } from '../services/usageTrackingService';

/**
 * AIAssistant - A flexible AI chat component for contacts or leads
 * @param {Object} props
 * @param {string} props.dataSource - 'contacts' | 'leads' | 'network' (default: 'contacts')
 * @param {Array} props.data - Optional external data to search (for leads or custom datasets)
 * @param {string} props.title - Optional custom title
 * @param {string} props.placeholder - Optional custom placeholder
 */
const AIAssistant = ({ 
  dataSource = 'contacts', 
  data = null,
  title = null,
  placeholder = null 
}) => {
  const { contacts } = useContacts();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  
  const geminiAvailable = isGeminiAvailable();
  const usageStats = currentUser ? getUsageStats(currentUser.uid) : null;
  
  // Determine which examples and search function to use
  const isLeadMode = dataSource === 'leads';
  const exampleQueries = isLeadMode ? EXAMPLE_LEAD_QUERIES : EXAMPLE_AI_QUERIES;
  const searchData = data || contacts;
  
  // Dynamic text based on mode
  const displayTitle = title || (isLeadMode ? 'AI Lead Assistant' : 'AI Network Assistant');
  const displayPlaceholder = placeholder || (isLeadMode ? 'Ask about your leads...' : 'Ask about your network...');
  const analyzeText = isLeadMode ? 'Analyzing your leads...' : 'Analyzing your network...';
  const descriptionText = isLeadMode 
    ? 'Ask me about your networking leads! I can help you prioritize follow-ups, identify high-potential leads, and suggest outreach strategies.'
    : 'Ask me about your network! I can help you find the right people to reach out to, analyze your connections, and suggest networking strategies.';
  const noResultsText = isLeadMode ? 'No leads found matching your search.' : 'No contacts found matching your search.';
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Use appropriate search function based on data source
      const searchResult = isLeadMode
        ? await intelligentLeadSearch(query, searchData, currentUser?.uid)
        : await intelligentSearch(query, searchData, currentUser?.uid);
      setResult(searchResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExampleClick = (example) => {
    setQuery(example);
    inputRef.current?.focus();
  };
  
  const resetChat = () => {
    setQuery('');
    setResult(null);
    setError(null);
  };
  
  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-105 z-40"
        title="Ask AI"
      >
        <MessageSquare size={24} />
      </button>
      
      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="text-purple-600" size={24} />
                <h2 className="text-lg font-semibold text-gray-900">AI Network Assistant</h2>
                {!geminiAvailable && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                    API Key Required
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!result && !error && (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Ask me about your network! I can help you find the right people to reach out to,
                    analyze your connections, and suggest networking strategies.
                  </p>
                  
                  {/* Example Queries */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Example queries:</p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_AI_QUERIES.slice(0, 4).map((example, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExampleClick(example)}
                          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* API Status */}
                  {!geminiAvailable && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="text-yellow-600 mt-0.5" size={18} />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Gemini API not configured</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Add your Gemini API key to <code className="bg-yellow-100 px-1 rounded">VITE_GEMINI_API_KEY</code> in your environment variables to enable AI features.
                          </p>
                          <a 
                            href="https://makersuite.google.com/app/apikey" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-yellow-800 underline mt-2 inline-flex items-center gap-1"
                          >
                            Get a free API key <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-purple-600" size={32} />
                  <span className="ml-3 text-gray-600">{analyzeText}</span>
                </div>
              )}
              
              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-red-600 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                  <button
                    onClick={resetChat}
                    className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Try again
                  </button>
                </div>
              )}
              
              {/* Results */}
              {result && (
                <div className="space-y-4">
                  {/* Source indicator */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded ${
                      result.source === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {result.source === 'ai' ? '✨ AI Response' : '🔍 Search Results'}
                    </span>
                    {result.message && <span>{result.message}</span>}
                  </div>
                  
                  {/* AI Recommendations */}
                  {result.source === 'ai' && result.recommendations && (
                    <div className="space-y-3">
                      {result.recommendations.map((rec, idx) => (
                        <div 
                          key={idx}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                rec.priority === 'high' ? 'bg-green-100 text-green-700' :
                                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{rec.name}</p>
                                <p className="text-sm text-gray-600">
                                  {isLeadMode ? rec.firm : rec.company} - {rec.title}
                                </p>
                              </div>
                            </div>
                            {(rec.contact || rec.lead) && (
                              <button
                                onClick={() => {/* Navigate to contact/lead */}}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                View <ExternalLink size={12} />
                              </button>
                            )}
                          </div>
                          <div className="mt-2 ml-8 space-y-1">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Why:</span> {rec.reason}
                            </p>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Action:</span> {rec.action}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Raw AI Response (fallback) */}
                  {result.source === 'ai' && !result.recommendations && result.rawResponse && (
                    <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-700">
                      {result.rawResponse}
                    </div>
                  )}
                  
                  {/* Algorithm Results */}
                  {result.source === 'algorithm' && result.results && (
                    <div className="space-y-2">
                      {result.results.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">{noResultsText}</p>
                      ) : (
                        result.results.slice(0, 10).map(item => (
                          <div 
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isLeadMode ? (
                                <Briefcase size={16} className="text-gray-400" />
                              ) : (
                                <User size={16} className="text-gray-400" />
                              )}
                              <div>
                                <p className="font-medium text-gray-900">
                                  {item.firstName} {item.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {isLeadMode 
                                    ? `${item.title || ''} ${item.firm ? `@ ${item.firm}` : ''}`.trim()
                                    : `${item.jobTitle || item.role || ''} ${item.company ? `@ ${item.company}` : ''}`.trim()
                                  }
                                </p>
                              </div>
                            </div>
                            {isLeadMode && item.status && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                item.status === 'Follow-up Needed' ? 'bg-yellow-100 text-yellow-700' :
                                item.status === 'Pending Response' ? 'bg-blue-100 text-blue-700' :
                                item.status === 'Call Scheduled' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {item.status}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                      {result.results.length > 10 && (
                        <p className="text-sm text-gray-500 text-center">
                          +{result.results.length - 10} more results
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Ask Another */}
                  <button
                    onClick={resetChat}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    ← Ask another question
                  </button>
                </div>
              )}
            </div>
            
            {/* Footer - Input */}
            <div className="border-t px-6 py-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={displayPlaceholder}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Send size={18} />
                      Ask
                    </>
                  )}
                </button>
              </form>
              
              {/* Usage Stats */}
              {usageStats && geminiAvailable && (
                <p className="text-xs text-gray-400 mt-2 text-right">
                  AI Usage Today: {usageStats.queries} queries, ${usageStats.estimatedCost}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
