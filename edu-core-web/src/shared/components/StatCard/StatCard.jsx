import React from 'react';

import { cn } from '../../utils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const StatCard = ({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  className,
  isFeatured = false,
}) => {
  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200 shadow-premium border border-slate-100 hover:border-slate-200/80',
        isFeatured
          ? 'bg-gradient-to-br from-primary/[0.02] to-primary/[0.04] border-primary/20'
          : 'bg-white',
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2.5">
        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </CardTitle>
        <div className={cn(
          'p-1.5 rounded-md transition-all duration-150',
          isFeatured ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400 group-hover:text-primary'
        )}>
          {Icon && <Icon className="h-4.5 w-4.5" />}
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className={cn(
          'text-2xl font-bold tracking-tight',
          isFeatured ? 'text-primary' : 'text-slate-800'
        )}>
          {value}
        </div>
        {(trend || trendValue) && (
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                trend === 'up'
                  ? 'bg-emerald-50 text-green-700 border border-green-200/30'
                  : trend === 'down'
                    ? 'bg-rose-50 text-red-700 border border-red-200/30'
                    : 'bg-slate-50 text-slate-600 border border-slate-200/30'
              )}
            >
              {trendValue}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              مقارنة بالشهر الماضي
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
