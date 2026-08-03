import { describe, expect, it, vi } from 'vitest';
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

  it('includes name prompt and include-name settings', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      promptForName: false,
      includeVoterName: false
    });

    expect(ballot.promptForName).toBe(false);
    expect(ballot.includeVoterName).toBe(false);
  });

  it('preserves builder order when random sort mode is requested', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'random', false, [
      { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
      { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
      { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
    ]);

    expect(ballot.candidates.map((candidate) => candidate.name)).toEqual(['Banana', 'Apple', 'Cherry']);
  });
});
