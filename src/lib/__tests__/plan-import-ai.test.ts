import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import {
  aiImportConfigured,
  aiRowsToImportRows,
  parseWeekList,
  PLAN_IMPORT_AI_MODEL,
  readPlanWithAi,
  tidyWarnings,
  type AiImportRow,
  type PlanImportAiClient,
} from '../plan-import-ai';
import { parseImportRows } from '../plan-import';

/** Model entry builder: only override what the case is about. */
function aiRow(overrides: Partial<AiImportRow> = {}): AiImportRow {
  return {
    sheet: 'Program',
    row: 3,
    weeks: '1',
    day: 1,
    dayName: null,
    exercise: 'Bench Press',
    sets: '3',
    reps: '8',
    weight: null,
    restSeconds: null,
    notes: null,
    supersetWithPrevious: false,
    ...overrides,
  };
}

/** A fake SDK client whose stream resolves to the given message. */
function fakeClient(message: Partial<Anthropic.Message> | Error) {
  const stream = vi.fn(() => ({
    finalMessage: () =>
      message instanceof Error ? Promise.reject(message) : Promise.resolve(message as Anthropic.Message),
  }));
  return { client: { messages: { stream } } as unknown as PlanImportAiClient, stream };
}

function modelReply(result: unknown, stop_reason: Anthropic.StopReason = 'end_turn'): Partial<Anthropic.Message> {
  return {
    stop_reason,
    content: [{ type: 'text', text: JSON.stringify(result), citations: null }],
    usage: { input_tokens: 1200, output_tokens: 800 } as Anthropic.Usage,
  };
}

