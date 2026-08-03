import { describe, expect, it, vi } from 'vitest';
import { buildBallotObject } from './builderPayload.js';

const sampleCandidates = [
  { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
  { id: '2', name: 'Apple', description: 'Fresh', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
  { id: '3', name: 'Cherry', description: '', images: [] }
];

describe('buildBallotObject', () => {
  it('includes candidates with images and title-only candidates', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', false, sampleCandidates);
    expect(ballot.candidates).toHaveLength(3);
    expect(ballot.candidates.map((c) => c.name)).toEqual(['Banana', 'Apple', 'Cherry']);
  });

  it('sorts alphabetically when requested', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'alpha', false, sampleCandidates);
    expect(ballot.candidates.map((c) => c.name)).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('preserves builder order when requested', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', false, sampleCandidates);
    expect(ballot.candidates.map((c) => c.name)).toEqual(['Banana', 'Apple', 'Cherry']);
  });

  it('includes allowExclusion flag', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates);
    expect(ballot.allowExclusion).toBe(true);
  });

  it('keeps candidates with a title even when they have no image', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', false, [
      ...sampleCandidates,
      { id: '4', name: 'Text-only candidate', description: 'No photo', images: [] }
    ]);

    expect(ballot.candidates.map((candidate) => candidate.name)).toContain('Text-only candidate');
  });

  it('drops candidates that have neither a title nor an image', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', false, [
      ...sampleCandidates,
      { id: '4', name: '', description: '', images: [] }
    ]);

    expect(ballot.candidates.map((candidate) => candidate.name)).not.toContain('');
  });

  it('includes voter name whenever name prompting is enabled', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      promptForName: true,
      includeVoterName: false
    });

    expect(ballot.promptForName).toBe(true);
    expect(ballot.includeVoterName).toBe(true);
  });

  it('disables voter name inclusion when name prompting is disabled', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      promptForName: false,
      includeVoterName: true
    });

    expect(ballot.promptForName).toBe(false);
    expect(ballot.includeVoterName).toBe(false);
  });

  it('includes the ballot theme in the payload', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      ballotTheme: 'solo'
    });

    expect(ballot.ballotTheme).toBe('solo');
  });

  it('maps legacy theme values to supported themes', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      ballotTheme: 'contrast'
    });

    expect(ballot.ballotTheme).toBe('dark');
  });

  it('includes candidate card style options in payload', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      candidateCardStyle: {
        variant: 'poster',
        autoCycleMs: 3600,
        swipeMs: 320,
        cycleVarianceMs: 700,
        imageHeightPx: 190
      }
    });

    expect(ballot.candidateCardStyle).toEqual({
      variant: 'poster',
      autoCycleMs: 3600,
      swipeMs: 320,
      cycleVarianceMs: 700,
      imageHeightPx: 190
    });
  });

  it('normalizes invalid candidate card style values', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      candidateCardStyle: {
        variant: 'unknown',
        autoCycleMs: 99,
        swipeMs: 9999,
        cycleVarianceMs: 9999,
        imageHeightPx: 9999
      }
    });

    expect(ballot.candidateCardStyle).toEqual({
      variant: 'default',
      autoCycleMs: 1800,
      swipeMs: 900,
      cycleVarianceMs: 5000,
      imageHeightPx: 260
    });
  });

  it('includes compressed top banner image in payload', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      bannerImage: 'data:image/jpeg;base64,ABC123'
    });

    expect(ballot.bannerImage).toBe('data:image/jpeg;base64,ABC123');
  });

  it('includes footer attribution text and logo in payload', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      footerBrandText: 'made with AI by Juan Solo',
      footerBrandLogo: 'data:image/jpeg;base64,FOOTER'
    });

    expect(ballot.footerBrandText).toBe('made with AI by Juan Solo');
    expect(ballot.footerBrandLogo).toBe('data:image/jpeg;base64,FOOTER');
  });

  it('includes pairwise algorithm in the payload', () => {
    const ballot = buildBallotObject('Contest', 'pairwise', 'builder', true, sampleCandidates, {
      pairwiseAlgorithm: 'full-random'
    });

    expect(ballot.pairwiseAlgorithm).toBe('full-random');
  });

  it('includes the completion rule and label in the payload', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      completionRule: { mode: 'minimum-count', count: 2 },
      completionLabel: 'Submit'
    });

    expect(ballot.completionRule).toEqual({ mode: 'minimum-count', count: 2 });
    expect(ballot.completionLabel).toBe('Submit');
  });

  it('includes normalized output settings in the payload', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'builder', true, sampleCandidates, {
      outputSettings: {
        deliveryMethod: 'mailto',
        contentFormat: 'csv',
        fileNameBase: 'My Results',
        csvDelimiter: 'tab',
        mailtoTo: 'user@example.com',
        mailtoSubject: 'Subject',
        mailtoBodyPrefix: 'Preface'
      }
    });

    expect(ballot.outputSettings).toEqual({
      deliveryMethod: 'mailto',
      contentFormat: 'csv',
      fileNameBase: 'My Results',
      csvDelimiter: 'tab',
      mailtoTo: 'user@example.com',
      mailtoSubject: 'Subject',
      mailtoBodyPrefix: 'Preface'
    });
  });

  it('includes configured tiers in payload', () => {
    const ballot = buildBallotObject('Contest', 'tier-list', 'builder', false, sampleCandidates, {
      tiers: [
        { label: 'God', color: '#111111' },
        { label: 'Great', color: '#222222' },
        { label: 'Good', color: '#333333' },
        { label: 'Bad', color: '#444444' }
      ]
    });

    expect(ballot.tiers.map((tier) => tier.label)).toEqual(['God', 'Great', 'Good', 'Bad']);
    expect(ballot.tierLabels).toEqual(['God', 'Great', 'Good', 'Bad']);
    expect(ballot.tierColors).toEqual(['#111111', '#222222', '#333333', '#444444']);
  });

  it('includes configured tier colors in payload', () => {
    const ballot = buildBallotObject('Contest', 'tier-list', 'builder', false, sampleCandidates, {
      tiers: [
        { label: 'S', color: '#112233' },
        { label: 'A', color: '#445566' },
        { label: 'B', color: '#778899' }
      ]
    });

    expect(ballot.tierColors).toEqual(['#112233', '#445566', '#778899']);
  });

  it('normalizes tiers to at least two values', () => {
    const ballot = buildBallotObject('Contest', 'tier-list', 'builder', false, sampleCandidates, {
      tiers: [{ label: '', color: '#112233' }]
    });

    expect(ballot.tiers.length).toBeGreaterThanOrEqual(2);
    expect(ballot.tierLabels.length).toBeGreaterThanOrEqual(2);
    expect(ballot.tierLabels[0]).toBe('S');
  });

  it('normalizes tier colors and fills missing values from defaults', () => {
    const ballot = buildBallotObject('Contest', 'tier-list', 'builder', false, sampleCandidates, {
      tiers: [
        { label: 'S', color: '#112233' },
        { label: 'A', color: 'bad-value' },
        { label: 'B', color: '' }
      ]
    });

    expect(ballot.tierColors).toHaveLength(3);
    expect(ballot.tierColors[0]).toBe('#112233');
    expect(ballot.tierColors[1]).toMatch(/^#[0-9a-f]{6}$/);
    expect(ballot.tierColors[2]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('supports legacy tierLabels/tierColors options for backward compatibility', () => {
    const ballot = buildBallotObject('Contest', 'tier-list', 'builder', false, sampleCandidates, {
      tierLabels: ['S', 'A'],
      tierColors: ['#101010', '#202020']
    });

    expect(ballot.tiers).toEqual([
      { label: 'S', color: '#101010' },
      { label: 'A', color: '#202020' }
    ]);
  });

  it('returns all candidates and emits candidateOrder for random sort mode', () => {
    const ballot = buildBallotObject('Contest', 'ranked-choice', 'random', false, [
      { id: '1', name: 'Banana', description: '', images: [{ b64: 'data:image/jpeg;base64,AAA' }] },
      { id: '2', name: 'Apple', description: '', images: [{ b64: 'data:image/jpeg;base64,BBB' }] },
      { id: '3', name: 'Cherry', description: '', images: [{ b64: 'data:image/jpeg;base64,CCC' }] }
    ]);

    expect(ballot.candidates.map((candidate) => candidate.name).sort()).toEqual(['Apple', 'Banana', 'Cherry']);
    expect(ballot.candidateOrder.slice().sort()).toEqual(['1', '2', '3']);
  });
});
