import { useState, useEffect } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { EmojiPicker } from './EmojiPicker';
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

const DURATION_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const WORKOUTS_OPTIONS = Array.from({ length: 7 }, (_, i) => i + 1);

export function PlanSetupModal({ isOpen, onClose, onSubmit }: PlanSetupModalProps) {
  const [formData, setFormData] = useState<PlanSetupFormData>({
    name: '',
    description: '',
    emoji: '💪',
    durationWeeks: 4,
    workoutsPerWeek: 4,
  });

  const [errors, setErrors] = useState<PlanSetupFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        emoji: '💪',
        durationWeeks: 4,
        workoutsPerWeek: 4,
      });
      setErrors({});
      setTouched({});
      setShowCancelConfirm(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const hasFormChanges = () => {
    return (
      formData.name.trim() !== '' ||
      formData.description.trim() !== '' ||
      formData.emoji !== '💪' ||
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

  if (showCancelConfirm) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleCancelDiscard}
        title="Discard changes?"
        maxWidth="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCancelDiscard}>
              Go back
            </Button>
            <Button variant="default" onClick={handleConfirmCancel}>
              Discard
            </Button>
          </div>
        }
      >
        <p className="text-foreground">
          Your plan hasn't been saved yet. Are you sure you want to discard your changes?
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : handleCancel}
      title="Create New Plan"
      maxWidth="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Plan
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Emoji + Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Plan name*
          </label>
          <div className="flex gap-3">
            <EmojiPicker
              value={formData.emoji}
              onChange={(emoji) => handleFieldChange('emoji', emoji)}
            />
            <div className="flex-1">
              <Input
                placeholder="e.g., 4-Week Strength Foundation"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className={errors.name && touched.name ? 'border-destructive' : ''}
                maxLength={50}
              />
              <div className="flex justify-between mt-1">
                {errors.name && touched.name && (
                  <p className="text-destructive text-sm">{errors.name}</p>
                )}
                {formData.name.length >= 40 && (
                  <p className="text-muted-foreground text-xs ml-auto">
                    {formData.name.length}/50
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description (optional)
          </label>
          <Textarea
            placeholder="Brief description of this plan (optional)"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            onBlur={() => handleBlur('description')}
            className={errors.description && touched.description ? 'border-destructive' : ''}
            maxLength={200}
            rows={2}
          />
          <div className="flex justify-between mt-1">
            {errors.description && touched.description && (
              <p className="text-destructive text-sm">{errors.description}</p>
            )}
            {formData.description.length >= 150 && (
              <p className="text-muted-foreground text-xs ml-auto">
                {formData.description.length}/200
              </p>
            )}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Duration
          </label>
          <select
            value={formData.durationWeeks}
            onChange={(e) => handleFieldChange('durationWeeks', parseInt(e.target.value))}
            onBlur={() => handleBlur('durationWeeks')}
            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            {DURATION_OPTIONS.map((weeks) => (
              <option key={weeks} value={weeks}>
                {weeks} {weeks === 1 ? 'week' : 'weeks'}
              </option>
            ))}
          </select>
          {errors.durationWeeks && touched.durationWeeks && (
            <p className="text-destructive text-sm mt-1">{errors.durationWeeks}</p>
          )}
        </div>

        {/* Workouts per week */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Weekly schedule
          </label>
          <select
            value={formData.workoutsPerWeek}
            onChange={(e) =>
              handleFieldChange('workoutsPerWeek', parseInt(e.target.value))
            }
            onBlur={() => handleBlur('workoutsPerWeek')}
            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            {WORKOUTS_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? 'workout' : 'workouts'} per week
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">Rest days will be auto-calculated</p>
          {errors.workoutsPerWeek && touched.workoutsPerWeek && (
            <p className="text-destructive text-sm mt-1">{errors.workoutsPerWeek}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
