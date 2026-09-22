import { describe, expect, it } from 'vitest';
import { BIOMES } from '../src/data/biomes.js';
import { RECEIVERS } from '../src/data/receivers.js';
import { IR_SPEC, setSoundscape } from '../src/audio/engine.js';
import { pageHidden } from '../src/engine/page.js';
import {
  playCock,
  playDry,
  playFlesh,
  playFoot,
  playJam,
  playMagIn,
  playMagOut,
  playMuzzle,
  playPerfect,
  RECEIVER_TONES,
  setSoundscape as setSynthSoundscape,
  suspendAudio,
} from '../src/audio/synth.js';
import { createRun } from '../src/systems/run.js';
import { defaultProfile } from '../src/state/profile.js';

describe('sound engine', () => {
  it('gives every biome a short IR and every receiver a muzzle tone', () => {
    expect(Object.keys(IR_SPEC).sort()).toEqual(BIOMES.map((b) => b.id).sort());
    expect(Object.keys(RECEIVER_TONES).sort()).toEqual(Object.keys(RECEIVERS).sort());
    for (const spec of Object.values(IR_SPEC)) {
      expect(spec.dur).toBeGreaterThan(0.1);
      expect(spec.dur).toBeLessThan(0.8);
      expect(spec.taps.length).toBeGreaterThan(0);
    }
  });

  it('falls unknown places back to forest and keeps known biomes', () => {
    expect(setSoundscape('bog')).toBe('forest');
    expect(setSynthSoundscape('quarry')).toBe('quarry');
    expect(setSynthSoundscape('forest')).toBe('forest');
  });

  it('stamps the equipped receiver onto a run for muzzle colour', () => {
    const profile = defaultProfile();
    profile.owned = ['t1_stock', 't2_tactical', 't3_ordnance'];
    profile.loadout.receiver = 't3_ordnance';
    const run = createRun({
      profile,
      viewport: { w: 1280, h: 720 },
      type: 'campaign',
      levelIndex: 2,
      seed: 1,
    });
    expect(run.receiver).toBe('t3_ordnance');
    expect(run.biome.id).toBe(BIOMES[2].id);
  });

  it('keeps one-shots quiet in node with no AudioContext', () => {
    expect(() => {
      playMuzzle({ damage: 15, bulletSpeed: 1600 }, { receiver: 't5_advanced', biome: 'desert' });
      playDry();
      playMagOut();
      playMagIn();
      playCock();
      playPerfect();
      playJam();
      playFlesh(true);
      playFlesh(false);
      playFoot({ voice: 'boot' });
      playFoot({ voice: 'zombie', dist: 120, pan: 0.2 });
    }).not.toThrow();
  });

  it('treats node as visible and parks audio without throwing', () => {
    expect(pageHidden()).toBe(false);
    expect(() => suspendAudio()).not.toThrow();
  });
});
