// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { updatePreviewViewport } from '../src/previewViewport.js';

describe('updatePreviewViewport', () => {
  it('switches the preview frame between desktop and mobile layouts', () => {
    const frame = document.createElement('div');

    updatePreviewViewport(frame, 'desktop');
    expect(frame.classList.contains('preview-frame-desktop')).toBe(true);
    expect(frame.classList.contains('preview-frame-mobile')).toBe(false);

    updatePreviewViewport(frame, 'mobile');
    expect(frame.classList.contains('preview-frame-mobile')).toBe(true);
    expect(frame.classList.contains('preview-frame-desktop')).toBe(false);
  });
});
