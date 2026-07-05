/**
 * Menampilkan pesan toast yang melayang di layar
 * @param {string} message - Pesan yang ingin ditampilkan
 * @param {'success'|'error'|'info'|'warning'} type - Jenis notifikasi
 * @returns {object} Kontroler toast untuk memperbarui atau menghapus toast secara manual
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return null;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Icon based on type
  function getIcon(t) {
    if (t === 'success') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else if (t === 'error') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (t === 'warning') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
  }

  toast.innerHTML = `
    <div class="toast-icon">${getIcon(type)}</div>
    <div class="toast-content">${message}</div>
  `;

  container.appendChild(toast);

  let autoRemoveTimeout = setTimeout(() => {
    removeToast();
  }, 4000);

  function removeToast() {
    if (autoRemoveTimeout) {
      clearTimeout(autoRemoveTimeout);
      autoRemoveTimeout = null;
    }
    toast.classList.add('removing');
    const onAnimationEnd = () => {
      toast.remove();
      toast.removeEventListener('animationend', onAnimationEnd);
    };
    toast.addEventListener('animationend', onAnimationEnd);
  }

  return {
    update: (newMessage, newType = type) => {
      const content = toast.querySelector('.toast-content');
      const icon = toast.querySelector('.toast-icon');
      if (content) content.innerHTML = newMessage;
      if (icon && newType !== type) {
        toast.className = `toast toast-${newType}`;
        icon.innerHTML = getIcon(newType);
      }
    },
    remove: removeToast
  };
}
