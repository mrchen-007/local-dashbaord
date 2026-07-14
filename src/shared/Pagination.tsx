import { useMemo } from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];

  if (currentPage <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    pages.push(1);
    pages.push('...');
    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  }

  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: PaginationProps) {
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 bg-gray-900 border-t border-gray-700">
      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">每页</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 text-sm rounded bg-gray-800 border border-gray-700 text-gray-300 focus:outline-none focus:border-primary"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-400">条</span>
      </div>

      {/* Page numbers and navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          上一页
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) =>
            typeof page === 'string' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 py-1.5 text-sm text-gray-500 select-none"
              >
                {page}
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[2rem] px-2 py-1.5 text-sm rounded border transition-colors ${
                  page === currentPage
                    ? 'bg-primary text-white border-primary'
                    : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          下一页
        </button>
      </div>

      {/* Current / total */}
      <div className="text-sm text-gray-400">
        第 <span className="text-white font-medium">{currentPage}</span> /{' '}
        <span className="text-white font-medium">{totalPages}</span> 页
      </div>
    </div>
  );
}
