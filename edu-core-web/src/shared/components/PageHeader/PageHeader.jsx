import React from 'react';

import { cn } from '../../utils';

const PageHeader = ({ title, description, children, className }) => {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8',
        className
      )}
    >
      <div className="space-y-1 relative">
        <div className="absolute -right-4 top-0 bottom-0 w-1 bg-secondary rounded-full" />
        <h1 className="text-3xl font-black tracking-tight text-primary">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground font-medium text-sm">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
};

export default PageHeader;
