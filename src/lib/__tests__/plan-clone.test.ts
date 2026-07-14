import { describe, it, expect, vi } from 'vitest';

// Only the pure clone builder is under test — keep prisma out of the picture
vi.mock('@/lib/prisma', () => ({ default: {} }));

import { buildPlanCloneData, type ClonablePlan } from '../plan-clone';

const template: ClonablePlan = {
  id: 'template-1',
  name: 'Foundation Strength',
  description: 'Base block',
  emoji: '💪',
  durationWeeks: 2,
  workoutsPerWeek: 2,
  sourceTemplateId: null,
  weeks: [
    {
      weekNumber: 1,
      days: [
        {
          orderIndex: 1,
          name: 'Full Body A',
          description: 'Go steady',
          exercises: [
            {
              exerciseId: 'ex-squat',
              orderIndex: 0,
              trackingType: 'REPS',
              sets: 4,
              reps: 6,
              repsMax: 8,
              weight: 135,
              restSeconds: 90,
              coachNotes: 'Brace hard',
              supersetWithPrevious: false,
            },
            {
              exerciseId: 'ex-plank',
              orderIndex: 1,
              trackingType: 'TIME',
              sets: 3,
              reps: 60,
              repsMax: null,
              weight: null,
              restSeconds: null,
              coachNotes: null,
              supersetWithPrevious: true,
            },
          ],
        },
        { orderIndex: 2, name: 'Full Body B', description: null, exercises: [] },
      ],
    },
    { weekNumber: 2, days: [] },
  ],
};

describe('buildPlanCloneData', () => {
  it('copies plan metadata and links the clone to the template', () => {
    const data = buildPlanCloneData(template, 'coach-1');
    expect(data.coachId).toBe('coach-1');
    expect(data.name).toBe('Foundation Strength');
    expect(data.durationWeeks).toBe(2);
    expect(data.workoutsPerWeek).toBe(2);
    expect(data.sourceTemplateId).toBe('template-1');
  });

  it('deep-copies weeks, days, and exercise prescriptions', () => {
    const data = buildPlanCloneData(template, 'coach-1');
    expect(data.weeks.create).toHaveLength(2);

    const [week1] = data.weeks.create;
    expect(week1.weekNumber).toBe(1);
    expect(week1.days.create).toHaveLength(2);

    const [dayA] = week1.days.create;
    expect(dayA.name).toBe('Full Body A');
    expect(dayA.exercises.create).toHaveLength(2);

    const [squat, plank] = dayA.exercises.create;
    expect(squat).toEqual({
      exerciseId: 'ex-squat',
      orderIndex: 0,
      trackingType: 'REPS',
      sets: 4,
      reps: 6,
      repsMax: 8,
      weight: 135,
      restSeconds: 90,
      coachNotes: 'Brace hard',
      supersetWithPrevious: false,
    });
    expect(plank.trackingType).toBe('TIME');
    expect(plank.supersetWithPrevious).toBe(true);
  });

  it('cloning an instance links back to the ROOT template, not the instance', () => {
    const instance: ClonablePlan = { ...template, id: 'instance-7', sourceTemplateId: 'template-1' };
    const data = buildPlanCloneData(instance, 'coach-1');
    expect(data.sourceTemplateId).toBe('template-1');
  });

  it('handles empty weeks without exploding', () => {
    const data = buildPlanCloneData(template, 'coach-1');
    const [, week2] = data.weeks.create;
    expect(week2.days.create).toEqual([]);
  });
});
