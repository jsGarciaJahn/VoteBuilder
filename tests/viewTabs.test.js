// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { initializeViewTabs } from '../src/viewTabs.js';

describe('initializeViewTabs', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('switches the active panel when a tab is selected', () => {
    document.body.innerHTML = `
      <div>
        <button data-tab="builder" class="active">Builder</button>
        <button data-tab="preview">Preview</button>
        <button data-tab="publish">Publish</button>
      </div>
      <section id="builderPanel"></section>
      <section id="previewPanel" hidden></section>
      <section id="publishPanel" hidden></section>
    `;

    const tabButtons = Array.from(document.querySelectorAll('[data-tab]'));
    const panels = Array.from(document.querySelectorAll('section'));
    const viewTabs = initializeViewTabs({ tabButtons, panels });

    viewTabs.activate('preview');

    expect(document.getElementById('previewPanel').hidden).toBe(false);
    expect(document.getElementById('builderPanel').hidden).toBe(true);
  });

  it('uses real tab semantics for buttons and panels', () => {
    document.body.innerHTML = `
      <div>
        <button data-tab="configure">Configure</button>
        <button data-tab="preview">Preview</button>
      </div>
      <section id="configurePanel"></section>
      <section id="previewPanel" hidden></section>
    `;

    const tabButtons = Array.from(document.querySelectorAll('[data-tab]'));
    const panels = Array.from(document.querySelectorAll('section'));
    initializeViewTabs({ tabButtons, panels });

    const configureButton = document.querySelector('[data-tab="configure"]');
    const previewButton = document.querySelector('[data-tab="preview"]');

    expect(configureButton.getAttribute('role')).toBe('tab');
    expect(configureButton.getAttribute('aria-controls')).toBe('configurePanel');
    expect(configureButton.getAttribute('aria-selected')).toBe('true');
    expect(configureButton.id).toBe('configureTab');
    expect(configureButton.tabIndex).toBe(0);
    expect(previewButton.getAttribute('aria-selected')).toBe('false');
    expect(previewButton.tabIndex).toBe(-1);
    expect(document.getElementById('configurePanel').getAttribute('role')).toBe('tabpanel');
    expect(document.getElementById('configurePanel').getAttribute('aria-labelledby')).toBe('configureTab');
    expect(document.getElementById('previewPanel').getAttribute('aria-labelledby')).toBe('previewTab');
  });
});
