export function estimateDataUrlBytes(dataUrl) {
  const payload = String(dataUrl || '').split(',')[1] || '';
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

export function processBannerImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 220;
        const widthScale = maxWidth / Math.max(1, img.width);
        const heightScale = maxHeight / Math.max(1, img.height);
        const scale = Math.min(1, widthScale, heightScale);
        const width = Math.max(240, Math.round(img.width * scale));
        const height = Math.max(60, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(img, 0, 0, width, height);

        const qualitySteps = [0.62, 0.54, 0.46, 0.38, 0.3];
        let chosenDataUrl = canvas.toDataURL('image/jpeg', qualitySteps[0]);
        for (const quality of qualitySteps) {
          const candidate = canvas.toDataURL('image/jpeg', quality);
          chosenDataUrl = candidate;
          if (estimateDataUrlBytes(candidate) <= 160 * 1024) {
            break;
          }
        }
        resolve(chosenDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function processFooterLogoImage(sourceImage) {
  return new Promise((resolve) => {
    const maxWidth = 78;
    const maxHeight = 78;
    const widthScale = maxWidth / Math.max(1, sourceImage.width);
    const heightScale = maxHeight / Math.max(1, sourceImage.height);
    const scale = Math.min(1, widthScale, heightScale);
    const width = Math.max(24, Math.round(sourceImage.width * scale));
    const height = Math.max(24, Math.round(sourceImage.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(sourceImage, 0, 0, width, height);

    const webpProbe = canvas.toDataURL('image/webp', 0.6);
    const supportsWebp = webpProbe.startsWith('data:image/webp');

    if (supportsWebp) {
      const qualitySteps = [0.64, 0.54, 0.44, 0.36];
      let chosen = webpProbe;
      for (const quality of qualitySteps) {
        const candidate = canvas.toDataURL('image/webp', quality);
        chosen = candidate;
        if (estimateDataUrlBytes(candidate) <= 18 * 1024) {
          break;
        }
      }
      resolve(chosen);
      return;
    }

    resolve(canvas.toDataURL('image/png'));
  });
}

export async function loadDefaultFooterBrandLogo(candidatePaths) {
  for (const path of candidatePaths) {
    try {
      const response = await fetch(path, { cache: 'force-cache' });
      if (!response.ok) continue;

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      const dataUrl = await new Promise((resolve) => {
        image.onload = async () => {
          const compressed = await processFooterLogoImage(image);
          URL.revokeObjectURL(objectUrl);
          resolve(compressed);
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve('');
        };
        image.src = objectUrl;
      });

      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        return dataUrl;
      }
    } catch {
      // Try next path.
    }
  }

  return '';
}

export function renderBuilderFooter({ refs, state, fallbackText }) {
  if (refs.builderFooterText) {
    refs.builderFooterText.textContent = state.footerBrandText || fallbackText;
  }

  if (!refs.builderFooterLogo) return;
  if (state.footerBrandLogo && state.footerBrandLogo.startsWith('data:image/')) {
    refs.builderFooterLogo.src = state.footerBrandLogo;
    refs.builderFooterLogo.hidden = false;
  } else {
    refs.builderFooterLogo.removeAttribute('src');
    refs.builderFooterLogo.hidden = true;
  }
}

export function renderBannerPreview({ refs, state }) {
  if (!refs.bannerPreview || !refs.clearBannerBtn) return;
  if (!state.bannerImage) {
    refs.bannerPreview.hidden = true;
    refs.bannerPreview.innerHTML = '';
    refs.clearBannerBtn.hidden = true;
    return;
  }

  const sizeKb = Math.max(1, Math.round(estimateDataUrlBytes(state.bannerImage) / 1024));
  refs.bannerPreview.hidden = false;
  refs.bannerPreview.innerHTML = `
    <img src="${state.bannerImage}" alt="Banner preview" />
    <small>Compressed banner size: ${sizeKb} KB</small>
  `;
  refs.clearBannerBtn.hidden = false;
}