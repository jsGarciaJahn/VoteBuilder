// @vitest-environment jsdom

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');

describe('configure layout', () => {
  it('moves the builder actions into the image and candidate sections and removes the configure generate button', () => {
    const configurePanel = html.match(/<section id="configurePanel"[\s\S]*?<\/section>\s*<section id="previewPanel"/)[0];

    expect(configurePanel).not.toContain('id="generateBtn"');
    expect(configurePanel).toContain('id="autoCreateBtn"');
    expect(configurePanel).toContain('id="addCandidateBtn"');
    expect(configurePanel).toContain('id="useImageNameForCandidateTitle"');
    expect(configurePanel).toContain('<section class="asset-stage">');
    expect(configurePanel).toContain('<section class="pool-section candidate-stage">');
  });
});
