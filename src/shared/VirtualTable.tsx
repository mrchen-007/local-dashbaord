import { ReactNode, CSSProperties } from 'react';
import { FixedSizeList } from 'react-window';

export interface ColumnDef<T = any> {
  key: string;
  label: string;
  width: number | string;
  align?: 'left' | 'right' | 'center';
  renderCell?: (column: ColumnDef<T>, item: T, index: number) => ReactNode;
}

interface VirtualTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowHeight?: number;
  height?: number;
  onRowClick?: (item: T, index: number) => void;
  emptyText?: string;
}

function getAlignClass(align?: 'left' | 'right' | 'center') {
  switch (align) {
    case 'right':
      return 'text-right';
    case 'center':
      return 'text-center';
    default:
      return 'text-left';
  }
}

export default function VirtualTable<T>({
  columns,
  data,
  rowHeight = 48,
  height = 600,
  onRowClick,
  emptyText = '无匹配项目',
}: VirtualTableProps<T>) {
  const listHeight = Math.max(height - rowHeight, 0);

  return (
    <div style={{ height }} className="flex flex-col">
      {/* Sticky header */}
      <div
        className="flex items-center bg-gray-900 text-gray-400 text-xs font-medium border-b border-gray-700"
        style={{ height: rowHeight, flexShrink: 0 }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={`px-4 ${getAlignClass(col.align)}`}
            style={{ width: col.width, flexShrink: 0 }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          {emptyText}
        </div>
      ) : (
        <FixedSizeList
          height={listHeight}
          itemCount={data.length}
          itemSize={rowHeight}
          width="100%"
        >
          {({ index, style }: { index: number; style: CSSProperties }) => {
            const item = data[index];
            return (
              <div
                style={{
                  ...style,
                  display: 'flex',
                  alignItems: 'center',
                }}
                className="bg-gray-800 border-b border-gray-700/50 hover:bg-gray-700 cursor-pointer"
                onClick={() => onRowClick?.(item, index)}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={`px-4 text-sm ${getAlignClass(col.align)}`}
                    style={{
                      width: col.width,
                      flexShrink: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.renderCell
                      ? col.renderCell(col, item, index)
                      : (item as Record<string, any>)[col.key]}
                  </div>
                ))}
              </div>
            );
          }}
        </FixedSizeList>
      )}
    </div>
  );
}
