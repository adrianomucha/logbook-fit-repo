import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
  CoachExercise,
  ExerciseFormData,
  ExerciseFormErrors,
  ExerciseCategory,
  ExerciseEquipment,
} from '@/types';

interface ExerciseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExerciseFormData) => void;
  initialData?: CoachExercise;
  existingExercises: CoachExercise[];
}

const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'UPPER_BODY', label: 'Upper Body' },
  { value: 'LOWER_BODY', label: 'Lower Body' },
  { value: 'CORE', label: 'Core' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'MOBILITY', label: 'Mobility' },
  { value: 'OTHER', label: 'Other' },
];

const EQUIPMENT: { value: ExerciseEquipment; label: string }[] = [
  { value: 'BARBELL', label: 'Barbell' },
  { value: 'DUMBBELL', label: 'Dumbbell' },
  { value: 'KETTLEBELL', label: 'Kettlebell' },
  { value: 'BODYWEIGHT', label: 'Bodyweight' },
  { value: 'MACHINE', label: 'Machine' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'BANDS', label: 'Bands' },
  { value: 'OTHER', label: 'Other' },
];

export function ExerciseForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  existingExercises,
}: ExerciseFormProps) {
  const [formData, setFormData] = useState<ExerciseFormData>({
    name: '',
    category: 'UPPER_BODY',
    equipment: 'BARBELL',
    defaultSets: 3,
    notes: '',
  });

  const [errors, setErrors] = useState<ExerciseFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          category: initialData.category,
          equipment: initialData.equipment,
          defaultSets: initialData.defaultSets,
          notes: initialData.notes || '',
        });
      } else {
        setFormData({
          name: '',
          category: 'UPPER_BODY',
          equipment: 'BARBELL',
          defaultSets: 3,
          notes: '',
        });
      }
      setErrors({});
      setTouched({});
    }
  }, [isOpen, initialData]);

  const validateForm = (): ExerciseFormErrors => {
    const newErrors: ExerciseFormErrors = {};

    // Name validation
    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters';
    } else {
      // Check for duplicate names (case-insensitive)
      const isDuplicate = existingExercises.some(
        (ex) =>
          ex.name.toLowerCase() === formData.name.trim().toLowerCase() &&
          (!initialData || ex.id !== initialData.id)
      );
      if (isDuplicate) {
        newErrors.name = 'Exercise with this name already exists';
      }
    }

    // Default sets validation
    if (formData.defaultSets < 1 || formData.defaultSets > 10) {
      newErrors.defaultSets = 'Sets must be between 1 and 10';
    }

    // Notes validation
    if (formData.notes && formData.notes.length > 200) {
      newErrors.notes = 'Notes cannot exceed 200 characters';
    }

    return newErrors;
  };

  const handleFieldChange = (field: keyof ExerciseFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: keyof ExerciseFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const validationErrors = validateForm();
    setErrors(validationErrors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      category: true,
      equipment: true,
      defaultSets: true,
      notes: true,
    });

    // Validate
    const validationErrors = validateForm();
    setErrors(validationErrors);

    // Check if there are any errors
    if (Object.keys(validationErrors).length === 0) {
      onSubmit(formData);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={initialData ? 'Edit Exercise' : 'Add Exercise'}
      maxWidth="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initialData ? 'Update Exercise' : 'Add Exercise'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Exercise Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Exercise name*
          </label>
          <Input
            placeholder="e.g., Barbell Deadlift"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            className={errors.name && touched.name ? 'border-red-500' : ''}
            maxLength={50}
            autoFocus
          />
          <div className="flex justify-between mt-1">
            {errors.name && touched.name && (
              <p className="text-red-600 text-sm">{errors.name}</p>
            )}
            {formData.name.length >= 40 && (
              <p className="text-muted-foreground text-xs ml-auto">{formData.name.length}/50</p>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Category*</label>
          <select
            value={formData.category}
            onChange={(e) =>
              handleFieldChange('category', e.target.value as ExerciseCategory)
            }
            onBlur={() => handleBlur('category')}
            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.category && touched.category && (
            <p className="text-red-600 text-sm mt-1">{errors.category}</p>
          )}
        </div>

        {/* Equipment */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Equipment*</label>
          <select
            value={formData.equipment}
            onChange={(e) =>
              handleFieldChange('equipment', e.target.value as ExerciseEquipment)
            }
            onBlur={() => handleBlur('equipment')}
            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            {EQUIPMENT.map((eq) => (
              <option key={eq.value} value={eq.value}>
                {eq.label}
              </option>
            ))}
          </select>
          {errors.equipment && touched.equipment && (
            <p className="text-red-600 text-sm mt-1">{errors.equipment}</p>
          )}
        </div>

        {/* Default Sets */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Default sets
          </label>
          <Input
            type="number"
            min={1}
            max={10}
            value={formData.defaultSets}
            onChange={(e) => handleFieldChange('defaultSets', parseInt(e.target.value))}
            onBlur={() => handleBlur('defaultSets')}
            className={errors.defaultSets && touched.defaultSets ? 'border-red-500' : ''}
          />
          {errors.defaultSets && touched.defaultSets && (
            <p className="text-red-600 text-sm mt-1">{errors.defaultSets}</p>
          )}
        </div>

        {/* Coaching Notes */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Coaching notes (optional)
          </label>
          <Textarea
            placeholder="e.g., Keep back neutral, drive through heels"
            value={formData.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            onBlur={() => handleBlur('notes')}
            className={errors.notes && touched.notes ? 'border-red-500' : ''}
            maxLength={200}
            rows={3}
          />
          <div className="flex justify-between mt-1">
            {errors.notes && touched.notes && (
              <p className="text-red-600 text-sm">{errors.notes}</p>
            )}
            {formData.notes.length >= 150 && (
              <p className="text-muted-foreground text-xs ml-auto">{formData.notes.length}/200</p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
