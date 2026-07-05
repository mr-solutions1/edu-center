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
}) => {
  return (
    <Card className={cn('overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300 group', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
          {label}
        </CardTitle>
        <div className="p-2 bg-primary/5 rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300">
          {Icon && <Icon className="h-5 w-5" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tight text-primary">{value}</div>
        {(trend || trendValue) && (
          <div className="flex items-center gap-1 mt-2">
             <p
              className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                trend === 'up'
                  ? 'bg-green-100 text-green-700'
                  : trend === 'down'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
              )}
            >
              {trendValue}
            </p>
            <span className="text-[10px] text-muted-foreground font-medium">مقارنة بالشهر الماضي</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
