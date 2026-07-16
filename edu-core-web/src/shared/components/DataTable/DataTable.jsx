import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import { cn } from '../../utils';

const DataTable = ({ columns, data = [], isLoading, className }) => {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (ridx) => {
    setExpandedRows((prev) => ({
      ...prev,
      [ridx]: !prev[ridx],
    }));
  };

  return (
    <div className={cn('w-full', className)}>
      {/* MOBILE CARD VIEW (< md, < 768px) */}
      <div className="block md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, ridx) => (
            <div key={ridx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-2/3"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
          ))
        ) : data.length > 0 ? (
          data.map((row, ridx) => {
            const isExpanded = !!expandedRows[ridx];
            // Treat first column as primary key/header
            const firstCol = columns[0];
            const primaryValue = firstCol ? (firstCol.cell ? firstCol.cell(row) : row[firstCol.accessor]) : '';

            return (
              <div
                key={ridx}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200"
              >
                {/* Card Header Tap Area */}
                <div
                  onClick={() => toggleRow(ridx)}
                  className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 select-none"
                >
                  <div className="flex-1 min-w-0 text-right">
                    <span className="text-[10px] font-black text-secondary tracking-widest block mb-0.5 uppercase">
                      {firstCol?.header}
                    </span>
                    <div className="text-sm font-extrabold text-slate-800 truncate">
                      {primaryValue}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 text-slate-400">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Expanded details list */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-50 bg-slate-50/30 divide-y divide-slate-100 text-right animate-fadeIn">
                    {columns.slice(1).map((col, cidx) => {
                      const val = col.cell ? col.cell(row) : row[col.accessor];
                      return (
                        <div key={cidx} className="py-2.5 flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400">
                            {col.header}
                          </span>
                          <div className="text-xs font-semibold text-slate-700 leading-relaxed break-words">
                            {val !== undefined && val !== null ? val : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-xs font-bold text-slate-400 shadow-sm border">
            لا يوجد بيانات للعرض
          </div>
        )}
      </div>

      {/* DESKTOP/TABLET TABLE GRID (>= md, >= 768px) */}
      <div className="hidden md:block overflow-x-auto border-none shadow-sm rounded-2xl bg-white">
        <table className="w-full text-sm text-right text-foreground">
          <thead className="text-xs uppercase bg-primary text-primary-foreground border-b">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={cn(
                    'px-6 py-4 font-bold tracking-wider first:rounded-tr-2xl last:rounded-tl-2xl',
                    idx === 0 && 'pr-8'
                  )}
                >
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
                    <td
                      key={cidx}
                      className={cn(
                        'px-6 py-4 whitespace-nowrap font-medium text-gray-600 group-hover:text-primary transition-colors',
                        cidx === 0 && 'pr-8'
                      )}
                    >
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
    </div>
  );
};

export default DataTable;
