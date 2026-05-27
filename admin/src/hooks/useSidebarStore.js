import { create } from 'zustand';

/**
 * Zustand store to manage admin panel sidebar display controls.
 * Supports collapsed layouts on desktop and absolute drawer models on mobile viewports.
 *
 * @typedef {Object} SidebarState
 * @property {boolean} isOpen - Mobile drawer toggle status
 * @property {boolean} isCollapsed - Desktop collapsed menu status
 * @property {() => void} toggleOpen - Flips mobile sidebar visibility
 * @property {() => void} toggleCollapse - Flips desktop collapse state
 * @property {(open: boolean) => void} setOpen - Explicitly set open state
 * @property {(collapsed: boolean) => void} setCollapsed - Explicitly set collapse state
 */

export const useSidebarStore = create((set) => ({
  isOpen: false,
  isCollapsed: false,
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setOpen: (open) => set({ isOpen: open }),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
}));
