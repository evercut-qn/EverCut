export function normalizePagination(meta, fallback = {}) {
  return meta?.pagination || {
    currentPage: fallback.page || 1,
    totalPages: 1,
    totalDocuments: fallback.totalDocuments || 0,
    hasNextPage: false,
    hasPrevPage: false,
  };
}
