import { useState, useEffect, useId, useRef } from 'react';
import { ArrowRight, Loader2, Minus, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Chip, FieldLabel, FieldShell, StatusLine } from './shared/formSurfaces';
import { cn } from '@/lib/utils';
import type { PlanSetupFormData, PlanSetupFormErrors } from '../../types';
import {
  validatePlanSetupForm,
  hasValidationErrors,
} from '../../lib/validations/plan-setup';

interface PlanSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: PlanSetupFormData) => void | Promise<void>;
}

const MIN_WEEKS = 1;
const MAX_WEEKS = 12;
const WORKOUTS_OPTIONS = Array.from({ length: 7 }, (_, i) => i + 1);

export function PlanSetupModal({ isOpen, onClose, onSubmit }: PlanSetupModalProps) {
  const [formData, setFormData] = useState<PlanSetupFormData>({
    name: '',
    description: '',
    durationWeeks: 4,
    workoutsPerWeek: 4,
  });

  const [errors, setErrors] = useState<PlanSetupFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showDescription, setShowDescription] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const scheduleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const ids = {
    name: `${baseId}-name`,
    description: `${baseId}-desc`,
    durationLabel: `${baseId}-duration-label`,
    scheduleLabel: `${baseId}-schedule-label`,
    scheduleHint: `${baseId}-schedule-hint`,
    nameError: `${baseId}-name-error`,
    descriptionError: `${baseId}-desc-error`,
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        durationWeeks: 4,
        workoutsPerWeek: 4,
      });
      setErrors({});
      setTouched({});
      setShowDescription(false);
      setShowCancelConfirm(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Focus the textarea when the optional description is revealed
  useEffect(() => {
    if (showDescription) {
      requestAnimationFrame(() => descriptionRef.current?.focus());
    }
  }, [showDescription]);

  const hasFormChanges = () => {
    return (
      formData.name.trim() !== '' ||
      formData.description.trim() !== '' ||
      formData.durationWeeks !== 4 ||
      formData.workoutsPerWeek !== 4
    );
  };

  const handleFieldChange = (field: keyof PlanSetupFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: keyof PlanSetupFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Re-validate on blur to show errors
    const validationErrors = validatePlanSetupForm(formData);
    setErrors(validationErrors);
  };

  const stepDuration = (delta: number) => {
    const next = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, formData.durationWeeks + delta));
    if (next !== formData.durationWeeks) handleFieldChange('durationWeeks', next);
  };

  // Standard radio-group keyboard behavior: arrows move and select
  const handleScheduleKeyDown = (e: React.KeyboardEvent) => {
    let next = formData.workoutsPerWeek;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = formData.workoutsPerWeek >= 7 ? 1 : formData.workoutsPerWeek + 1;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = formData.workoutsPerWeek <= 1 ? 7 : formData.workoutsPerWeek - 1;
    } else {
      return;
    }
    e.preventDefault();
    handleFieldChange('workoutsPerWeek', next);
    scheduleRefs.current[next - 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // double-click guard

    // Mark all fields as touched
    setTouched({
      name: true,
      description: true,
      durationWeeks: true,
      workoutsPerWeek: true,
    });

    // Validate
    const validationErrors = validatePlanSetupForm(formData);
    setErrors(validationErrors);

    if (!hasValidationErrors(validationErrors)) {
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancel = () => {
    if (hasFormChanges()) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  const handleCancelDiscard = () => {
    setShowCancelConfirm(false);
  };

  const totalWorkouts = formData.durationWeeks * formData.workoutsPerWeek;

  if (showCancelConfirm) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleCancelDiscard}
        title={
          <span className="block text-2xl font-black tracking-tight leading-none antialiased">
            Discard changes?
          </span>
        }
        description="Confirm whether to discard unsaved plan changes"
        maxWidth="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCancelDiscard} className="h-11 rounded-xl px-5">
              Go back
            </Button>
            <Button variant="default" onClick={handleConfirmCancel} className="h-11 rounded-xl px-5">
              Discard
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground text-pretty">
          Your plan hasn&apos;t been saved yet. Are you sure you want to discard your changes?
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : handleCancel}
      title={
        <span className="block text-2xl sm:text-[28px] font-black tracking-tight leading-none antialiased">
          Create a plan
        </span>
      }
      maxWidth="xl"
      footer={
        // One dominant action, mirroring the invite dialog: the secondary stays
        // word-width, the primary takes the rest of the row
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="h-12 shrink-0 rounded-xl px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-12 flex-1 rounded-xl gap-2 bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-bold uppercase tracking-wider active:scale-[0.98] transition-[background-color,transform] duration-150"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Creating' : 'Create plan'}
            {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Live tally in the data voice — its own row, so it never truncates
            against the buttons the way it did in the footer */}
        <StatusLine>
          <span className="font-medium text-foreground">{totalWorkouts}</span>
          {' '}{totalWorkouts === 1 ? 'workout' : 'workouts'} · {formData.durationWeeks}
          {' '}{formData.durationWeeks === 1 ? 'week' : 'weeks'}
        </StatusLine>

        {/* Name — the hero field */}
        <div>
          <FieldShell
            label="Plan name"
            htmlFor={ids.name}
            trailing={
              formData.name.length >= 40 ? (
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                  {formData.name.length}/50
                </span>
              ) : null
            }
          >
            <div className="flex items-center gap-1 px-2 pb-2 pt-1">
              <Input
                id={ids.name}
                placeholder="e.g., 4-Week Strength Foundation"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className="h-10 flex-1 min-w-0 border-0 bg-transparent px-2 text-base font-semibold tracking-tight placeholder:font-normal placeholder:tracking-normal focus-visible:ring-0 focus-visible:ring-offset-0"
                maxLength={50}
                aria-describedby={errors.name && touched.name ? ids.nameError : undefined}
                aria-invalid={errors.name && touched.name ? true : undefined}
              />
            </div>
          </FieldShell>
          {errors.name && touched.name && (
            <p id={ids.nameError} className="text-destructive text-xs mt-1.5 px-1" role="alert">
              {errors.name}
            </p>
          )}

          {/* Description stays out of the way until it's wanted */}
          {showDescription ? (
            <div className="mt-3">
              <FieldShell
                label="Description"
                htmlFor={ids.description}
                trailing={
                  formData.description.length >= 150 ? (
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                      {formData.description.length}/200
                    </span>
                  ) : null
                }
              >
                <Textarea
                  id={ids.description}
                  ref={descriptionRef}
                  placeholder="What is this plan for? Who is it for?"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  onBlur={() => handleBlur('description')}
                  className="min-h-[64px] resize-none border-0 bg-transparent px-4 pb-3 pt-1.5 text-base sm:text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
                  maxLength={200}
                  rows={2}
                  aria-describedby={
                    errors.description && touched.description ? ids.descriptionError : undefined
                  }
                  aria-invalid={errors.description && touched.description ? true : undefined}
                />
              </FieldShell>
              {errors.description && touched.description && (
                <p
                  id={ids.descriptionError}
                  className="text-destructive text-xs mt-1.5 px-1"
                  role="alert"
                >
                  {errors.description}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2.5">
              <Chip onClick={() => setShowDescription(true)}>
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add description
              </Chip>
            </div>
          )}
        </div>

        {/* The two numbers sit side by side — that's what the extra width buys */}
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-5">
          {/* Duration — stepper instead of a 12-item dropdown */}
          <div role="group" aria-labelledby={ids.durationLabel}>
            <FieldLabel id={ids.durationLabel} className="mb-2">
              Duration
            </FieldLabel>
            <div className="inline-flex items-stretch rounded-xl border border-border overflow-hidden">
              {/* aria-disabled (not disabled) so the button keeps focus when a bound
                  is reached mid-interaction; stepDuration no-ops past the bounds */}
              <button
                type="button"
                onClick={() => stepDuration(-1)}
                aria-disabled={formData.durationWeeks <= MIN_WEEKS}
                aria-label="One week shorter"
                className={cn(
                  'w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  formData.durationWeeks <= MIN_WEEKS && 'opacity-30 hover:bg-transparent hover:text-muted-foreground active:bg-transparent'
                )}
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <div
                className="min-w-[92px] px-3 flex items-center justify-center border-x border-border select-none"
                aria-live="polite"
              >
                <span className="inline-flex items-baseline gap-1.5">
                  <span className="font-mono text-sm font-bold tabular-nums antialiased">
                    {formData.durationWeeks}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground antialiased">
                    {formData.durationWeeks === 1 ? 'week' : 'weeks'}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => stepDuration(1)}
                aria-disabled={formData.durationWeeks >= MAX_WEEKS}
                aria-label="One week longer"
                className={cn(
                  'w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  formData.durationWeeks >= MAX_WEEKS && 'opacity-30 hover:bg-transparent hover:text-muted-foreground active:bg-transparent'
                )}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Weekly schedule — all seven options visible, one tap to pick */}
          <div className="min-w-0">
            <FieldLabel id={ids.scheduleLabel} className="mb-2">
              Workouts per week
            </FieldLabel>
            <div
              role="radiogroup"
              aria-labelledby={ids.scheduleLabel}
              aria-describedby={ids.scheduleHint}
              onKeyDown={handleScheduleKeyDown}
              className="grid grid-cols-7 gap-1.5"
            >
              {WORKOUTS_OPTIONS.map((count) => {
                const isSelected = formData.workoutsPerWeek === count;
                return (
                  <button
                    key={count}
                    ref={(el) => { scheduleRefs.current[count - 1] = el; }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${count} ${count === 1 ? 'workout' : 'workouts'} per week`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleFieldChange('workoutsPerWeek', count)}
                    className={cn(
                      'h-11 rounded-xl text-sm font-bold tabular-nums antialiased',
                      'transition-[background-color,color,transform] duration-150 active:scale-[0.95]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      isSelected
                        ? 'bg-foreground text-background shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p id={ids.scheduleHint} className="text-xs text-muted-foreground/70 px-1 text-pretty">
          Clients work through workouts in order. Rest days are whenever they don&apos;t train.
        </p>
      </form>
    </Modal>
  );
}
