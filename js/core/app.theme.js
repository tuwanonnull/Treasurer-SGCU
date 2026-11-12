/* Apply the saved preference before styles load. Keep the original storage key. */
(() => {
  const key = "sgcu-home-theme";
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  const normalize = value => ["light", "dark"].includes(value) ? value : "system";
  let preference = "system";
  try { preference = normalize(localStorage.getItem(key)); } catch { /* Private storage. */ }

  const apply = () => {
    document.documentElement.dataset.theme = preference === "system"
      ? (system.matches ? "dark" : "light") : preference;
    const picker = document.getElementById("themePreference");
    if (picker) picker.value = preference;
    if (window.Chart?.instances) {
      Object.values(window.Chart.instances).forEach(chart => chart.update("none"));
    }
  };
  window.registerThemeChartPlugin = () => {
    if (!window.Chart || window.Chart.registry.plugins.get("sgcuTheme")) return;
    window.Chart.register({
      id: "sgcuTheme",
      beforeUpdate(chart) {
        const dark = document.documentElement.dataset.theme === "dark";
        const text = dark ? "#b8b8b8" : "#666666";
        const grid = dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.1)";
        if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = text;
        for (const scale of Object.values(chart.options.scales || {})) {
          if (scale.ticks) scale.ticks.color = text;
          if (scale.grid) scale.grid.color = grid;
        }
      }
    });
  };
  apply();
  system.addEventListener("change", apply);
  window.addEventListener("storage", event => {
    if (event.key !== key && event.key !== null) return;
    preference = normalize(event.newValue);
    apply();
  });
  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.getElementById("themePreference")?.addEventListener("change", event => {
      preference = normalize(event.target.value);
      try { localStorage.setItem(key, preference); } catch { /* Keep the session choice. */ }
      apply();
    });
  });
})();
