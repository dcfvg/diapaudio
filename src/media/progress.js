/**
 * ProgressManager mirrors the imperative loader updates from the legacy code.
 * It keeps a minimal internal state and notifies the host UI whenever updates occur.
 */
export class ProgressManager {
  constructor({ onUpdate } = {}) {
    this.onUpdate = typeof onUpdate === "function" ? onUpdate : null;
    this.globalState = null;
  }

  start(totalSteps, { statusKey = "processingFiles", details = "" } = {}) {
    if (!Number.isFinite(totalSteps) || totalSteps <= 0) {
      this.globalState = null;
      return;
    }
    this.globalState = {
      total: totalSteps,
      current: 0,
      lastPercent: 0,
      statusKey,
      details,
    };
    this.#notify({
      percent: 0,
      statusKey,
      details,
    });
  }

  increment(details = "") {
    if (!this.globalState) {
      return;
    }
    this.globalState.current += 1;
    const percent = Math.round(
      (this.globalState.current / Math.max(1, this.globalState.total)) * 100
    );
    this.globalState.lastPercent = percent;
    this.#notify({
      percent,
      statusKey: this.globalState.statusKey,
      details,
    });
  }

  finish({ statusKey = "processingFiles", details = "" } = {}) {
    if (!this.globalState) {
      return;
    }
    this.globalState.lastPercent = 100;
    this.#notify({
      percent: 100,
      statusKey,
      details,
    });
    this.globalState = null;
  }

  update(percent, statusKey, details = "") {
    if (this.globalState && typeof percent === "number") {
      percent = this.globalState.lastPercent;
    }
    this.#notify({
      percent,
      statusKey,
      details,
    });
  }

  reset() {
    this.globalState = null;
    this.#notify({
      percent: null,
      statusKey: null,
      details: "",
    });
  }

  #notify(payload) {
    if (this.onUpdate) {
      this.onUpdate(payload);
    }
  }
}

export default ProgressManager;
