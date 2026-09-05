// Every list page in the app paginates client-side at this page size,
// slicing whatever's already been fetched (filters/search still happen
// server-side or over the full array before this runs).
export const PAGE_SIZE = 20;

export function paginate<T>(items: T[], page: number, pageSize: number = PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
