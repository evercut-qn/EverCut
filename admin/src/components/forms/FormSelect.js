'use client';

import { forwardRef, useId } from 'react';
import { FormField } from './FormField';
import { cn } from '@/lib/utils/cn';

/**
 * Standard HTML select element wrapped in FormField layouts. Exposes select ref.
 *
 * @param {Object} props
 * @param {string} props.label - Select dropdown label
 * @param {Array<{value: string, label: string}>} props.options - List of option pairs
 * @param {string} [props.placeholder] - Selection placeholder
 * @param {string} [props.error] - Validation error details
 * @param {boolean} [props.required] - Required asterisk toggle
 * @param {string} [props.description] - Helper label
 * @param {string} [props.className] - Tailwind classes for select tag
 * @param {string} [props.wrapperClassName] - Override classes for outer FormField container
 */
const FormSelect = forwardRef(function FormSelect(
  { label, options = [], placeholder, error, required, description, className, wrapperClassName, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = props.id || generatedId;

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      htmlFor={selectId}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm transition-shadow',
          'focus-visible:outline-none focus-visible:ring-1',
          error 
            ? 'border-destructive focus-visible:ring-destructive' 
            : 'border-border focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
});

FormSelect.displayName = 'FormSelect';

export { FormSelect };
export default FormSelect;
