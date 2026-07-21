import React from 'react';
import { Calendar, User, Clock, CheckCircle } from 'lucide-react';

const icons = {
  calendar: Calendar,
  user: User,
  clock: Clock,
  check: CheckCircle,
};

export const Timeline = ({ events = [] }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        لا توجد حركات مسجلة في سجل العمليات.
      </div>
    );
  }

  return (
    <div className="relative border-r border-slate-200 pr-4 space-y-6 text-right" dir="rtl">
      {events.map((event, idx) => {
        const IconComponent = icons[event.icon] || Clock;
        return (
          <div key={event.id || idx} className="relative">
            {/* Chronological bullet marker */}
            <span className="absolute -right-[25px] mt-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-50 border border-blue-400 text-blue-500">
              <IconComponent className="h-2.5 w-2.5" />
            </span>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-800">{event.label}</span>
                {event.date && (
                  <span className="text-[10px] text-slate-400 font-bold">
                    {new Date(event.date).toLocaleDateString('ar-KW')}
                  </span>
                )}
              </div>
              {event.notes && (
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {event.notes}
                </p>
              )}
              {event.performer && (
                <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md font-semibold w-max block">
                  بواسطة: {event.performer}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
