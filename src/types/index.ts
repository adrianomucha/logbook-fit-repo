export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps?: string;
  time?: string;
  weight?: string;
  notes?: string;
  completed?: boolean;
}

export interface WorkoutDay {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface WorkoutWeek {
  id: string;
  weekNumber: number;
  days: WorkoutDay[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  weeks: WorkoutWeek[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  currentPlanId?: string;
  lastWorkoutDate?: string;
  adherenceRate?: number;
  status: 'active' | 'inactive';
  avatar?: string;
}

export interface Coach {
  id: string;
  name: string;
  email: string;
  clients: string[];
}

export interface CompletedWorkout {
  id: string;
  clientId: string;
  planId: string;
  weekId: string;
  dayId: string;
  completedAt: string;
  exercises: Exercise[];
}

export interface Measurement {
  id: string;
  clientId: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  thighs?: number;
  notes?: string;
}

export type Role = 'coach' | 'client';

export interface AppState {
  currentRole: Role;
  currentUserId: string;
  coaches: Coach[];
  clients: Client[];
  plans: WorkoutPlan[];
  messages: Message[];
  completedWorkouts: CompletedWorkout[];
  measurements: Measurement[];
}
