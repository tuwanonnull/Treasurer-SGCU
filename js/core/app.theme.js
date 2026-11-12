/* Apply the saved preference before styles load. Keep the original storage key. */
(() => {
  const key = "sgcu-home-theme";
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  const normalize = value => ["light", "dark"].includes(value) ? value : "system";
  const preferences = ["light", "dark", "system"];
  const labels = { light: "สว่าง", dark: "มืด", system: "ตามระบบ" };
  let preference = "system";
  try { preference = normalize(localStorage.getItem(key)); } catch { /* Private storage. */ }

  let themeTransition = null;
  const renderTheme = () => {
    document.documentElement.dataset.theme = preference === "system"
      ? (system.matches ? "dark" : "light") : preference;
    const picker = document.getElementById("themePreference");
    if (picker) {
      picker.value = preference;
      const next = preferences[(preferences.indexOf(preference) + 1) % preferences.length];
      picker.setAttribute("aria-label", `ธีมการแสดงผล: ${labels[preference]} กดเพื่อเปลี่ยนเป็น${labels[next]}`);
      picker.querySelector("[data-theme-label]").textContent = labels[preference];
      picker.querySelectorAll("[data-theme-icon]").forEach(icon => {
        icon.toggleAttribute("hidden", icon.dataset.themeIcon !== preference);
      });
    }
    if (window.Chart?.instances) {
      Object.values(window.Chart.instances).forEach(chart => chart.update("none"));
    }
  };
  const apply = (animate = false) => {
    const nextTheme = preference === "system" ? (system.matches ? "dark" : "light") : preference;
    const shouldAnimate = animate && document.startViewTransition &&
      document.documentElement.dataset.theme !== nextTheme &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    themeTransition?.skipTransition();
    themeTransition = null;
    if (!shouldAnimate) {
      document.documentElement.classList.remove("theme-changing");
      renderTheme();
      return;
    }
    // Crossfade the complete frame so menu gradients, icons and text change together.
    const transition = document.startViewTransition(() => {
      if (themeTransition !== transition) return;
      document.documentElement.classList.add("theme-changing");
      renderTheme();
    });
    themeTransition = transition;
    transition.finished.catch(() => {}).finally(() => {
      if (themeTransition === transition) {
        themeTransition = null;
        document.documentElement.classList.remove("theme-changing");
      }
    });
  };
  window.registerThemeChartPlugin = () => {
    if (!window.Chart || window.Chart.registry.plugins.get("sgcuTheme")) return;
    const tooltipDefaults = new WeakMap();
    window.Chart.register({
      id: "sgcuTheme",
      beforeUpdate(chart) {
        const dark = document.documentElement.dataset.theme === "dark";
        const text = dark ? "#b8b8b8" : "#666666";
        const grid = dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.1)";
        if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = text;
        const tooltip = chart.options.plugins?.tooltip;
        if (tooltip) {
          const colors = { backgroundColor: "#2c2c2c", titleColor: "#f2f2f2", bodyColor: "#f2f2f2", borderColor: "#555555" };
          if (!tooltipDefaults.has(chart)) {
            tooltipDefaults.set(chart, Object.fromEntries(Object.keys(colors).map(key => [key, tooltip[key]])));
          }
          Object.assign(tooltip, dark ? colors : tooltipDefaults.get(chart));
        }
        for (const scale of Object.values(chart.options.scales || {})) {
          if (scale.ticks) scale.ticks.color = text;
          if (scale.grid) scale.grid.color = grid;
        }
      }
    });
  };
  apply();
  system.addEventListener("change", () => apply(true));
  window.addEventListener("storage", event => {
    if (event.key !== key && event.key !== null) return;
    preference = normalize(event.newValue);
    apply(true);
  });
  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.getElementById("themePreference")?.addEventListener("click", () => {
      preference = preferences[(preferences.indexOf(preference) + 1) % preferences.length];
      try { localStorage.setItem(key, preference); } catch { /* Keep the session choice. */ }
      apply(true);
    });
  });
})();
