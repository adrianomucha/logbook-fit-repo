export interface ExerciseTemplate {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio';
  equipment?: string;
  /** TIME exercises put a duration string in defaultReps ("60s", "20-30 min") */
  trackingType?: 'REPS' | 'TIME';
  defaultSets?: number;
  defaultReps?: string;
  notes?: string;
}

/** A row in the builder's picker: one of the coach's own exercises, or a starter. */
export interface LibraryRow {
  /** Unique within the list */
  key: string;
  /** Set for the coach's own exercises: the library row that can be removed */
  ownId?: string;
  name: string;
  /** Lowercase, for the filter chips ("chest", "full body") */
  category: string;
  equipment?: string;
  trackingType?: 'REPS' | 'TIME';
  defaultSets?: number;
  defaultReps?: string;
  notes?: string;
}

/** The coach's saved exercise, as GET /api/exercises returns it */
export interface OwnExercise {
  id: string;
  name: string;
  category: string;
  trackingType?: 'REPS' | 'TIME' | null;
  defaultSets?: number | null;
  /** Rep count, or seconds when trackingType is TIME */
  defaultReps?: number | null;
  instructions?: string | null;
}

function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
}

/**
 * The picker's list: the coach's own exercises first (A to Z), then the
 * starter exercises they don't already have. A starter the coach has used
 * shows once, as theirs, so the same name never appears twice.
 */
export function buildLibraryRows(own: OwnExercise[], starters: ExerciseTemplate[] = exerciseLibrary): LibraryRow[] {
  const ownRows: LibraryRow[] = [...own]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .map((ex) => {
      const trackingType = ex.trackingType ?? 'REPS';
      // The coach's row has no category of its own until they set one; a
      // starter of the same name knows where it belongs
      const starter = starters.find((s) => s.name.toLowerCase() === ex.name.toLowerCase());
      const category =
        ex.category && ex.category !== 'OTHER'
          ? ex.category.toLowerCase().replace(/_/g, ' ')
          : starter?.category ?? 'other';
      return {
        key: `own-${ex.id}`,
        ownId: ex.id,
        name: ex.name,
        category,
        equipment: starter?.equipment,
        trackingType,
        defaultSets: ex.defaultSets ?? starter?.defaultSets ?? undefined,
        defaultReps:
          starter?.defaultReps ??
          (ex.defaultReps != null
            ? trackingType === 'TIME'
              ? formatSeconds(ex.defaultReps)
              : String(ex.defaultReps)
            : undefined),
        notes: ex.instructions ?? starter?.notes ?? undefined,
      };
    });

  const ownNames = new Set(own.map((ex) => ex.name.toLowerCase()));
  const starterRows: LibraryRow[] = starters
    .filter((s) => !ownNames.has(s.name.toLowerCase()))
    .map((s) => ({ ...s, key: `starter-${s.id}` }));

  return [...ownRows, ...starterRows];
}

/** Narrow the picker by a search (name, category or equipment) or a category chip. */
export function filterLibraryRows(rows: LibraryRow[], query: string, category: string | null): LibraryRow[] {
  const q = query.trim().toLowerCase();
  if (q) {
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.includes(q) ||
        !!r.equipment?.toLowerCase().includes(q)
    );
  }
  return category ? rows.filter((r) => r.category === category) : rows;
}

