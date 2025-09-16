// ===== MATERIAL DESIGN INTERACTIONS - GOLF APP v1.7 =====
// JavaScript para interacciones Material Design: ripple effects, animations, etc.

class MaterialDesign {
  constructor() {
    this.init();
  }

  init() {
    this.initRippleEffects();
    this.initCardHovers();
    this.initFormAnimations();
    this.initNavigationAnimations();
    console.log('Material Design interactions initialized');
  }

  // Ripple Effect para botones
  initRippleEffects() {
    // Add ripple class to all buttons
    const buttons = document.querySelectorAll('.btn, .md-button, .btn-primary, .md-button-filled, .md-button-outlined, .md-button-text');

    buttons.forEach(button => {
      if (!button.classList.contains('md-ripple')) {
        button.classList.add('md-ripple');
      }

      button.addEventListener('click', this.createRipple.bind(this));
    });

    // Add ripple to navigation items
    const navItems = document.querySelectorAll('[data-section], .md-navigation-item');
    navItems.forEach(item => {
      if (!item.classList.contains('md-ripple')) {
        item.classList.add('md-ripple');
      }
      item.addEventListener('click', this.createRipple.bind(this));
    });
  }

  createRipple(event) {
    const button = event.currentTarget;
    const existingRipple = button.querySelector('.ripple-effect');

    if (existingRipple) {
      existingRipple.remove();
    }

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-animation 600ms ease-out;
      pointer-events: none;
      z-index: 1000;
    `;

    // Ensure button has relative positioning
    if (getComputedStyle(button).position === 'static') {
      button.style.position = 'relative';
    }

    button.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  // Enhanced card hover effects
  initCardHovers() {
    const cards = document.querySelectorAll('.card-surface, .md-card');

    cards.forEach(card => {
      // Add elevation class if not present
      if (!card.classList.contains('md-surface-1')) {
        card.classList.add('md-surface-1');
      }

      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = 'var(--md-elevation-3)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'var(--md-elevation-1)';
      });
    });
  }

  // Form field animations
  initFormAnimations() {
    const formFields = document.querySelectorAll('.input-base, .select-base, .textarea-base, .md-text-field');

    formFields.forEach(field => {
      // Add focus ring animation
      field.addEventListener('focus', () => {
        this.animateFieldFocus(field, true);
      });

      field.addEventListener('blur', () => {
        this.animateFieldFocus(field, false);
      });

      // Add input validation states
      field.addEventListener('input', () => {
        this.updateFieldState(field);
      });
    });
  }

  animateFieldFocus(field, isFocused) {
    if (isFocused) {
      field.style.transform = 'scale(1.01)';
      field.style.borderWidth = '2px';
      field.style.borderColor = 'var(--md-primary)';
    } else {
      field.style.transform = 'scale(1)';
      field.style.borderWidth = '1px';
      field.style.borderColor = 'var(--md-outline)';
    }
  }

  updateFieldState(field) {
    const isValid = field.checkValidity();
    const isEmpty = !field.value.trim();

    if (!isEmpty && !isValid) {
      field.style.borderColor = 'var(--md-error)';
      field.style.backgroundColor = 'rgba(186, 26, 26, 0.04)';
    } else if (!isEmpty && isValid) {
      field.style.borderColor = 'var(--md-primary)';
      field.style.backgroundColor = 'var(--md-surface-container-high)';
    } else {
      field.style.borderColor = 'var(--md-outline)';
      field.style.backgroundColor = 'var(--md-surface-container-high)';
    }
  }

  // Navigation animations
  initNavigationAnimations() {
    // Animate drawer open/close
    const drawer = document.getElementById('app-drawer');
    const drawerBtn = document.getElementById('btn-drawer');

    if (drawer && drawerBtn) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const isOpen = !drawer.classList.contains('translate-x-full');
            this.animateDrawer(drawer, isOpen);
          }
        });
      });

      observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    }

    // Animate navigation items
    const navItems = document.querySelectorAll('#app-drawer nav button');
    navItems.forEach((item, index) => {
      item.addEventListener('mouseenter', () => {
        item.style.transform = 'translateX(4px)';
        item.style.backgroundColor = 'rgba(0, 105, 92, 0.08)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.transform = 'translateX(0)';
        item.style.backgroundColor = 'transparent';
      });
    });
  }

  animateDrawer(drawer, isOpen) {
    if (isOpen) {
      // Stagger animation for menu items
      const menuItems = drawer.querySelectorAll('nav button');
      menuItems.forEach((item, index) => {
        setTimeout(() => {
          item.style.animation = `md-fade-in 300ms ease-out both`;
        }, index * 50);
      });
    }
  }

  // Modal animations
  animateModal(modal, isOpening) {
    if (isOpening) {
      modal.style.animation = 'md-modal-enter 300ms ease-out both';
    } else {
      modal.style.animation = 'md-modal-exit 200ms ease-in both';
    }
  }

  // Loading states
  showLoadingState(element, text = 'Loading...') {
    const originalContent = element.innerHTML;
    element.dataset.originalContent = originalContent;

    element.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="md-spinner"></div>
        <span>${text}</span>
      </div>
    `;
    element.disabled = true;
  }

  hideLoadingState(element) {
    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
      delete element.dataset.originalContent;
    }
    element.disabled = false;
  }

  // Success/Error feedback
  showFeedback(type, message, duration = 4000) {
    const feedback = document.createElement('div');
    feedback.className = `md-snackbar md-snackbar-${type}`;
    feedback.innerHTML = `
      <div class="md-snackbar-content">
        <span>${message}</span>
        <button class="md-snackbar-close" onclick="this.parentElement.parentElement.remove()">
          <i data-lucide="x"></i>
        </button>
      </div>
    `;

    // Add snackbar styles if not already added
    if (!document.getElementById('md-snackbar-styles')) {
      const style = document.createElement('style');
      style.id = 'md-snackbar-styles';
      style.textContent = `
        .md-snackbar {
          position: fixed;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--md-surface-container-high);
          color: var(--md-on-surface);
          padding: 16px;
          border-radius: 4px;
          box-shadow: var(--md-elevation-3);
          z-index: 10000;
          animation: md-snackbar-enter 300ms ease-out both;
          max-width: 568px;
          min-width: 344px;
        }
        .md-snackbar-success { border-left: 4px solid var(--md-primary); }
        .md-snackbar-error { border-left: 4px solid var(--md-error); }
        .md-snackbar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .md-snackbar-close {
          background: transparent;
          border: none;
          color: var(--md-on-surface);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .md-snackbar-close:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        @keyframes md-snackbar-enter {
          from { opacity: 0; transform: translate(-50%, 100%); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(feedback);

    // Auto-remove after duration
    setTimeout(() => {
      feedback.style.animation = 'md-snackbar-enter 200ms ease-in reverse both';
      setTimeout(() => feedback.remove(), 200);
    }, duration);

    // Initialize Lucide icons for the close button
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}

// Add ripple animation keyframes
const rippleStyles = document.createElement('style');
rippleStyles.textContent = `
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes md-modal-enter {
    from {
      opacity: 0;
      transform: scale(0.8) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes md-modal-exit {
    from {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    to {
      opacity: 0;
      transform: scale(0.8) translateY(20px);
    }
  }
`;
document.head.appendChild(rippleStyles);

// Initialize Material Design when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.materialDesign = new MaterialDesign();
});

// Export for use in other scripts
window.MaterialDesign = MaterialDesign;