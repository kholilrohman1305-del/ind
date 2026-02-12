/**
 * Modern Toast Notification System
 * Professional notifications untuk setiap aksi
 */

// Container setup
let toastContainer = null;

function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (default 4000)
 */
function showToast(message, type = 'info', duration = 4000) {
  const container = initToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast-item transform translate-x-[400px] transition-all duration-500 ease-out`;

  // Type configurations
  const config = {
    success: {
      bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>',
      ring: 'ring-2 ring-emerald-500/20'
    },
    error: {
      bg: 'bg-gradient-to-r from-rose-500 to-red-500',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>',
      ring: 'ring-2 ring-rose-500/20'
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
      ring: 'ring-2 ring-amber-500/20'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
      ring: 'ring-2 ring-blue-500/20'
    }
  };

  const conf = config[type] || config.info;

  toast.innerHTML = `
    <div class="${conf.bg} ${conf.ring} text-white pl-5 pr-4 py-4 rounded-2xl shadow-2xl backdrop-blur-sm flex items-start gap-3 min-w-[320px] max-w-sm group hover:scale-105 transition-transform duration-200">
      <div class="flex-shrink-0 mt-0.5">
        ${conf.icon}
      </div>
      <div class="flex-1 text-sm font-medium leading-relaxed pr-2">
        ${message}
      </div>
      <button class="close-toast flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity" onclick="this.closest('.toast-item').remove()">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-[400px]');
    toast.classList.add('translate-x-0');
  });

  // Auto remove
  setTimeout(() => {
    toast.classList.add('translate-x-[400px]', 'opacity-0');
    setTimeout(() => toast.remove(), 500);
  }, duration);
}

// Convenience methods
window.toast = {
  success: (message, duration) => showToast(message, 'success', duration),
  error: (message, duration) => showToast(message, 'error', duration),
  warning: (message, duration) => showToast(message, 'warning', duration),
  info: (message, duration) => showToast(message, 'info', duration),
  show: showToast
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToastContainer);
} else {
  initToastContainer();
}