describe('aiImportConfigured', () => {
  it('needs an API key', () => {
    expect(aiImportConfigured({ ANTHROPIC_API_KEY: 'sk-ant-x' } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(aiImportConfigured({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('parseWeekList', () => {
  it('reads single weeks, ranges and lists', () => {
    expect(parseWeekList('2')).toEqual([2]);
    expect(parseWeekList('1-4')).toEqual([1, 2, 3, 4]);
    expect(parseWeekList('1–3')).toEqual([1, 2, 3]);
    expect(parseWeekList('1, 3,5')).toEqual([1, 3, 5]);
    expect(parseWeekList('Week 2')).toEqual([2]);
  });

  it('rejects anything it would have to guess at', () => {
    expect(parseWeekList('')).toBeNull();
    expect(parseWeekList('all')).toBeNull();
    expect(parseWeekList('4-1')).toBeNull();
    expect(parseWeekList('0')).toBeNull();
    expect(parseWeekList('1-13')).toBeNull();
  });
});

describe('aiRowsToImportRows', () => {
  it('expands week ranges into one template row per week', () => {
    const rows = aiRowsToImportRows([
      aiRow({ weeks: '1-3', dayName: 'Upper', restSeconds: '90', notes: '70%' }),
      aiRow({ row: 4, exercise: 'Lateral Raise', supersetWithPrevious: true }),
    ]);
    expect(rows.map((r) => r.week)).toEqual(['1', '2', '3', '1']);
    expect(rows[0]).toEqual({
      rowNumber: 3,
      sheet: 'Program',
      week: '1',
      day: '1',
      dayName: 'Upper',
      exercise: 'Bench Press',
      sets: '3',
      reps: '8',
      weight: null,
      rest: '90',
      notes: '70%',
      superset: null,
    });
    expect(rows[3].superset).toBe('Y');
  });

  it('passes an unreadable week through, so the coach gets a row error for it', () => {
    const rows = aiRowsToImportRows([aiRow({ row: 9, sheet: 'Week 2', weeks: 'all' })]);
    const { errors } = parseImportRows(rows);
    expect(errors).toEqual([{ row: 9, sheet: 'Week 2', message: expect.stringContaining('Week') }]);
  });

  it('feeds parseImportRows a column-per-week plan with kg loads', () => {
    // What the model returns for fixtures/columnPerWeekPlan, weeks 1-2
    const rows = aiRowsToImportRows([
      aiRow({ weeks: '1', dayName: 'Mon - Upper', exercise: 'Bench Press', weight: '60kg' }),
      aiRow({ weeks: '1', row: 5, exercise: 'Plank', reps: '45s' }),
      aiRow({ weeks: '1', row: 6, day: 2, dayName: 'Thu - Lower', exercise: 'Back Squat', weight: '80kg' }),
      aiRow({ weeks: '2', dayName: 'Mon - Upper', exercise: 'Bench Press', weight: '62.5kg' }),
      aiRow({ weeks: '2', row: 5, exercise: 'Plank', reps: '50s' }),
      aiRow({ weeks: '2', row: 6, day: 2, dayName: 'Thu - Lower', exercise: 'Back Squat', weight: '85kg' }),
    ]);
    const { plan, errors } = parseImportRows(rows, 'LB');
    expect(errors).toEqual([]);
    expect(plan!.durationWeeks).toBe(2);
    expect(plan!.workoutsPerWeek).toBe(2);
    const [bench, plank] = plan!.weeks[1].days[0].exercises;
    // "62.5kg" keeps its own unit even though the coach works in lb
    expect(bench.weight).toBeCloseTo(137.8, 0);
    expect(plank).toMatchObject({ trackingType: 'TIME', reps: 50 });
    expect(plan!.weeks[0].days[1].name).toBe('Thu - Lower');
  });
});

describe('tidyWarnings', () => {
  const rows = [aiRow({ exercise: 'Bench Press' }), aiRow({ row: 6, exercise: 'Back Squat' })];

  it('points notes only at exercises in the plan, in the plan’s spelling', () => {
    expect(
      tidyWarnings([{ message: 'Rest guessed as 120s.', exercises: ['bench press', ' Back Squat ', 'Deadlift'] }], rows)
    ).toEqual([{ message: 'Rest guessed as 120s.', exercises: ['Bench Press', 'Back Squat'] }]);
  });

  it('drops repeated notes and caps the list', () => {
    const repeated = [
      { message: 'Rest guessed as 120s.', exercises: ['Bench Press'] },
      { message: 'rest guessed as 120s. ', exercises: ['Back Squat'] },
      { message: '  ', exercises: [] },
    ];
    expect(tidyWarnings(repeated, rows)).toEqual([{ message: 'Rest guessed as 120s.', exercises: ['Bench Press'] }]);

    const many = Array.from({ length: 12 }, (_, i) => ({ message: `Note ${i}`, exercises: [] }));
    expect(tidyWarnings(many, rows)).toHaveLength(8);
  });
});

describe('readPlanWithAi', () => {
  it('asks the cheap model for structured rows and returns template rows', async () => {
    const { client, stream } = fakeClient(
      modelReply({
        isWorkoutPlan: true,
        rows: [aiRow({ weeks: '1-2' })],
        warnings: [{ message: 'Skipped the warm-up notes.', exercises: [] }],
      })
    );
    const result = await readPlanWithAi('Sheet "Program"\nRow 3: B3 "Bench Press"', client);

    expect(result).toEqual({
      ok: true,
      rows: [expect.objectContaining({ week: '1' }), expect.objectContaining({ week: '2' })],
      warnings: [{ message: 'Skipped the warm-up notes.', exercises: [] }],
    });
    const params = (stream.mock.calls[0] as unknown[])[0] as Anthropic.MessageStreamParams;
    expect(params.model).toBe(PLAN_IMPORT_AI_MODEL);
    expect(params.output_config).toMatchObject({ effort: 'low', format: { type: 'json_schema' } });
    expect(params.messages[0].content).toContain('Row 3: B3 "Bench Press"');
  });

  it('says so when the file isn’t a plan', async () => {
    const { client } = fakeClient(modelReply({ isWorkoutPlan: false, rows: [], warnings: [] }));
    const result = await readPlanWithAi('Sheet "Budget"', client);
    expect(result).toEqual({ ok: false, error: expect.stringContaining('doesn’t look like a workout plan') });
  });

  it('turns truncated output into a "too long" error rather than a partial plan', async () => {
    const { client } = fakeClient(modelReply({ isWorkoutPlan: true }, 'max_tokens'));
    const result = await readPlanWithAi('…', client);
    expect(result).toEqual({ ok: false, error: expect.stringContaining('too long') });
  });

  it('fails cleanly on refusals, malformed output and API errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const reply of [
      fakeClient(modelReply({}, 'refusal')),
      fakeClient({ ...modelReply({}), content: [{ type: 'text', text: '{"rows": [', citations: null }] }),
      fakeClient(modelReply({ isWorkoutPlan: true, rows: [{ exercise: 'Squat' }], warnings: [] })),
      fakeClient(new Error('overloaded')),
    ]) {
      const result = await readPlanWithAi('…', reply.client);
      expect(result).toEqual({ ok: false, error: expect.stringContaining('Couldn’t read') });
    }
  });
});
