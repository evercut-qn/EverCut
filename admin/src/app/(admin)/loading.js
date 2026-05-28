/**
 * Route-group loading component to display skeleton blocks during Server Component data fetching.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 w-full animate-pulse p-2 select-none">
      {/* Title Placeholder */}
      <div className="space-y-2">
        <div className="h-6 w-48 bg-muted rounded-md" />
        <div className="h-4 w-96 bg-muted rounded-md" />
      </div>

      {/* Metric Cards Placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 bg-muted rounded-lg" />
        <div className="h-28 bg-muted rounded-lg" />
        <div className="h-28 bg-muted rounded-lg" />
      </div>

      {/* Table Placeholder */}
      <div className="border border-border rounded-lg bg-card p-6 space-y-4">
        <div className="h-10 bg-muted rounded-md w-full" />
        <div className="space-y-2">
          <div className="h-12 bg-muted rounded-md w-full" />
          <div className="h-12 bg-muted rounded-md w-full" />
          <div className="h-12 bg-muted rounded-md w-full" />
        </div>
      </div>
    </div>
  );
}
