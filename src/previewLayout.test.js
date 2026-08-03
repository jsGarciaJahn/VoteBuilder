// @vitest-environment jsdom

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');

describe('preview layout', () => {
  it('uses a full-frame preview area with footer controls', () => {
    const previewPanel = html.match(/<section id="previewPanel"[\s\S]*?<\/section>\s*<section id="publishPanel"/)[0];

    expect(previewPanel).not.toContain('Ballot preview');
    expect(previewPanel).not.toContain('Review the ballot as it will appear to voters before you export it.');
    expect(previewPanel).toContain('class="preview-footer"');
    expect(previewPanel).toContain('id="previewFrame"');
    expect(previewPanel).toContain('id="refreshPreviewBtn"');
  });
});
