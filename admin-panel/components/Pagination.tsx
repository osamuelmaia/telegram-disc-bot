import Link from 'next/link';

interface Props {
  page: number;
  pages: number;
  total: number;
  buildHref: (page: number) => string;
}

export function Pagination({ page, pages, total, buildHref }: Props) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
      <span>
        Página {page} de {pages} &mdash; {total} registro{total !== 1 ? 's' : ''}
      </span>
      <div className="flex gap-1">
        {page > 1 && (
          <Link
            href={buildHref(page - 1)}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
          >
            ← Anterior
          </Link>
        )}
        {page < pages && (
          <Link
            href={buildHref(page + 1)}
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
          >
            Próxima →
          </Link>
        )}
      </div>
    </div>
  );
}
