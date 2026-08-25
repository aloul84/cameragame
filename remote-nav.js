(function () {
  if (window.__remoteNavReady) return;
  window.__remoteNavReady = true;

  const focusClass = 'remote-focus';
  const focusablesSelector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let focusIndex = 0;

  function ensureStyles() {
    if (document.getElementById('remote-nav-styles')) return;
    const style = document.createElement('style');
    style.id = 'remote-nav-styles';
    style.textContent = `
      .remote-focus {
        outline: 4px solid #facc15 !important;
        outline-offset: 4px !important;
        box-shadow: 0 0 0 6px rgba(250, 204, 21, 0.32), 0 0 18px rgba(250, 204, 21, 0.6) !important;
        transform: scale(1.02);
        transition: all 0.15s ease;
      }
      #remote-back-btn {
        position: fixed !important;
        right: 18px !important;
        bottom: 18px !important;
        z-index: 99999 !important;
        background: linear-gradient(135deg, #ef4444, #b91c1c) !important;
        color: white !important;
        border: 2px solid rgba(255,255,255,0.7) !important;
        border-radius: 999px !important;
        padding: 14px 22px !important;
        font-size: 1.1rem !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        box-shadow: 0 12px 28px rgba(239, 68, 68, 0.4) !important;
      }
      #remote-back-btn:hover {
        filter: brightness(1.08);
      }
    `;
    document.head.appendChild(style);
  }

  function isIndexPage() {
    const pageName = (window.location.pathname || '').split('/').pop().toLowerCase();
    return pageName === '' || pageName === 'index.html';
  }

  function createBackButton() {
    if (document.getElementById('remote-back-btn')) return;
    const button = document.createElement('button');
    button.id = 'remote-back-btn';
    button.type = 'button';
    button.textContent = 'رجوع';
    button.setAttribute('aria-label', 'العودة إلى القائمة الرئيسية');
    button.addEventListener('click', () => {
      if (!isIndexPage()) {
        window.location.href = 'index.html';
      }
    });
    document.body.appendChild(button);
  }

  function getFocusableElements() {
    const items = Array.from(document.querySelectorAll(focusablesSelector));
    const backButton = document.getElementById('remote-back-btn');

    return items.concat(backButton ? [backButton] : []).filter((el) => {
      if (!el) return false;
      if (el.disabled) return false;
      if (el.id === 'remote-back-btn' && isIndexPage()) return false;
      const tag = el.tagName && el.tagName.toLowerCase();
      if (tag === 'input' && (el.type === 'hidden' || el.type === 'file')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function moveFocus(delta) {
    const items = getFocusableElements();
    if (!items.length) return;
    focusIndex = (focusIndex + delta + items.length) % items.length;
    updateSelection();
  }

  function updateSelection() {
    const items = getFocusableElements();
    if (!items.length) return;
    if (focusIndex >= items.length) focusIndex = 0;
    if (focusIndex < 0) focusIndex = items.length - 1;

    items.forEach((item, index) => {
      const isSelected = index === focusIndex;
      item.classList.toggle(focusClass, isSelected);
      if (isSelected) {
        item.focus({ preventScroll: true });
        item.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
      }
    });
  }

  function activateCurrent() {
    const items = getFocusableElements();
    const current = items[focusIndex];
    if (!current) return;

    if (current.id === 'remote-back-btn') {
      current.click();
      return;
    }

    if (typeof current.click === 'function') {
      current.click();
      return;
    }

    if (current.tagName === 'A' && current.href) {
      window.location.href = current.href;
    }
  }

  function goBack() {
    if (isIndexPage()) {
      return;
    }
    window.location.href = 'index.html';
  }

  function onKeyDown(event) {
    const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
    const isTextField = ['input', 'textarea', 'select'].includes(tag);
    if (isTextField) return;

    const key = event.key;
    const keyCode = event.keyCode;
    const isBackKey = ['Backspace', 'Escape', 'Delete', 'BrowserBack', 'MediaRewind'].includes(key) || keyCode === 8 || keyCode === 27;
    const isEnterKey = ['Enter', 'NumpadEnter', 'OK'].includes(key) || keyCode === 13 || event.code === 'Space';

    if (isBackKey) {
      event.preventDefault();
      goBack();
      return;
    }

    if (isEnterKey) {
      event.preventDefault();
      activateCurrent();
      return;
    }

    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(key)) {
      event.preventDefault();
      moveFocus(1);
      return;
    }

    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(key)) {
      event.preventDefault();
      moveFocus(-1);
      return;
    }
  }

  function syncFromClick(event) {
    const target = event.target && event.target.closest ? event.target.closest('a[href], button, input, select, textarea') : null;
    if (!target) return;
    const items = getFocusableElements();
    const index = items.indexOf(target);
    if (index >= 0) {
      focusIndex = index;
      updateSelection();
    }
  }

  function init() {
    ensureStyles();
    createBackButton();
    const items = getFocusableElements();
    if (items.length) {
      focusIndex = 0;
      updateSelection();
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', syncFromClick);
  window.addEventListener('load', init);
  window.addEventListener('resize', updateSelection);
  init();
  setTimeout(init, 250);
})();
