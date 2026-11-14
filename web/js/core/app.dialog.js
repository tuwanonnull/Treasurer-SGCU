/* Dialog and focus-trap helpers shared across feature modules */
const SGCU_DIALOG = (() => {
  const focusTrapHandlers = new Map();
  let activeModalEl = null;
  let lastModalFocusedEl = null;
  let lastMenuFocusedEl = null;

  const focusableSelector =
    "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']), " +
    "select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

  function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(focusableSelector)).filter(
      (el) => el.offsetParent !== null && !el.hasAttribute("disabled")
    );
  }

  function enableFocusTrap(container) {
    if (!container || focusTrapHandlers.has(container)) return;
    const handler = (e) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusableElements(container);
      if (!focusables.length) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const isShift = e.shiftKey;
      if (isShift && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!isShift && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };
    container.addEventListener("keydown", handler);
    focusTrapHandlers.set(container, handler);
  }

  function disableFocusTrap(container) {
    const handler = focusTrapHandlers.get(container);
    if (!handler) return;
    container.removeEventListener("keydown", handler);
    focusTrapHandlers.delete(container);
  }

  function openDialog(modalEl, options = {}) {
    if (!modalEl) return;
    lastModalFocusedEl = document.activeElement;
    modalEl.classList.add("show");
    modalEl.setAttribute("aria-hidden", "false");
    if (!modalEl.hasAttribute("tabindex")) modalEl.setAttribute("tabindex", "-1");
    document.body.classList.add("has-modal");
    activeModalEl = modalEl;

    enableFocusTrap(modalEl);

    const target = options.focusSelector
      ? modalEl.querySelector(options.focusSelector)
      : null;
    const fallback = getFocusableElements(modalEl)[0];
    const focusTarget = target || fallback || modalEl;
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus({ preventScroll: true });
    }
  }

  function closeDialog(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove("show");
    modalEl.setAttribute("aria-hidden", "true");
    disableFocusTrap(modalEl);
    if (activeModalEl === modalEl) activeModalEl = null;
    document.body.classList.remove("has-modal");
    if (lastModalFocusedEl && typeof lastModalFocusedEl.focus === "function") {
      lastModalFocusedEl.focus({ preventScroll: true });
    }
  }

  function getActiveDialog() {
    return activeModalEl;
  }

  function setMobileMenuState(menuEl, buttonEl, isExpanded) {
    if (!menuEl || !buttonEl) return;
    menuEl.classList.toggle("show", isExpanded);
    menuEl.setAttribute("aria-hidden", isExpanded ? "false" : "true");
    buttonEl.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    if (!menuEl.hasAttribute("tabindex")) menuEl.setAttribute("tabindex", "-1");
    document.body.classList.toggle("mobile-menu-open", isExpanded);
    window.dispatchEvent(new CustomEvent("sgcu:mobile-menu-state", { detail: { isExpanded } }));

    if (isExpanded) {
      lastMenuFocusedEl = document.activeElement;
      enableFocusTrap(menuEl);
      const focusable = getFocusableElements(menuEl);
      if (focusable[0]) {
        focusable[0].focus({ preventScroll: true });
      } else {
        menuEl.focus({ preventScroll: true });
      }
    } else {
      disableFocusTrap(menuEl);
      if (lastMenuFocusedEl && typeof lastMenuFocusedEl.focus === "function") {
        lastMenuFocusedEl.focus({ preventScroll: true });
      }
    }
  }

  return {
    closeDialog,
    getActiveDialog,
    openDialog,
    setMobileMenuState
  };
})();

const openDialog = SGCU_DIALOG.openDialog;
const closeDialog = SGCU_DIALOG.closeDialog;
const getActiveDialog = SGCU_DIALOG.getActiveDialog;
const setMobileMenuState = SGCU_DIALOG.setMobileMenuState;
