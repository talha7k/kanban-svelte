import { writable } from 'svelte/store';

const MOBILE_BREAKPOINT = 768;

export const isMobile = writable<boolean>(false);

// Initialize mobile detection
if (typeof window !== 'undefined') {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  const onChange = () => {
    isMobile.set(window.innerWidth < MOBILE_BREAKPOINT);
  };
  
  mql.addEventListener("change", onChange);
  isMobile.set(window.innerWidth < MOBILE_BREAKPOINT);
}
