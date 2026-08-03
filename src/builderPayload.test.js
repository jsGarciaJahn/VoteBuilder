import { describe, expect, it } from 'vitest';
import { buildBallotObject } from './builderPayload.js';

const sampleCandidates = [
  { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
  { id: '2', name: 'Apple', description: 'Fresh', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
  { id: '3', name: 'Cherry', description: '', images: [] }
];

describe('buildBallotObject', () => {
  it('includes only candidates with images', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', false, sampleCandidates);
    expect(ballot.candidates).toHaveLength(2);
    expect(ballot.candidates.map((c) => c.name)).toEqual(['Banana', 'Apple']);
  });

  it('sorts alphabetically when requested', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'alpha', false, sampleCandidates);
    expect(ballot.candidates.map((c) => c.name)).toEqual(['Apple', 'Banana']);
  });

  it('preserves builder order when requested', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', false, sampleCandidates);
    expect(ballot.candidates.map((c) => c.name)).toEqual(['Banana', 'Apple']);
  });

  it('includes allowExclusion flag', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates);
    expect(ballot.allowExclusion).toBe(true);
  });
});
