function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collectPayload(voterName, contestTitle, rankings) {
  const lines = [`VOTER: ${voterName}`, `CONTEST: ${contestTitle}`, ''];
  rankings.forEach((entry, index) => lines.push(`${index + 1}. ${entry}`));
  return lines.join('\n');
}

async function copyPayload(payload) {
  try {
    await navigator.clipboard.writeText(payload);
    alert('Copied to clipboard!\n\n' + payload);
  } catch {
    alert('Copy failed.\n\n' + payload);
  }
}
