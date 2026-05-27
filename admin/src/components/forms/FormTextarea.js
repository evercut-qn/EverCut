'use client';

import { forwardRef, useId } from 'react';
import { FormField } from './FormField';
import { cn } from '@/lib/utils/cn';

/**
 * Standard text area input wrapped in FormField layouts. Exposes textarea ref.
 *
 * @param {Object} props
 * @param {string} props.label - Textarea label text
 * @param {string} [props.description] - Textarea helper note
 * @param {string} [props.error] - Validation error payload
 * @param {boolean} [props.required] - Asterisk required parameter toggle
 * @param {number} [props.maxLength] - Maximum length parameter (renders a character counter if set)
 * @param {string} [props.value] - Controlled component state value (tracks lengths)
 * @param {string} [props.className] - Textarea style overrides
 * @param {string} [props.wrapperClassName] - Outer layout style overrides
 */
const FormTextarea = forwardRef(function FormTextarea(
  { label, description, error, required, maxLength, value, className, wrapperClassName, ...props },
  ref
) {
  const generatedId = useId();
  const textareaId = props.id || generatedId;
  const charCount = value?.length || 0;

  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      htmlFor={textareaId}
      className={wrapperClassName}
    >
      <div className="relative">
        <textarea
          ref={ref}
          id={textareaId}
          maxLength={maxLength}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-shadow',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-1',
            error 
              ? 'border-destructive focus-visible:ring-destructive' 
              : 'border-border focus-visible:ring-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {maxLength && (
          <p className="text-[10px] text-muted-foreground text-right mt-1">
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </FormField>
  );
});

FormTextarea.displayName = 'FormTextarea';

export { FormTextarea };
export default FormTextarea;
