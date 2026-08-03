async function copyPayloadToClipboard(payload) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
    } else {
      throw new Error('Clipboard API unavailable');
    }
    alert('Copied to clipboard!\n\n' + payload);
  } catch {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = payload;
      textArea.setAttribute('readonly', 'true');
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copied = document.execCommand && document.execCommand('copy');
      document.body.removeChild(textArea);

      if (copied) {
        alert('Copied to clipboard!\n\n' + payload);
        return;
      }
    } catch {
      // Fall through to the failure message below.
    }

    alert('Copy failed.\n\n' + payload);
  }
}

function triggerDownload(payload, outputSettings, contestTitle) {
  const contentType = outputSettings.contentFormat === 'json'
    ? 'application/json;charset=utf-8'
    : outputSettings.contentFormat === 'csv'
      ? 'text/csv;charset=utf-8'
      : 'text/plain;charset=utf-8';
  const blob = new Blob([payload], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = buildOutputFileName(contestTitle, outputSettings);
  anchor.click();
  URL.revokeObjectURL(url);
}

function triggerMailto(payload, outputSettings, contestTitle) {
  const bodyPrefix = String(outputSettings.mailtoBodyPrefix || '').trim();
  const body = bodyPrefix ? `${bodyPrefix}\n\n${payload}` : payload;
  const subject = outputSettings.mailtoSubject || `Ballot results: ${contestTitle}`;
  const recipient = outputSettings.mailtoTo || '';
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
}

async function deliverBallotOutput({ outputSettings, fallbackOutputSettings, voterName, contestTitle, rankings }) {
  const settings = normalizeOutputSettings(outputSettings, fallbackOutputSettings);
  const payload = formatOutputPayload({
    voterName,
    contestTitle,
    rankings,
    contentFormat: settings.contentFormat,
    csvDelimiter: settings.csvDelimiter
  });

  if (settings.deliveryMethod === 'download') {
    triggerDownload(payload, settings, contestTitle);
    return;
  }

  if (settings.deliveryMethod === 'mailto') {
    triggerMailto(payload, settings, contestTitle);
    return;
  }

  await copyPayloadToClipboard(payload);
}