export const exerciseLibrary: ExerciseTemplate[] = [
  // Chest
  { id: 'bench-press', name: 'Barbell Bench Press', category: 'chest', equipment: 'Barbell', defaultSets: 4, defaultReps: '8-10' },
  { id: 'incline-bench', name: 'Incline Bench Press', category: 'chest', equipment: 'Barbell', defaultSets: 3, defaultReps: '8-10' },
  { id: 'db-press', name: 'Dumbbell Bench Press', category: 'chest', equipment: 'Dumbbells', defaultSets: 4, defaultReps: '8-12' },
  { id: 'db-flyes', name: 'Dumbbell Flyes', category: 'chest', equipment: 'Dumbbells', defaultSets: 3, defaultReps: '12-15' },
  { id: 'cable-flyes', name: 'Cable Flyes', category: 'chest', equipment: 'Cable', defaultSets: 3, defaultReps: '12-15' },
  { id: 'pushups', name: 'Push-ups', category: 'chest', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '15-20' },
  { id: 'dips-chest', name: 'Dips (Chest)', category: 'chest', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '10-12' },

  // Back
  { id: 'deadlift', name: 'Deadlift', category: 'back', equipment: 'Barbell', defaultSets: 4, defaultReps: '6-8' },
  { id: 'pullups', name: 'Pull-ups', category: 'back', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '8-10' },
  { id: 'bb-rows', name: 'Barbell Rows', category: 'back', equipment: 'Barbell', defaultSets: 4, defaultReps: '8-10' },
  { id: 'db-rows', name: 'Dumbbell Rows', category: 'back', equipment: 'Dumbbells', defaultSets: 3, defaultReps: '10-12' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', category: 'back', equipment: 'Cable', defaultSets: 3, defaultReps: '10-12' },
  { id: 'cable-rows', name: 'Cable Rows', category: 'back', equipment: 'Cable', defaultSets: 3, defaultReps: '12-15' },
  { id: 't-bar-row', name: 'T-Bar Row', category: 'back', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12' },

  // Shoulders
  { id: 'ohp', name: 'Overhead Press', category: 'shoulders', equipment: 'Barbell', defaultSets: 4, defaultReps: '8-10' },
  { id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', category: 'shoulders', equipment: 'Dumbbells', defaultSets: 3, defaultReps: '10-12' },
  { id: 'lateral-raises', name: 'Lateral Raises', category: 'shoulders', equipment: 'Dumbbells', defaultSets: 3, defaultReps: '12-15' },
  { id: 'front-raises', name: 'Front Raises', category: 'shoulders', equipment: 'Dumbbells', defaultSets: 3, defaultReps: '12-15' },
  { id: 'rear-delt-flyes', name: 'Rear Delt Flyes', category: 'shoulders', equipment: 'Dumbbells', defaultSets: 3, defaultReps: '12-15' },
  { id: 'face-pulls', name: 'Face Pulls', category: 'shoulders', equipment: 'Cable', defaultSets: 3, defaultReps: '15-20' },

  // Arms
  { id: 'bb-curl', name: 'Barbell Curl', category: 'arms', equipment: 'Barbell', defaultSets: 3, defaultReps: '10-12' },
  { id: 'db-curl', name: 'Dumbbell Curl', category: 'arms', equipment: 'Dumbbells', defaultSets: 3, defaultReps: '10-12' },
  { id: 'hammer-curl', name: 'Hammer Curls', category: 'arms', equipment: 'Dumbbells', defaultSets: 3, defaultReps: '10-12' },
  { id: 'tricep-dips', name: 'Tricep Dips', category: 'arms', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '10-12' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', category: 'arms', equipment: 'Cable', defaultSets: 3, defaultReps: '12-15' },
  { id: 'skull-crushers', name: 'Skull Crushers', category: 'arms', equipment: 'Barbell', defaultSets: 3, defaultReps: '10-12' },
  { id: 'close-grip-bench', name: 'Close-Grip Bench Press', category: 'arms', equipment: 'Barbell', defaultSets: 3, defaultReps: '8-10' },

  // Legs
  { id: 'squat', name: 'Barbell Squat', category: 'legs', equipment: 'Barbell', defaultSets: 4, defaultReps: '8-10' },
  { id: 'leg-press', name: 'Leg Press', category: 'legs', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15' },
  { id: 'rdl', name: 'Romanian Deadlift', category: 'legs', equipment: 'Barbell', defaultSets: 3, defaultReps: '10-12' },
  { id: 'leg-curl', name: 'Leg Curl', category: 'legs', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15' },
  { id: 'leg-extension', name: 'Leg Extension', category: 'legs', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15' },
  { id: 'lunges', name: 'Walking Lunges', category: 'legs', equipment: 'Dumbbells', defaultSets: 3, defaultReps: '12-15' },
  { id: 'calf-raises', name: 'Calf Raises', category: 'legs', equipment: 'Machine', defaultSets: 4, defaultReps: '15-20' },

  // Core
  { id: 'plank', name: 'Plank', category: 'core', equipment: 'Bodyweight', trackingType: 'TIME', defaultSets: 3, defaultReps: '60s' },
  { id: 'crunches', name: 'Crunches', category: 'core', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '20-25' },
  { id: 'russian-twists', name: 'Russian Twists', category: 'core', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '20-30' },
  { id: 'hanging-leg-raises', name: 'Hanging Leg Raises', category: 'core', equipment: 'Bar', defaultSets: 3, defaultReps: '12-15' },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', category: 'core', equipment: 'Ab Wheel', defaultSets: 3, defaultReps: '10-12' },

  // Cardio
  { id: 'treadmill', name: 'Treadmill Run', category: 'cardio', equipment: 'Treadmill', trackingType: 'TIME', defaultSets: 1, defaultReps: '20-30 min' },
  { id: 'bike', name: 'Stationary Bike', category: 'cardio', equipment: 'Bike', trackingType: 'TIME', defaultSets: 1, defaultReps: '20-30 min' },
  { id: 'burpees', name: 'Burpees', category: 'cardio', equipment: 'Bodyweight', defaultSets: 4, defaultReps: '15-20' },
  { id: 'jump-rope', name: 'Jump Rope', category: 'cardio', equipment: 'Jump Rope', trackingType: 'TIME', defaultSets: 3, defaultReps: '2 min' },
  { id: 'mountain-climbers', name: 'Mountain Climbers', category: 'cardio', equipment: 'Bodyweight', trackingType: 'TIME', defaultSets: 3, defaultReps: '30s' },
];
