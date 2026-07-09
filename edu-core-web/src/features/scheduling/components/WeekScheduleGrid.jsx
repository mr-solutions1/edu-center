import { format, startOfWeek, addDays, startOfDay, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import React from 'react';

import { cn } from '@/shared/utils';

const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 10 PM

const WeekScheduleGrid = ({ lessons = [], onLessonClick }) => {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 6 }); // Start Saturday

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-x-auto border rounded-xl bg-card">
      <div className="min-w-[800px] grid grid-cols-8 border-b bg-muted/50">
        <div className="p-4 border-l font-semibold text-center">الوقت</div>
        {days.map((day) => (
          <div
            key={day.toString()}
            className="p-4 border-l font-semibold text-center"
          >
            <div>{format(day, 'EEEE', { locale: ar })}</div>
            <div className="text-xs text-muted-foreground">
              {format(day, 'yyyy/MM/dd')}
            </div>
          </div>
        ))}
      </div>

      <div className="min-w-[800px] grid grid-cols-8 relative h-[700px] overflow-y-auto">
        {/* Time labels column */}
        <div className="border-l flex flex-col">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-[50px] border-b text-center text-xs text-muted-foreground pt-1"
            >
              {hour}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => (
          <div
            key={day.toString()}
            className="border-l relative bg-slate-50/30 dark:bg-slate-900/10"
          >
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-[50px] border-b border-dashed border-muted"
              ></div>
            ))}

            {/* Render lessons for this day */}
            {lessons
              .filter((l) => isSameDay(new Date(l.lessonDate), day))
              .map((lesson) => {
                const startHour = parseInt(lesson.startTime.split(':')[0]);
                const startMin = parseInt(lesson.startTime.split(':')[1]);
                const endHour = parseInt(lesson.endTime.split(':')[0]);
                const endMin = parseInt(lesson.endTime.split(':')[1]);

                const top = (startHour - 8) * 50 + (startMin / 60) * 50;
                const duration = endHour - startHour + (endMin - startMin) / 60;
                const height = duration * 50;

                return (
                  <div
                    key={lesson._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onLessonClick?.(lesson)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onLessonClick?.(lesson);
                      }
                    }}
                    className={cn(
                      'absolute inset-x-1 rounded p-2 text-[10px] leading-tight cursor-pointer shadow-sm border border-primary/20',
                      'bg-primary/10 text-primary-foreground hover:bg-primary/20 transition-all',
                      lesson.status === 'COMPLETED' &&
                        'bg-green-100 text-green-800 border-green-200',
                      lesson.status === 'CANCELLED' &&
                        'bg-red-100 text-red-800 border-red-200 opacity-60'
                    )}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      zIndex: 10,
                    }}
                  >
                    <div className="font-bold truncate">{lesson.title}</div>
                    <div className="truncate">
                      {lesson.studentId?.parentName}
                    </div>
                    <div className="font-medium">
                      {lesson.startTime} - {lesson.endTime}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekScheduleGrid;
