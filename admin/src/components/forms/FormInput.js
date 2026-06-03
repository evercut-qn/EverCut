'use client';

import { forwardRef, useId } from 'react';
import { FormField } from './FormField';
import { cn } from '@/lib/utils/cn';

/**
 * Reusable text input wrapping FormField layouts. Exposes HTML input ref.
 *
 * @param {Object} props
 * @param {string} props.label - Input field label
 * @param {string} [props.description] - Description text helper
 * @param {string} [props.error] - Validation error details
 * @param {boolean} [props.required] - Required field asterisk toggle
 * @param {string} [props.type='text'] - Input type (text, tel, password, email)
 * @param {string} [props.className] - Tailwind override classes for input element
 * @param {string} [props.wrapperClassName] - Override classes for outer FormField container
 */
const FormInput = forwardRef(function FormInput(
  { label, description, error, required, type = 'text', className, wrapperClassName, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = props.id || generatedId;

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      htmlFor={inputId}
      className={wrapperClassName}
    >
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm transition-shadow',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1',
          error 
            ? 'border-destructive focus-visible:ring-destructive' 
            : 'border-border focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
    </FormField>
  );
});

FormInput.displayName = 'FormInput';

export { FormInput };
export default FormInput;
