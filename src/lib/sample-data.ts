import { AppState } from '@/types';

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
      avatar: '👨'
    },
    {
      id: 'client-2',
      name: 'Emma Wilson',
      email: 'emma@example.com',
      currentPlanId: 'plan-2',
      lastWorkoutDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      adherenceRate: 92,
      status: 'active',
      avatar: '👩'
    },
    {
      id: 'client-3',
      name: 'Alex Rodriguez',
      email: 'alex@example.com',
      currentPlanId: 'plan-1',
      lastWorkoutDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      adherenceRate: 65,
      status: 'active',
      avatar: '🧑'
    }
  ],
  plans: [
    {
      id: 'plan-1',
      name: 'Strength Building Program',
      description: '12-week progressive strength program',
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
    }
  ]
};
