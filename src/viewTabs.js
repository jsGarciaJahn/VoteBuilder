export function initializeViewTabs({ tabButtons, panels }) {
  const panelById = new Map();
  panels.forEach((panel) => {
    panelById.set(panel.id, panel);
  });

  tabButtons.forEach((button) => {
    if (!button.id) {
      button.id = `${button.dataset.tab}Tab`;
    }
    button.setAttribute('aria-controls', `${button.dataset.tab}Panel`);
    button.setAttribute('role', 'tab');
  });

  panels.forEach((panel) => {
    panel.setAttribute('role', 'tabpanel');
    const ownerTabId = panel.id.replace(/Panel$/, '');
    panel.setAttribute('aria-labelledby', `${ownerTabId}Tab`);
  });

  function activate(tabId) {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.tab === tabId;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.id === `${tabId}Panel`;
      panel.hidden = !isActive;
      if (isActive) {
        panel.removeAttribute('hidden');
      }
    });
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => activate(button.dataset.tab));
    button.addEventListener('keydown', (event) => {
      const index = tabButtons.indexOf(button);
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + direction + tabButtons.length) % tabButtons.length;
        const nextButton = tabButtons[nextIndex];
        if (nextButton) {
          nextButton.focus();
          activate(nextButton.dataset.tab);
        }
      }
    });
  });

  activate(tabButtons[0]?.dataset.tab || 'configure');

  return { activate };
}
