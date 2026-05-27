import { create } from 'zustand';

/**
 * Zustand store to manage admin panel sidebar display controls.
 * Supports collapsed layouts on desktop and absolute drawer models on mobile viewports.
 * Uses selective updates to prevent unnecessary component re-renders.
 *
 * @typedef {Object} SidebarState
 * @property {boolean} isOpen - Mobile drawer toggle status
 * @property {boolean} isCollapsed - Desktop collapsed menu status
 * @property {boolean} isHovered - Desktop hover status
 * @property {boolean} isFocused - Desktop keyboard focus status
 * @property {() => void} toggleOpen - Flips mobile sidebar visibility
 * @property {() => void} toggleCollapse - Flips desktop collapse state (backwards-compatible manual toggle)
 * @property {(open: boolean) => void} setOpen - Explicitly set open state
 * @property {(collapsed: boolean) => void} setCollapsed - Explicitly set collapse state (backwards-compatible)
 * @property {(hovered: boolean) => void} setHovered - Explicitly set hover state, updating collapse status
 * @property {(focused: boolean) => void} setFocused - Explicitly set focus state, updating collapse status
 */

export const useSidebarStore = create((set) => ({
  isOpen: false,
  isCollapsed: true, // Collapsed by default on desktop
  isHovered: false,
  isFocused: false,

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setHovered: (hovered) => set((state) => {
    const nextHovered = hovered;
    const nextCollapsed = !(nextHovered || state.isFocused);
    return { isHovered: nextHovered, isCollapsed: nextCollapsed };
  }),

  setFocused: (focused) => set((state) => {
    const nextFocused = focused;
    const nextCollapsed = !(state.isHovered || nextFocused);
    return { isFocused: nextFocused, isCollapsed: nextCollapsed };
  }),

  // Keep compatibility for any manual collapse overrides
  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
}));

export default useSidebarStore;
