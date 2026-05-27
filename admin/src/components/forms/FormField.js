'use client';

import { cn } from '@/lib/utils/cn';

/**
 * Layout wrapper for form fields. Renders label, child input, helper text, and error alert.
 *
 * @param {Object} props
 * @param {string} props.label - Field label text
 * @param {string} [props.description] - Helper text shown below the input
 * @param {string} [props.error] - Validation error message to display
 * @param {boolean} [props.required=false] - Shows red asterisk (*) if true
 * @param {string} [props.htmlFor] - Input id linking elements for accessibility
 * @param {string} [props.className] - Custom tailwind styling classes
 * @param {React.ReactNode} props.children - The child input tag to render
 */
export function FormField({
  label,
  description,
  error,
  required = false,
  htmlFor,
  className,
  children,
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className={cn(
            'text-xs font-semibold select-none',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            error ? 'text-destructive' : 'text-foreground/80'
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-destructive font-bold" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-xs text-destructive font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export default FormField;
