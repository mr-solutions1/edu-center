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
    <div className="w-full overflow-hidden flex flex-col space-y-4">
      {/* Mobile-friendly list layout for schedule cards (< md, < 768px) */}
      <div className="block md:hidden space-y-4">
        {days.map((day) => {
          const dayLessons = lessons.filter((l) => isSameDay(new Date(l.lessonDate), day));
          return (
            <div key={day.toString()} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-extrabold text-sm text-primary">{format(day, 'EEEE', { locale: ar })}</span>
                <span className="text-xs text-slate-400 font-bold">{format(day, 'yyyy/MM/dd')}</span>
              </div>
              <div className="space-y-2">
                {dayLessons.length > 0 ? (
                  dayLessons.map((lesson) => (
                    <div
                      key={lesson._id}
                      role="button"
                      onClick={() => onLessonClick?.(lesson)}
                      className={cn(
                        'p-3 rounded-xl border flex flex-col gap-1 text-right cursor-pointer hover:bg-slate-50 transition-colors',
                        'bg-primary/5 text-primary border-primary/10',
                        lesson.status === 'COMPLETED' && 'bg-green-50 text-green-800 border-green-100',
                        lesson.status === 'CANCELLED' && 'bg-red-50 text-red-800 border-red-100 opacity-60'
                      )}
                    >
                      <div className="font-black text-xs">{lesson.title}</div>
                      <div className="text-[11px] font-semibold text-slate-500">الطالب: {lesson.studentId?.parentName}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-1">{lesson.startTime} - {lesson.endTime}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-2">لا توجد حصص مجدولة لهذا اليوم</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop/Tablet professional calendar grid (>= md, >= 768px) */}
      <div className="hidden md:block overflow-x-auto border rounded-xl bg-card">
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
    </div>
  );
};

export default WeekScheduleGrid;
