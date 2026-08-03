export function updatePreviewViewport(frame, mode) {
  frame.classList.remove('preview-frame-desktop', 'preview-frame-mobile');
  frame.classList.add(mode === 'mobile' ? 'preview-frame-mobile' : 'preview-frame-desktop');
  frame.dataset.previewMode = mode;
  return frame;
}
