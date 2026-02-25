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
        <h2 className="text-2xl font-bold text-foreground">Build Your Exercise Library</h2>

        {/* Description */}
        <p className="text-muted-foreground">
          Add exercises you commonly use. You'll reuse them across all plans.
        </p>

        {/* Quick Start Card */}
        <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 space-y-3">
          <Button
            onClick={onLoadCommon}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
          >
            <Zap className="w-5 h-5" />
            Load 44 Common Exercises
          </Button>
          <p className="text-sm text-foreground">
            Pre-loads complete exercise library. Save 10 minutes.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-sm text-muted-foreground">or start from scratch</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Manual Add */}
        <Button onClick={onAddManual} variant="outline" className="w-full" size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Add Exercise
        </Button>

        {/* Skip */}
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
