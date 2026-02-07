import { AppState } from '@/types';
import { generateCommonExercises } from './common-exercises';

export const sampleData: AppState = {
  currentRole: 'coach',
  currentUserId: 'coach-1',
  coaches: [
    {
      id: 'coach-1',
      name: 'Sarah Johnson',
      email: 'sarah@coach.com',
      clients: ['client-1', 'client-2', 'client-3']
    }
  ],
  clients: [
    {
      id: 'client-1',
      name: 'Mike Chen',
      email: 'mike@example.com',
      currentPlanId: 'plan-1',
      lastWorkoutDate: new Date().toISOString(),
      adherenceRate: 85,
      status: 'active',
      avatar: '👨',
      lastCheckInDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      planStartDate: '2026-01-27'  // A Monday ~2 weeks ago
    },
    {
      id: 'client-2',
      name: 'Emma Wilson',
      email: 'emma@example.com',
      currentPlanId: 'plan-2',
      lastWorkoutDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      adherenceRate: 92,
      status: 'active',
      avatar: '👩',
      lastCheckInDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      planStartDate: '2026-01-27'  // A Monday ~2 weeks ago
    },
    {
      id: 'client-3',
      name: 'Alex Rodriguez',
      email: 'alex@example.com',
      currentPlanId: 'plan-1',
      lastWorkoutDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      adherenceRate: 85,
      status: 'active',
      avatar: '🧑',
      lastCheckInDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      planStartDate: '2026-01-27'  // A Monday ~2 weeks ago
    }
  ],
  plans: [
    {
      id: 'plan-1',
      name: 'Strength Building Program',
      description: '12-week progressive strength program',
      emoji: '💪',
      durationWeeks: 12,
      workoutsPerWeek: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      weeks: [
        {
          id: 'week-1',
          weekNumber: 1,
          days: [
            {
              id: 'day-1',
              name: 'Upper Body Push',
              isRestDay: false,
              exercises: [
                {
                  id: 'ex-1',
                  name: 'Barbell Bench Press',
                  sets: 4,
                  reps: '8-10',
                  weight: '135 lbs',
                  notes: 'Focus on controlled descent'
                },
                {
                  id: 'ex-2',
                  name: 'Overhead Press',
                  sets: 3,
                  reps: '8-10',
                  weight: '95 lbs'
                },
                {
                  id: 'ex-3',
                  name: 'Dumbbell Flyes',
                  sets: 3,
                  reps: '12-15',
                  weight: '25 lbs'
                },
                {
                  id: 'ex-4',
                  name: 'Tricep Dips',
                  sets: 3,
                  reps: '10-12'
                }
              ]
            },
            {
              id: 'day-2',
              name: 'Lower Body',
              isRestDay: false,
              exercises: [
                {
                  id: 'ex-5',
                  name: 'Barbell Squat',
                  sets: 4,
                  reps: '8-10',
                  weight: '185 lbs',
                  notes: 'Depth to parallel or below'
                },
                {
                  id: 'ex-6',
                  name: 'Romanian Deadlift',
                  sets: 3,
                  reps: '10-12',
                  weight: '135 lbs'
                },
                {
                  id: 'ex-7',
                  name: 'Leg Press',
                  sets: 3,
                  reps: '12-15',
                  weight: '270 lbs'
                },
                {
                  id: 'ex-8',
                  name: 'Calf Raises',
                  sets: 4,
                  reps: '15-20'
                }
              ]
            },
            {
              id: 'day-3',
              name: 'Upper Body Pull',
              isRestDay: false,
              exercises: [
                {
                  id: 'ex-9',
                  name: 'Deadlift',
                  sets: 4,
                  reps: '6-8',
                  weight: '225 lbs',
                  notes: 'Neutral spine throughout'
                },
                {
                  id: 'ex-10',
                  name: 'Pull-ups',
                  sets: 3,
                  reps: '8-10'
                },
                {
                  id: 'ex-11',
                  name: 'Barbell Rows',
                  sets: 3,
                  reps: '10-12',
                  weight: '115 lbs'
                },
                {
                  id: 'ex-12',
                  name: 'Bicep Curls',
                  sets: 3,
                  reps: '12-15',
                  weight: '30 lbs'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'plan-2',
      name: 'HIIT & Conditioning',
      description: '8-week high intensity program',
      emoji: '🔥',
      durationWeeks: 8,
      workoutsPerWeek: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      weeks: [
        {
          id: 'week-2',
          weekNumber: 1,
          days: [
            {
              id: 'day-4',
              name: 'HIIT Circuit',
              isRestDay: false,
              exercises: [
                {
                  id: 'ex-13',
                  name: 'Burpees',
                  sets: 4,
                  time: '45 sec',
                  notes: 'Rest 15 sec between sets'
                },
                {
                  id: 'ex-14',
                  name: 'Jump Squats',
                  sets: 4,
                  reps: '20'
                },
                {
                  id: 'ex-15',
                  name: 'Mountain Climbers',
                  sets: 4,
                  time: '45 sec'
                },
                {
                  id: 'ex-16',
                  name: 'Push-ups',
                  sets: 4,
                  reps: '15-20'
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  messages: [
    {
      id: 'msg-1',
      senderId: 'client-1',
      senderName: 'Mike Chen',
      content: 'Hey Sarah! Had a great session today. The bench press felt much stronger.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: 'msg-2',
      senderId: 'coach-1',
      senderName: 'Sarah Johnson',
      content: 'That\'s awesome Mike! Let\'s bump up the weight by 5 lbs next week.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: 'msg-3',
      senderId: 'client-2',
      senderName: 'Emma Wilson',
      content: 'Quick question - should I do the HIIT on the same day as lower body?',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: false
    },
    {
      id: 'msg-4',
      senderId: 'client-3',
      senderName: 'Alex Rodriguez',
      content: 'Sorry I missed yesterday, got caught up with work. Will make it up today!',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      read: true
    }
  ],
  completedWorkouts: [
    {
      id: 'completed-1',
      clientId: 'client-1',
      planId: 'plan-1',
      weekId: 'week-1',
      dayId: 'day-1',
      completedAt: new Date().toISOString(),
      exercises: [
        {
          id: 'ex-1',
          name: 'Barbell Bench Press',
          sets: 4,
          reps: '8-10',
          weight: '135 lbs',
          completed: true
        }
      ]
    },
    // Alex Rodriguez - consistent, on-track client (all 3 workouts LAST WEEK)
    {
      id: 'completed-alex-1',
      clientId: 'client-3',
      planId: 'plan-1',
      weekId: 'week-1',
      dayId: 'day-1',
      completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago (Monday of last week)
      exercises: [
        {
          id: 'ex-1',
          name: 'Barbell Bench Press',
          sets: 4,
          reps: '8-10',
          weight: '155 lbs',
          completed: true
        }
      ]
    },
    {
      id: 'completed-alex-2',
      clientId: 'client-3',
      planId: 'plan-1',
      weekId: 'week-1',
      dayId: 'day-2',
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago (Wednesday of last week)
      exercises: [
        {
          id: 'ex-1',
          name: 'Deadlift',
          sets: 4,
          reps: '6-8',
          weight: '225 lbs',
          completed: true
        }
      ]
    },
    {
      id: 'completed-alex-3',
      clientId: 'client-3',
      planId: 'plan-1',
      weekId: 'week-1',
      dayId: 'day-3',
      completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago (Friday of last week)
      exercises: [
        {
          id: 'ex-1',
          name: 'Squat',
          sets: 4,
          reps: '8-10',
          weight: '185 lbs',
          completed: true
        }
      ]
    }
  ],
  measurements: [
    {
      id: 'measure-1',
      clientId: 'client-1',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      weight: 185,
      bodyFat: 18.5,
      chest: 42,
      waist: 34,
      hips: 40,
      biceps: 15,
      thighs: 24,
      notes: 'Starting measurements'
    },
    {
      id: 'measure-2',
      clientId: 'client-1',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      weight: 183,
      bodyFat: 17.8,
      chest: 42.5,
      waist: 33.5,
      hips: 40,
      biceps: 15.25,
      thighs: 24.5
    },
    {
      id: 'measure-3',
      clientId: 'client-1',
      date: new Date().toISOString(),
      weight: 181,
      bodyFat: 17.2,
      chest: 43,
      waist: 33,
      hips: 39.5,
      biceps: 15.5,
      thighs: 25,
      notes: 'Great progress!'
    },
    {
      id: 'measure-4',
      clientId: 'client-2',
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      weight: 142,
      bodyFat: 22.5,
      waist: 27,
      hips: 36
    },
    {
      id: 'measure-5',
      clientId: 'client-2',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      weight: 140,
      bodyFat: 21.8,
      waist: 26.5,
      hips: 36
    }
  ],
  checkIns: [
    // Mike Chen - has a responded check-in awaiting coach review
    {
      id: 'checkin-mike-responded',
      clientId: 'client-1',
      coachId: 'coach-1',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'responded' as const,
      workoutFeeling: 'ABOUT_RIGHT' as const,
      bodyFeeling: 'NORMAL' as const,
      clientNotes: 'This week went great! Hit all my workouts. Bench press is feeling stronger - moved up to 140lbs.',
      clientRespondedAt: new Date().toISOString(),
    },
    // Mike Chen - completed check-ins (history)
    {
      id: 'checkin-mike-week3',
      clientId: 'client-1',
      coachId: 'coach-1',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed' as const,
      workoutFeeling: 'TOO_HARD' as const,
      bodyFeeling: 'TIRED' as const,
      clientNotes: 'Deadlifts were rough this week. Lower back felt tight after Friday\'s session.',
      clientRespondedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      coachResponse: 'I hear you on the lower back tightness. Let\'s reduce deadlift volume next week - 3 sets instead of 4. Also try adding some cat-cow stretches before leg days. Your squat form is looking great though!',
      planAdjustment: true,
      completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'checkin-mike-week2',
      clientId: 'client-1',
      coachId: 'coach-1',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed' as const,
      workoutFeeling: 'ABOUT_RIGHT' as const,
      bodyFeeling: 'FRESH' as const,
      clientNotes: 'Feeling strong! Really enjoying the program. Hit a PR on bench press - 145 lbs for 8 reps!',
      clientRespondedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      coachResponse: 'Amazing work on the bench PR! That\'s solid progress. Keep pushing and let me know how the overhead press feels this week.',
      planAdjustment: false,
      completedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'checkin-mike-week1',
      clientId: 'client-1',
      coachId: 'coach-1',
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed' as const,
      workoutFeeling: 'TOO_EASY' as const,
      bodyFeeling: 'NORMAL' as const,
      clientNotes: 'First week done! Feeling like the weights might be a bit light, especially on bench.',
      clientRespondedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      coachResponse: 'Great first week! Let\'s bump up the bench press by 10 lbs and see how that feels. We\'ll increase other lifts next week based on your feedback.',
      planAdjustment: true,
      completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Emma Wilson - completed check-in
    {
      id: 'checkin-emma-week3',
      clientId: 'client-2',
      coachId: 'coach-1',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed' as const,
      workoutFeeling: 'ABOUT_RIGHT' as const,
      bodyFeeling: 'NORMAL' as const,
      clientNotes: 'HIIT sessions are getting easier. Can I add an extra day?',
      clientRespondedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      coachResponse: 'Love the enthusiasm! Let\'s keep it at 4 days for now to ensure proper recovery. If you\'re still feeling great next week, we can discuss adding a 5th lighter session.',
      planAdjustment: false,
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Alex Rodriguez - has a completed check-in THIS WEEK (for client feedback card demo)
    {
      id: 'checkin-alex-thisweek',
      clientId: 'client-3',
      coachId: 'coach-1',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed' as const,
      workoutFeeling: 'ABOUT_RIGHT' as const,
      bodyFeeling: 'FRESH' as const,
      clientNotes: 'Back on track this week! Made up for last week\'s missed sessions. Feeling motivated.',
      clientRespondedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      coachResponse: 'Great comeback, Alex! Consistency is key and you showed real dedication making up those sessions. Keep that momentum going into next week. Your squat form looked solid in the video you sent!',
      planAdjustment: false,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'checkin-alex-week2',
      clientId: 'client-3',
      coachId: 'coach-1',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed' as const,
      workoutFeeling: 'TOO_HARD' as const,
      bodyFeeling: 'RUN_DOWN' as const,
      clientNotes: 'Struggled with consistency this week. Work has been crazy.',
      clientRespondedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      coachResponse: 'No worries, life happens! The important thing is getting back on track. Let\'s focus on just 2 quality sessions next week rather than stressing about hitting all 3. Quality over quantity!',
      planAdjustment: false,
      completedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  coachExercises: generateCommonExercises('coach-1'),
  workoutCompletions: [],
  setCompletions: [],
  exerciseFlags: [],
};
