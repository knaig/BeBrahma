'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { founderOSAPI } from '@/lib/founderOS/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, FileText, CheckSquare } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface GlobalSearchProps {
  placeholder?: string;
  autoFocus?: boolean;
}

export default function GlobalSearch({ placeholder = "Search artifacts, decisions, tasks...", autoFocus = false }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
      loadSuggestions(debouncedQuery);
    } else {
      setResults(null);
      setSuggestions(null);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await founderOSAPI.search.search(searchQuery, { limit: 10 });
      if (response.success && response.data) {
        setResults(response.data);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async (searchQuery: string) => {
    try {
      const response = await founderOSAPI.search.suggest(searchQuery);
      if (response.success && response.data) {
        setSuggestions(response.data);
      }
    } catch (error) {
      console.error('Suggestions error:', error);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 font-medium">{part}</mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (results || suggestions) && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto z-50">
          {/* Suggestions */}
          {suggestions && (suggestions.suggestions.length > 0 || suggestions.tags.length > 0) && (
            <div className="p-3 border-b">
              <p className="text-xs font-medium text-gray-500 mb-2">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.suggestions.map((sug: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setQuery(sug.text)}
                    className="px-2 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    {sug.text}
                  </button>
                ))}
                {suggestions.tags.map((tag: any, index: number) => (
                  <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => setQuery(tag.text)}>
                    #{tag.text}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Artifact Results */}
          {results && results.artifacts && results.artifacts.length > 0 && (
            <div className="p-3 border-b">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Artifacts ({results.artifacts.length})
              </p>
              <div className="space-y-2">
                {results.artifacts.map((artifact: any) => (
                  <Link
                    key={artifact.id}
                    href={`/founder-os/artifacts/${artifact.id}`}
                    onClick={() => setIsOpen(false)}
                    className="block p-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {highlightMatch(artifact.title, query)}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {highlightMatch(artifact.snippet, query)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {artifact.type}
                          </Badge>
                          {artifact.tags.slice(0, 2).map((tag: string) => (
                            <span key={tag} className="text-xs text-gray-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Task Results */}
          {results && results.tasks && results.tasks.length > 0 && (
            <div className="p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Tasks ({results.tasks.length})
              </p>
              <div className="space-y-2">
                {results.tasks.map((task: any) => (
                  <Link
                    key={task.id}
                    href={`/projects/${task.project.id}?task=${task.id}`}
                    onClick={() => setIsOpen(false)}
                    className="block p-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <CheckSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {highlightMatch(task.title, query)}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-600 line-clamp-1 mt-1">
                            {highlightMatch(task.description, query)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {task.project.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {results && results.total === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
