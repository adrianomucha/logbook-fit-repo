import { useState, useEffect, useRef } from 'react';

interface UseAutoSaveOptions {
  delay?: number;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}

/**
 * Hook for auto-saving data with debouncing
 * @param value - The value to save
 * @param onSave - Callback to save the value
 * @param options - Configuration options
 */
export function useAutoSave<T>(
  value: T,
  onSave: (value: T) => void,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const { delay = 500 } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the first render to avoid saving on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set saving indicator
    setIsSaving(true);
    setError(null);

    // Debounce the save
    timeoutRef.current = setTimeout(() => {
      try {
        onSave(value);
        setLastSaved(new Date());
        setIsSaving(false);
      } catch (err) {
        setError(err as Error);
        setIsSaving(false);
      }
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, onSave, delay]);

  return { isSaving, lastSaved, error };
}

/**
 * Formats the last saved time for display
 */
export function formatLastSaved(lastSaved: Date | null): string {
  if (!lastSaved) return '';

  const now = new Date();
  const seconds = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);

  if (seconds < 5) return 'Saved just now';
  if (seconds < 60) return `Saved ${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Saved ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return `Saved ${hours}h ago`;
}
