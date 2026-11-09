import { describe, expect, it } from 'vitest';
import { motionSegments, poseOf, samplePose } from '../iso-art';
import { STATE_ART } from '../state-art';
import * as clientStates from '../client-empty-states';
import * as stateCopy from '../state-copy';

describe('state illustrations', () => {
  const scenes = Object.entries(STATE_ART);

  it('are keyed by their own id', () => {
    for (const [key, art] of scenes) expect(art.id).toBe(key);
  });

  it('give every layer a unique id, so renderers can address it', () => {
    for (const [, art] of scenes) {
      const ids = art.layers.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('loop seamlessly: keyframes run 0 to 1 in order and end where they start', () => {
    for (const [name, art] of scenes) {
      for (const layer of art.layers) {
        if (!layer.motion) continue;
        const at = layer.motion.map((k) => k.at);
        expect(at[0], `${name}.${layer.id}`).toBe(0);
        expect(at[at.length - 1], `${name}.${layer.id}`).toBe(1);
        expect([...at].sort((a, b) => a - b), `${name}.${layer.id}`).toEqual(at);
        expect(poseOf(layer.motion[layer.motion.length - 1]), `${name}.${layer.id}`).toEqual(
          poseOf(layer.motion[0]),
        );
      }
    }
  });

  it('time each loop to the scene duration, segment by segment', () => {
    for (const [, art] of scenes) {
      for (const layer of art.layers) {
        if (!layer.motion) continue;
        const total = motionSegments(layer.motion, art.duration).reduce((ms, s) => ms + s.duration, 0);
        expect(total).toBeCloseTo(art.duration, 6);
      }
    }
  });

  it('draws only finite coordinates', () => {
    for (const [, art] of scenes) {
      for (const layer of art.layers) {
        for (const shape of layer.shapes) expect(shape.d).not.toMatch(/NaN|Infinity/);
      }
    }
  });
});

describe('samplePose', () => {
  const motion = [
    { at: 0, y: 0 },
    { at: 0.5, y: 10, ease: 'linear' as const },
    { at: 1, y: 0, ease: 'linear' as const },
  ];

  it('hits keyframes exactly and interpolates between them', () => {
    expect(samplePose(motion, 0).y).toBe(0);
    expect(samplePose(motion, 0.5).y).toBe(10);
    expect(samplePose(motion, 0.25).y).toBeCloseTo(5, 3);
    expect(samplePose(motion, 0.75).y).toBeCloseTo(5, 3);
  });

  it('rests at identity when a layer has no motion', () => {
    expect(samplePose(undefined, 0.4)).toEqual({ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 });
  });
});

describe('state copy', () => {
  it('only names illustrations that exist', () => {
    const copies = [...Object.values(clientStates), ...Object.values(stateCopy)];
    for (const copy of copies) {
      if (typeof copy === 'string') {
        expect(STATE_ART).toHaveProperty(copy);
      } else if (copy && typeof copy === 'object' && 'art' in copy) {
        expect(STATE_ART).toHaveProperty(String(copy.art));
      }
    }
  });

  it('never uses an em dash', () => {
    const text = JSON.stringify([clientStates, stateCopy], (_k, v) => (typeof v === 'function' ? v('Sam Rivera') : v));
    expect(text).not.toContain(String.fromCharCode(0x2014));
  });
});
