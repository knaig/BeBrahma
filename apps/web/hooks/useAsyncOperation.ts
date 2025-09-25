import { useState, useCallback, useRef } from 'react';

interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

interface AsyncOperationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

export function useAsyncOperation<T = any>(
  operation: (...args: any[]) => Promise<T>,
  options: AsyncOperationOptions = {}
) {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const retryCountRef = useRef(0);
  const { retryCount = 3, retryDelay = 1000, onSuccess, onError } = options;

  const execute = useCallback(
    async (...args: any[]) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const result = await operation(...args);
        
        setState({
          data: result,
          loading: false,
          error: null,
          lastUpdated: new Date()
        });

        retryCountRef.current = 0;
        onSuccess?.(result);
        
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorObj,
          lastUpdated: new Date()
        }));

        onError?.(errorObj);
        throw errorObj;
      }
    },
    [operation, onSuccess, onError]
  );

  const retry = useCallback(async () => {
    if (retryCountRef.current < retryCount) {
      retryCountRef.current++;
      
      // Exponential backoff
      const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);
      
      setTimeout(() => {
        execute();
      }, delay);
    }
  }, [execute, retryCount, retryDelay]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null
    });
    retryCountRef.current = 0;
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    execute,
    retry,
    reset,
    clearError,
    canRetry: retryCountRef.current < retryCount
  };
}
