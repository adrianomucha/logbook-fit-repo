import { Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExerciseOnboardingProps {
  onLoadCommon: () => void;
  onSkip: () => void;
  onAddManual: () => void;
}

export function ExerciseOnboarding({
  onLoadCommon,
  onSkip,
  onAddManual,
}: ExerciseOnboardingProps) {
  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="max-w-md w-full text-center space-y-8 px-4">
        {/* Icon */}
        <div className="text-6xl">🏋️</div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900">Build Your Exercise Library</h2>

        {/* Description */}
        <p className="text-gray-600">
          Add exercises you commonly use. You'll reuse them across all plans.
        </p>

        {/* Quick Start Card */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-3">
          <Button
            onClick={onLoadCommon}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Zap className="w-5 h-5" />
            Load 44 Common Exercises
          </Button>
          <p className="text-sm text-blue-900">
            Pre-loads complete exercise library. Save 10 minutes.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-gray-300" />
          <span className="text-sm text-gray-500">or start from scratch</span>
          <div className="flex-1 border-t border-gray-300" />
        </div>

        {/* Manual Add */}
        <Button onClick={onAddManual} variant="outline" className="w-full" size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Add Exercise
        </Button>

        {/* Skip */}
        <button
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
