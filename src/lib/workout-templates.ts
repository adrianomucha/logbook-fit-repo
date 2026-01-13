import { WorkoutPlan } from '@/types';

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  category: 'strength' | 'hypertrophy' | 'athletic' | 'beginner';
  daysPerWeek: number;
  generatePlan: () => Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>;
}

export const workoutTemplates: PlanTemplate[] = [
  {
    id: 'ppl',
    name: 'Push/Pull/Legs (6 days)',
    description: 'Classic bodybuilding split - Push, Pull, Legs repeated twice per week',
    category: 'hypertrophy',
    daysPerWeek: 6,
    generatePlan: () => ({
      name: 'Push/Pull/Legs Program',
      description: '6-day split focusing on muscle hypertrophy',
      weeks: [{
        id: `week-${Date.now()}`,
        weekNumber: 1,
        days: [
          {
            id: `day-${Date.now()}-1`,
            name: 'Push (Chest, Shoulders, Triceps)',
            exercises: [
              { id: 'ex-1', name: 'Barbell Bench Press', sets: 4, reps: '8-10', weight: '' },
              { id: 'ex-2', name: 'Overhead Press', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-3', name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-4', name: 'Lateral Raises', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-5', name: 'Tricep Pushdown', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-6', name: 'Overhead Tricep Extension', sets: 3, reps: '12-15', weight: '' }
            ]
          },
          {
            id: `day-${Date.now()}-2`,
            name: 'Pull (Back, Biceps)',
            exercises: [
              { id: 'ex-7', name: 'Deadlift', sets: 4, reps: '6-8', weight: '' },
              { id: 'ex-8', name: 'Pull-ups', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-9', name: 'Barbell Rows', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-10', name: 'Face Pulls', sets: 3, reps: '15-20', weight: '' },
              { id: 'ex-11', name: 'Barbell Curl', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-12', name: 'Hammer Curls', sets: 3, reps: '10-12', weight: '' }
            ]
          },
          {
            id: `day-${Date.now()}-3`,
            name: 'Legs (Quads, Hamstrings, Calves)',
            exercises: [
              { id: 'ex-13', name: 'Barbell Squat', sets: 4, reps: '8-10', weight: '' },
              { id: 'ex-14', name: 'Romanian Deadlift', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-15', name: 'Leg Press', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-16', name: 'Leg Curl', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-17', name: 'Walking Lunges', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-18', name: 'Calf Raises', sets: 4, reps: '15-20', weight: '' }
            ]
          },
          {
            id: `day-${Date.now()}-4`,
            name: 'Push (Chest, Shoulders, Triceps)',
            exercises: [
              { id: 'ex-19', name: 'Incline Bench Press', sets: 4, reps: '8-10', weight: '' },
              { id: 'ex-20', name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-21', name: 'Cable Flyes', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-22', name: 'Front Raises', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-23', name: 'Skull Crushers', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-24', name: 'Tricep Dips', sets: 3, reps: '10-12', weight: '' }
            ]
          },
          {
            id: `day-${Date.now()}-5`,
            name: 'Pull (Back, Biceps)',
            exercises: [
              { id: 'ex-25', name: 'T-Bar Row', sets: 4, reps: '10-12', weight: '' },
              { id: 'ex-26', name: 'Lat Pulldown', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-27', name: 'Dumbbell Rows', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-28', name: 'Rear Delt Flyes', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-29', name: 'Dumbbell Curl', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-30', name: 'Cable Curls', sets: 3, reps: '12-15', weight: '' }
            ]
          },
          {
            id: `day-${Date.now()}-6`,
            name: 'Legs (Quads, Hamstrings, Calves)',
            exercises: [
              { id: 'ex-31', name: 'Front Squat', sets: 4, reps: '8-10', weight: '' },
              { id: 'ex-32', name: 'Leg Extension', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-33', name: 'Stiff-Leg Deadlift', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-34', name: 'Bulgarian Split Squats', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-35', name: 'Leg Curl', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-36', name: 'Seated Calf Raises', sets: 4, reps: '15-20', weight: '' }
            ]
          }
        ]
      }]
    })
  },
  {
    id: 'upper-lower',
    name: 'Upper/Lower (4 days)',
    description: 'Balanced split alternating upper and lower body workouts',
    category: 'strength',
    daysPerWeek: 4,
    generatePlan: () => ({
      name: 'Upper/Lower Split',
      description: '4-day strength and hypertrophy program',
      weeks: [{
        id: `week-${Date.now()}`,
        weekNumber: 1,
        days: [
          {
            id: `day-${Date.now()}-1`,
            name: 'Upper A',
            exercises: [
              { id: 'ex-1', name: 'Barbell Bench Press', sets: 4, reps: '6-8', weight: '' },
              { id: 'ex-2', name: 'Barbell Rows', sets: 4, reps: '6-8', weight: '' },
              { id: 'ex-3', name: 'Overhead Press', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-4', name: 'Pull-ups', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-5', name: 'Dumbbell Curl', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-6', name: 'Tricep Pushdown', sets: 3, reps: '10-12', weight: '' }
            ]
          },
          {
            id: `day-${Date.now()}-2`,
            name: 'Lower A',
            exercises: [
              { id: 'ex-7', name: 'Barbell Squat', sets: 4, reps: '6-8', weight: '' },
              { id: 'ex-8', name: 'Romanian Deadlift', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-9', name: 'Leg Press', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-10', name: 'Leg Curl', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-11', name: 'Calf Raises', sets: 4, reps: '15-20', weight: '' },
              { id: 'ex-12', name: 'Plank', sets: 3, reps: '60 sec', weight: '' }
            ]
          },
          {
            id: `day-${Date.now()}-3`,
            name: 'Upper B',
            exercises: [
              { id: 'ex-13', name: 'Incline Bench Press', sets: 4, reps: '8-10', weight: '' },
              { id: 'ex-14', name: 'Lat Pulldown', sets: 4, reps: '8-10', weight: '' },
              { id: 'ex-15', name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-16', name: 'Cable Rows', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-17', name: 'Lateral Raises', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-18', name: 'Face Pulls', sets: 3, reps: '15-20', weight: '' }
            ]
          },
          {
            id: `day-${Date.now()}-4`,
            name: 'Lower B',
            exercises: [
              { id: 'ex-19', name: 'Deadlift', sets: 4, reps: '5-6', weight: '' },
              { id: 'ex-20', name: 'Front Squat', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-21', name: 'Walking Lunges', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-22', name: 'Leg Extension', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-23', name: 'Seated Calf Raises', sets: 4, reps: '15-20', weight: '' },
              { id: 'ex-24', name: 'Ab Wheel Rollout', sets: 3, reps: '10-12', weight: '' }
            ]
          }
        ]
      }]
    })
  },
  {
    id: 'full-body',
    name: 'Full Body (3 days)',
    description: 'Efficient full-body workouts ideal for beginners or busy schedules',
    category: 'beginner',
    daysPerWeek: 3,
    generatePlan: () => ({
      name: 'Full Body Workout',
      description: '3-day beginner-friendly strength program',
      weeks: [{
        id: `week-${Date.now()}`,
        weekNumber: 1,
        days: [
          {
            id: `day-${Date.now()}-1`,
            name: 'Full Body A',
            exercises: [
              { id: 'ex-1', name: 'Barbell Squat', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-2', name: 'Barbell Bench Press', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-3', name: 'Barbell Rows', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-4', name: 'Overhead Press', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-5', name: 'Plank', sets: 3, reps: '45 sec', weight: '' }
            ]
          },
          {
            id: `day-${Date.now()}-2`,
            name: 'Full Body B',
            exercises: [
              { id: 'ex-6', name: 'Deadlift', sets: 3, reps: '6-8', weight: '' },
              { id: 'ex-7', name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-8', name: 'Pull-ups', sets: 3, reps: '6-8', weight: '' },
              { id: 'ex-9', name: 'Walking Lunges', sets: 3, reps: '12-15', weight: '' },
              { id: 'ex-10', name: 'Russian Twists', sets: 3, reps: '20-30', weight: '' }
            ]
          },
          {
            id: `day-${Date.now()}-3`,
            name: 'Full Body C',
            exercises: [
              { id: 'ex-11', name: 'Front Squat', sets: 3, reps: '8-10', weight: '' },
              { id: 'ex-12', name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-13', name: 'Lat Pulldown', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-14', name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12', weight: '' },
              { id: 'ex-15', name: 'Hanging Leg Raises', sets: 3, reps: '10-12', weight: '' }
            ]
          }
        ]
      }]
    })
  }
];

export const getTemplateByCategory = (category: string) => {
  return workoutTemplates.filter((t) => t.category === category);
};
