import { AppState } from '@/types';
import { generateCommonExercises } from './common-exercises';

// Helper to generate progressive weeks for the strength program
function generateStrengthProgramWeeks() {
  const weeks = [];

  // Base weights for week 1 (in lbs)
  const baseWeights = {
    benchPress: 135,
    overheadPress: 95,
    dumbbellFlyes: 25,
    squat: 185,
    romanianDeadlift: 135,
    legPress: 270,
    deadlift: 225,
    barbellRows: 115,
    bicepCurls: 30,
  };

  for (let weekNum = 1; weekNum <= 12; weekNum++) {
    // Progressive overload: add 5 lbs every 2 weeks for main lifts
    const progressionMultiplier = Math.floor((weekNum - 1) / 2) * 5;

    weeks.push({
      id: `week-${weekNum}`,
      weekNumber: weekNum,
      days: [
        {
          id: `w${weekNum}-day-1`,
          name: 'Upper Body Push',
          isRestDay: false,
          exercises: [
            {
              id: `w${weekNum}-ex-1`,
              name: 'Barbell Bench Press',
              sets: 4,
              reps: weekNum <= 4 ? '8-10' : weekNum <= 8 ? '6-8' : '5-6',
              weight: `${baseWeights.benchPress + progressionMultiplier} lbs`,
              notes: weekNum === 1 ? 'Focus on controlled descent' : undefined
            },
            {
              id: `w${weekNum}-ex-2`,
              name: 'Overhead Press',
              sets: 3,
              reps: '8-10',
              weight: `${baseWeights.overheadPress + progressionMultiplier} lbs`
            },
            {
              id: `w${weekNum}-ex-3`,
              name: 'Dumbbell Flyes',
              sets: 3,
              reps: '12-15',
              weight: `${baseWeights.dumbbellFlyes + Math.floor(progressionMultiplier / 2)} lbs`
            },
            {
              id: `w${weekNum}-ex-4`,
              name: 'Tricep Dips',
              sets: 3,
              reps: '10-12'
            }
          ]
        },
        {
          id: `w${weekNum}-day-2`,
          name: 'Lower Body',
          isRestDay: false,
          exercises: [
            {
              id: `w${weekNum}-ex-5`,
              name: 'Barbell Squat',
              sets: 4,
              reps: weekNum <= 4 ? '8-10' : weekNum <= 8 ? '6-8' : '5-6',
              weight: `${baseWeights.squat + progressionMultiplier} lbs`,
              notes: weekNum === 1 ? 'Depth to parallel or below' : undefined
            },
            {
              id: `w${weekNum}-ex-6`,
              name: 'Romanian Deadlift',
              sets: 3,
              reps: '10-12',
              weight: `${baseWeights.romanianDeadlift + progressionMultiplier} lbs`
            },
            {
              id: `w${weekNum}-ex-7`,
              name: 'Leg Press',
              sets: 3,
              reps: '12-15',
              weight: `${baseWeights.legPress + progressionMultiplier * 2} lbs`
            },
            {
              id: `w${weekNum}-ex-8`,
              name: 'Calf Raises',
              sets: 4,
              reps: '15-20'
            }
          ]
        },
        {
          id: `w${weekNum}-day-3`,
          name: 'Upper Body Pull',
          isRestDay: false,
          exercises: [
            {
              id: `w${weekNum}-ex-9`,
              name: 'Deadlift',
              sets: 4,
              reps: weekNum <= 4 ? '6-8' : weekNum <= 8 ? '5-6' : '4-5',
              weight: `${baseWeights.deadlift + progressionMultiplier} lbs`,
              notes: weekNum === 1 ? 'Neutral spine throughout' : undefined
            },
            {
              id: `w${weekNum}-ex-10`,
              name: 'Pull-ups',
              sets: 3,
              reps: '8-10'
            },
            {
              id: `w${weekNum}-ex-11`,
              name: 'Barbell Rows',
              sets: 3,
              reps: '10-12',
              weight: `${baseWeights.barbellRows + progressionMultiplier} lbs`
            },
            {
              id: `w${weekNum}-ex-12`,
              name: 'Bicep Curls',
              sets: 3,
              reps: '12-15',
              weight: `${baseWeights.bicepCurls + Math.floor(progressionMultiplier / 2)} lbs`
            }
          ]
        }
      ]
    });
  }

  return weeks;
}

