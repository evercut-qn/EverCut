'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Toggle switch component (styled HTML checkbox). Exposes input ref.
 *
 * @param {Object} props
 * @param {string} props.label - Toggle label title
 * @param {string} [props.description] - Supplementary note below toggle
 * @param {string} [props.error] - Validation error payload
 * @param {boolean} [props.disabled] - Disabled state
 * @param {string} [props.className] - Toggle box layout overrides
 */
const FormSwitch = forwardRef(function FormSwitch(
  { label, description, error, disabled, className, ...props },
  ref
) {
  const generatedId = useId();
  const switchId = props.id || generatedId;

  return (
    <div className={cn('flex items-center justify-between rounded-lg border border-border p-4 bg-card', className)}>
      <div className="space-y-0.5 pr-4">
        <label htmlFor={switchId} className="text-sm font-semibold select-none cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {error && (
          <p className="text-xs text-destructive font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          id={switchId}
          type="checkbox"
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div
          onClick={() => {
            if (disabled) return;
            const el = document.getElementById(switchId);
            if (el) el.click();
          }}
          className={cn(
            "w-9 h-5 bg-muted rounded-full cursor-pointer relative transition-colors focus-visible:outline-none",
            "peer-focus:ring-2 peer-focus:ring-primary/20",
            "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all",
            "peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>
    </div>
  );
});

FormSwitch.displayName = 'FormSwitch';

export { FormSwitch };
export default FormSwitch;
