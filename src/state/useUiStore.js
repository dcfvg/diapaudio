import { create } from "zustand";

export const useUiStore = create((set) => ({
  isDragging: false,
  noticesOpen: false,
  hudVisible: false,
  hudPinned: false,
  delayDraft: "",
  setDragging: (isDragging) =>
    set((state) => (state.isDragging === isDragging ? {} : { isDragging })),
  setNoticesOpen: (open) =>
    set((state) => (state.noticesOpen === open ? {} : { noticesOpen: open })),
  showHud: () => set((state) => (state.hudVisible ? {} : { hudVisible: true })),
  hideHud: () => set((state) => (state.hudVisible ? { hudVisible: false } : {})),
  setHudPinned: (hudPinned) => set((state) => (state.hudPinned === hudPinned ? {} : { hudPinned })),
  setDelayDraft: (value) =>
    set((state) => (state.delayDraft === value ? {} : { delayDraft: value })),
}));
