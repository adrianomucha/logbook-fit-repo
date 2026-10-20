import { describe, expect, it } from 'vitest';
import {
  EXERCISE_VIDEO_COPY,
  EXERCISE_VIDEO_URL_MAX,
  parseVideoUrl,
  videoSourceLabel,
} from '../exercise-video';

describe('parseVideoUrl', () => {
  it('keeps a full https link as typed, trimmed', () => {
    expect(parseVideoUrl('  https://www.youtube.com/watch?v=abc123  ')).toEqual({
      ok: true,
      url: 'https://www.youtube.com/watch?v=abc123',
    });
  });

  it('accepts http links', () => {
    expect(parseVideoUrl('http://coach.example.com/squat.mp4')).toEqual({
      ok: true,
      url: 'http://coach.example.com/squat.mp4',
    });
  });

  it('adds https:// to a link pasted without a scheme', () => {
    expect(parseVideoUrl('youtu.be/abc123')).toEqual({ ok: true, url: 'https://youtu.be/abc123' });
  });

  it('treats a blank field as clearing the video', () => {
    expect(parseVideoUrl('')).toEqual({ ok: true, url: null });
    expect(parseVideoUrl('   ')).toEqual({ ok: true, url: null });
  });

  it('refuses anything that is not an http(s) web link', () => {
    for (const bad of [
      'javascript:alert(1)',
      'data:text/html,hi',
      'ftp://example.com/video',
      'instagram://reel/abc',
      'squat video',
      'https://localhost',
      'https://you tube.com/x',
    ]) {
      expect(parseVideoUrl(bad)).toEqual({ ok: false, error: EXERCISE_VIDEO_COPY.invalid });
    }
  });

  it('refuses links over the stored length', () => {
    const long = `https://example.com/${'a'.repeat(EXERCISE_VIDEO_URL_MAX)}`;
    expect(parseVideoUrl(long).ok).toBe(false);
  });
});

describe('videoSourceLabel', () => {
  it('names the big video sites, including subdomains and short links', () => {
    expect(videoSourceLabel('https://www.youtube.com/watch?v=abc')).toBe('YouTube');
    expect(videoSourceLabel('https://m.youtube.com/shorts/abc')).toBe('YouTube');
    expect(videoSourceLabel('https://youtu.be/abc')).toBe('YouTube');
    expect(videoSourceLabel('https://www.instagram.com/reel/abc/')).toBe('Instagram');
    expect(videoSourceLabel('https://www.tiktok.com/@coach/video/1')).toBe('TikTok');
    expect(videoSourceLabel('https://vimeo.com/123')).toBe('Vimeo');
  });

  it('returns null for other sites and look-alike hosts', () => {
    expect(videoSourceLabel('https://coach.example.com/squat')).toBeNull();
    expect(videoSourceLabel('https://notyoutube.com/watch')).toBeNull();
    expect(videoSourceLabel('https://youtube.com.evil.io/watch')).toBeNull();
  });
});

describe('EXERCISE_VIDEO_COPY.hint', () => {
  it('names the exercise, falling back when the name is blank', () => {
    expect(EXERCISE_VIDEO_COPY.hint('Goblet Squat')).toBe(
      'Clients see this on every workout with Goblet Squat.'
    );
    expect(EXERCISE_VIDEO_COPY.hint('  ')).toBe('Clients see this on every workout with this exercise.');
  });
});
