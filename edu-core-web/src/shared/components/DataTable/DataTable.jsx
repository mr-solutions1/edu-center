import React from 'react';

import { cn } from '../../utils';

const DataTable = ({ columns, data, isLoading, className }) => {
  return (
    <div
      className={cn('relative overflow-x-auto border-none shadow-sm rounded-2xl bg-white', className)}
    >
      <table className="w-full text-sm text-right text-foreground">
        <thead className="text-xs uppercase bg-primary text-primary-foreground border-b">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} scope="col" className={cn(
                "px-6 py-4 font-bold tracking-wider first:rounded-tr-2xl last:rounded-tl-2xl",
                idx === 0 && "pr-8"
              )}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, ridx) => (
              <tr key={ridx} className="animate-pulse">
                {columns.map((_, cidx) => (
                  <td key={cidx} className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length > 0 ? (
            data.map((row, ridx) => (
              <tr
                key={ridx}
                className="bg-white hover:bg-secondary/5 transition-all duration-200 group"
              >
                {columns.map((col, cidx) => (
                  <td key={cidx} className={cn(
                    "px-6 py-4 whitespace-nowrap font-medium text-gray-600 group-hover:text-primary transition-colors",
                    cidx === 0 && "pr-8"
                  )}>
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-10 text-center text-muted-foreground"
              >
                لا يوجد بيانات للعرض
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
