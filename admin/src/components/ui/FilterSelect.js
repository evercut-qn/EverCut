'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function FilterSelect({ name, label, value = '', options = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(event) {
    const params = new URLSearchParams(searchParams.toString());
    const nextValue = event.target.value;

    if (nextValue) {
      params.set(name, nextValue);
    } else {
      params.delete(name);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  }

  return (
    <label className="flex min-w-36 flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        name={name}
        value={value || ''}
        onChange={handleChange}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default FilterSelect;