export const sampleData: AppState = {
  currentRole: 'coach',
  currentUserId: 'coach-1',
  coaches: [
    {
      id: 'coach-1',
      name: 'Sarah Johnson',
      email: 'sarah@coach.com',
      clients: ['client-1', 'client-2', 'client-3', 'client-4']
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
      planStartDate: new Date().toISOString().split('T')[0]  // Today - so Mike has a workout today
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
      lastCheckInDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),  // Recent check-in, but has unread message
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
    },
    {
      id: 'client-4',
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      currentPlanId: 'plan-1',
      lastWorkoutDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      adherenceRate: 65,
      status: 'active',
      avatar: '🧔',
      lastCheckInDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),  // 6 days ago = at-risk
      planStartDate: '2026-01-27'
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
      weeks: generateStrengthProgramWeeks()
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
    // Mike Chen (client-1) conversation
    {
      id: 'msg-1',
      senderId: 'client-1',
      senderName: 'Mike Chen',
      content: 'Hey Sarah! Had a great session today. The bench press felt much stronger.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: true,
      clientId: 'client-1'
    },
    {
      id: 'msg-2',
      senderId: 'coach-1',
      senderName: 'Sarah Johnson',
      content: 'That\'s awesome Mike! Let\'s bump up the weight by 5 lbs next week.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      read: true,
      clientId: 'client-1'
    },
    // Emma Wilson (client-2) conversation
    {
      id: 'msg-3',
      senderId: 'client-2',
      senderName: 'Emma Wilson',
      content: 'Quick question - should I do the HIIT on the same day as lower body?',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: false,
      clientId: 'client-2'
    },
    {
      id: 'msg-5',
      senderId: 'coach-1',
      senderName: 'Sarah Johnson',
      content: 'Great question Emma! I\'d recommend doing them on separate days for best recovery.',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      read: true,
      clientId: 'client-2'
    },
    // Alex Rodriguez (client-3) conversation
    {
      id: 'msg-4',
      senderId: 'client-3',
      senderName: 'Alex Rodriguez',
      content: 'Sorry I missed yesterday, got caught up with work. Will make it up today!',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      clientId: 'client-3'
    },
    {
      id: 'msg-6',
      senderId: 'coach-1',
      senderName: 'Sarah Johnson',
      content: 'No worries Alex! Life happens. Just get back on track when you can.',
      timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      read: true,
      clientId: 'client-3'
    }
  ],
  completedWorkouts: [
    {
      id: 'completed-1',
      clientId: 'client-1',
      planId: 'plan-1',
      weekId: 'week-4',  // Mike is on week 4 of 12
      dayId: 'w4-day-1',
      completedAt: new Date().toISOString(),
      exercises: [
        {
          id: 'w4-ex-1',
          name: 'Barbell Bench Press',
          sets: 4,
          reps: '8-10',
          weight: '145 lbs',
          completed: true
        }
      ]
    },
    // Alex Rodriguez - consistent, on-track client (all 3 workouts LAST WEEK)
    {
      id: 'completed-alex-1',
      clientId: 'client-3',
      planId: 'plan-1',
      weekId: 'week-3',  // Alex is on week 3
      dayId: 'w3-day-1',
      completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago (Monday of last week)
      exercises: [
        {
          id: 'w3-ex-1',
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
      weekId: 'week-3',
      dayId: 'w3-day-2',
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago (Wednesday of last week)
      exercises: [
        {
          id: 'w3-ex-9',
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
      weekId: 'week-3',
      dayId: 'w3-day-3',
      completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago (Friday of last week)
      exercises: [
        {
          id: 'w3-ex-5',
          name: 'Barbell Squat',
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
  workoutCompletions: [
    // Alex Rodriguez (client-3) - completed workouts from 2 weeks ago (week 2)
    {
      id: 'wc-alex-1',
      clientId: 'client-3',
      planId: 'plan-1',
      weekId: 'week-2',
      dayId: 'w2-day-1',
      status: 'COMPLETED' as const,
      startedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
      completionPct: 100,
      exercisesDone: 4,
      exercisesTotal: 4,
      durationSec: 2700, // 45 min
      effortRating: 'MEDIUM' as const,
    },
    {
      id: 'wc-alex-2',
      clientId: 'client-3',
      planId: 'plan-1',
      weekId: 'week-2',
      dayId: 'w2-day-2',
      status: 'COMPLETED' as const,
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000).toISOString(),
      completionPct: 100,
      exercisesDone: 4,
      exercisesTotal: 4,
      durationSec: 3000, // 50 min
      effortRating: 'HARD' as const,
    },
    {
      id: 'wc-alex-3',
      clientId: 'client-3',
      planId: 'plan-1',
      weekId: 'week-2',
      dayId: 'w2-day-3',
      status: 'COMPLETED' as const,
      startedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000).toISOString(),
      completionPct: 100,
      exercisesDone: 4,
      exercisesTotal: 4,
      durationSec: 2400, // 40 min
      effortRating: 'EASY' as const,
    },
    // Alex - this week's workouts (week 3)
    {
      id: 'wc-alex-4',
      clientId: 'client-3',
      planId: 'plan-1',
      weekId: 'week-3',
      dayId: 'w3-day-1',
      status: 'COMPLETED' as const,
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 48 * 60 * 1000).toISOString(),
      completionPct: 100,
      exercisesDone: 4,
      exercisesTotal: 4,
      durationSec: 2880, // 48 min
      effortRating: 'MEDIUM' as const,
    },
    {
      id: 'wc-alex-5',
      clientId: 'client-3',
      planId: 'plan-1',
      weekId: 'week-3',
      dayId: 'w3-day-2',
      status: 'COMPLETED' as const,
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 55 * 60 * 1000).toISOString(),
      completionPct: 100,
      exercisesDone: 4,
      exercisesTotal: 4,
      durationSec: 3300, // 55 min
      effortRating: 'MEDIUM' as const,
    },
    // Mike Chen (client-1) - completed yesterday's workout (week 4)
    {
      id: 'wc-mike-1',
      clientId: 'client-1',
      planId: 'plan-1',
      weekId: 'week-4',
      dayId: 'w4-day-1',
      status: 'COMPLETED' as const,
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 42 * 60 * 1000).toISOString(),
      completionPct: 100,
      exercisesDone: 4,
      exercisesTotal: 4,
      durationSec: 2520, // 42 min
      effortRating: 'MEDIUM' as const,
    },
    // Emma Wilson (client-2) - completed this week's workouts (plan-2 uses different IDs)
    {
      id: 'wc-emma-1',
      clientId: 'client-2',
      planId: 'plan-2',
      weekId: 'week-2',  // plan-2's week-2
      dayId: 'day-4',    // plan-2 uses day-4
      status: 'COMPLETED' as const,
      startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 35 * 60 * 1000).toISOString(),
      completionPct: 100,
      exercisesDone: 4,
      exercisesTotal: 4,
      durationSec: 2100, // 35 min
      effortRating: 'EASY' as const,
    },
    {
      id: 'wc-emma-2',
      clientId: 'client-2',
      planId: 'plan-2',
      weekId: 'week-2',  // plan-2's week-2
      dayId: 'day-4',    // plan-2 uses day-4
      status: 'COMPLETED' as const,
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000).toISOString(),
      completionPct: 100,
      exercisesDone: 4,
      exercisesTotal: 4,
      durationSec: 2400, // 40 min
      effortRating: 'MEDIUM' as const,
    },
  ],
  setCompletions: [],
  exerciseFlags: [],
};
