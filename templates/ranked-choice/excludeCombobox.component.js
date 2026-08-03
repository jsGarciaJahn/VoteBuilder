function createExclusionCombobox({ field, input, options }) {
  let candidates = [];

  function hide() {
    options.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  function getMatches() {
    const query = input.value.trim().toLowerCase();
    return candidates.filter((candidate) => candidate.name.toLowerCase().includes(query));
  }

  function render({ open = false } = {}) {
    const matches = getMatches();
    options.innerHTML = '';

    matches.forEach((candidate) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'exclude-option';
      option.setAttribute('role', 'option');
      option.textContent = candidate.name;
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        input.value = candidate.name;
        hide();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      options.appendChild(option);
    });

    const shouldOpen = open && matches.length > 0;
    options.hidden = !shouldOpen;
    input.setAttribute('aria-expanded', String(shouldOpen));
  }

  function setCandidates(nextCandidates) {
    candidates = Array.isArray(nextCandidates) ? [...nextCandidates] : [];
    render({ open: false });
  }

  function clear() {
    input.value = '';
    hide();
  }

  function getValue() {
    return input.value.trim();
  }

  input.addEventListener('focus', () => render({ open: true }));
  input.addEventListener('click', () => render({ open: true }));
  input.addEventListener('input', () => render({ open: true }));
  input.addEventListener('blur', () => {
    window.setTimeout(hide, 100);
  });

  if (field.hidden) {
    hide();
  }

  return {
    setCandidates,
    clear,
    hide,
    getValue
  };
}
