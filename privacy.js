'use strict';
document.querySelector('#clear-kit')?.addEventListener('click', () => {
  const status = document.querySelector('#privacy-status');
  try { localStorage.removeItem('devil-eye-kit'); status.textContent = 'Your saved kit has been cleared on this device.'; }
  catch { status.textContent = 'Browser storage is unavailable. You can also clear site data in your browser settings.'; }
});
