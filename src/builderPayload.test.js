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

  it('produces a different ballot order on each reload when random ordering is used', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    const candidates = [
      { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
      { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
      { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
    ];

    const buildBallotWithSequence = (randomValues) => {
      randomValues.forEach((value) => randomSpy.mockReturnValueOnce(value));
      return buildBallotObject('Contest', 'ranked-choice', 'random', false, candidates);
    };

    const firstBallot = buildBallotWithSequence([0, 0.9]);
    const secondBallot = buildBallotWithSequence([0.9, 0.1]);

    randomSpy.mockRestore();

    const firstOrder = firstBallot.candidates.map((candidate) => candidate.name);
    const secondOrder = secondBallot.candidates.map((candidate) => candidate.name);

    expect(firstOrder).not.toEqual(secondOrder);
  });
});
