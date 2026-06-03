import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names and resolves conflicting Tailwind utility classes.
 *
 * @param {...import('clsx').ClassValue} inputs - Array of classes, objects, or arrays
 * @returns {string} Clean merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
