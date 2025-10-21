export const createProgressSlice = (set) => ({
  loading: false,
  error: null,
  progress: { percent: 0, statusKey: "", details: "" },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Internal helpers for other actions to update progress/loading consistently
  _setLoading: (value) => set({ loading: Boolean(value) }),
  _setProgress: (percent, statusKey = "", details = "") =>
    set({ progress: { percent, statusKey, details } }),
});

export default createProgressSlice;
