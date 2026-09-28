import { describe, expect, it } from 'vitest';
import { buildFlagMessageContent, stripFlagContext } from '../flag-message';

const base = {
  exerciseName: 'Preacher curl',
  prescription: '3x 12',
  setsCompleted: 3,
  totalSets: 3,
};

describe('buildFlagMessageContent', () => {
  it('puts the context line, trimmed note and question in order', () => {
    expect(
      buildFlagMessageContent({ ...base, flagNote: 'Barbel curls substitute ', question: 'Is this ok?' })
    ).toBe('🚩 Preacher curl · 3x 12 · 3/3 sets done\n“Barbel curls substitute”\n\nIs this ok?');
  });

  it('falls back to a default question and skips an empty note', () => {
    expect(buildFlagMessageContent({ ...base, flagNote: '  ', question: ' ' })).toBe(
      '🚩 Preacher curl · 3x 12 · 3/3 sets done\n\nI have a question about Preacher curl'
    );
  });
});

describe('stripFlagContext', () => {
  it('removes the context line and note, keeping the question', () => {
    const content = buildFlagMessageContent({ ...base, flagNote: 'Barbel curls substitute', question: 'Is this ok?' });
    expect(stripFlagContext(content)).toBe('Is this ok?');
  });

  it('handles messages sent before the note was trimmed', () => {
    expect(
      stripFlagContext('🚩 Preacher curl · 3x 12 · 3/3 sets done\n“Barbel curls substitute ”\n\nI have a question about Preacher curl')
    ).toBe('I have a question about Preacher curl');
  });

  it('works without a note', () => {
    expect(stripFlagContext('🚩 Squat · 5x 5 · 2/5 sets done\n\nKnee hurts')).toBe('Knee hurts');
  });

  it('keeps multi-line questions intact', () => {
    expect(stripFlagContext('🚩 Squat · 5x 5 · 2/5 sets done\n\nLine one\n\nLine two')).toBe('Line one\n\nLine two');
  });

  it('leaves ordinary messages alone', () => {
    expect(stripFlagContext('Hi coach')).toBe('Hi coach');
  });
});
