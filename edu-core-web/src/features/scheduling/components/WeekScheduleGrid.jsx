import { format, startOfWeek, addDays, startOfDay, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import React from 'react';

import { cn } from '@/shared/utils';

const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 10 PM

const WeekScheduleGrid = ({ lessons = [], onLessonClick, onLessonDrop }) => {
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
            <div key={day.toString()} className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-extrabold text-sm text-primary">{format(day, 'EEEE', { locale: ar })}</span>
                <span className="text-xs text-muted-foreground font-bold">{format(day, 'yyyy/MM/dd')}</span>
              </div>
              <div className="space-y-2">
                {dayLessons.length > 0 ? (
                  dayLessons.map((lesson) => (
                    <div
                      key={lesson._id}
                      role="button"
                      onClick={() => onLessonClick?.(lesson)}
                      className={cn(
                        'p-3 rounded-xl border flex flex-col gap-1 text-right cursor-pointer hover:bg-surface-elevated transition-colors',
                        'bg-primary/5 text-primary border-primary/10',
                        lesson.status === 'COMPLETED' && 'bg-success/10 text-success border-success/20',
                        lesson.status === 'CANCELLED' && 'bg-error/10 text-error border-error/20 opacity-60'
                      )}
                    >
                      <div className="font-black text-xs">{lesson.title}</div>
                      <div className="text-[11px] font-semibold text-foreground/75">الطالب: {lesson.studentId?.parentName}</div>
                      <div className="text-[10px] font-bold text-muted-foreground mt-1">{lesson.startTime} - {lesson.endTime}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-2">لا توجد حصص مجدولة لهذا اليوم</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop/Tablet professional calendar grid (>= md, >= 768px) */}
      <div className="hidden md:block overflow-x-auto border border-border rounded-xl bg-card">
        <div className="min-w-[800px] grid grid-cols-8 border-b border-border bg-muted/50">
          <div className="p-4 border-l border-border font-semibold text-center text-foreground">الوقت</div>
          {days.map((day) => (
            <div
              key={day.toString()}
              className="p-4 border-l border-border font-semibold text-center text-foreground"
            >
              <div>{format(day, 'EEEE', { locale: ar })}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {format(day, 'yyyy/MM/dd')}
              </div>
            </div>
          ))}
        </div>

        <div className="min-w-[800px] grid grid-cols-8 relative h-[700px] overflow-y-auto">
          {/* Time labels column */}
          <div className="border-l border-border flex flex-col bg-muted/20 select-none">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-[50px] border-b border-border/60 text-center text-xs text-muted-foreground pt-1.5 font-bold"
              >
                {hour}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => (
            <div
              key={day.toString()}
              className="border-l border-border relative bg-slate-50/5 dark:bg-slate-900/5"
            >
              {/* Droppable hour cells */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={(e) => e.currentTarget.classList.add('bg-accent/15', 'scale-[0.98]', 'transition-all')}
                  onDragLeave={(e) => e.currentTarget.classList.remove('bg-accent/15', 'scale-[0.98]', 'transition-all')}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove('bg-accent/15', 'scale-[0.98]', 'transition-all');
                    const lessonId = e.dataTransfer.getData('text/plain');
                    if (lessonId) {
                      onLessonDrop?.(lessonId, day, hour);
                    }
                  }}
                  className="h-[50px] border-b border-dashed border-border/50 hover:bg-muted/40 transition-colors cursor-crosshair relative"
                  title={`حجز/نقل إلى الساعة ${hour}:00`}
                ></div>
              ))}

              {/* Render lessons for this day */}
              {lessons
                .filter((l) => isSameDay(new Date(l.lessonDate), day))
                .map((lesson) => {
                  const startHour = parseInt(lesson.startTime.split(':')[0], 10);
                  const startMin = parseInt(lesson.startTime.split(':')[1], 10);
                  const endHour = parseInt(lesson.endTime.split(':')[0], 10);
                  const endMin = parseInt(lesson.endTime.split(':')[1], 10);

                  const top = (startHour - 8) * 50 + (startMin / 60) * 50;
                  const duration = endHour - startHour + (endMin - startMin) / 60;
                  const height = duration * 50;

                  const isCompleted = lesson.status === 'COMPLETED';
                  const isCancelled = lesson.status === 'CANCELLED';
                  const isDraggable = !isCompleted && !isCancelled;

                  return (
                    <div
                      key={lesson._id}
                      draggable={isDraggable}
                      onDragStart={(e) => {
                        if (!isDraggable) return;
                        e.dataTransfer.setData('text/plain', lesson._id);
                        e.currentTarget.classList.add('opacity-40');
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('opacity-40');
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={() => onLessonClick?.(lesson)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onLessonClick?.(lesson);
                        }
                      }}
                      className={cn(
                        'absolute inset-x-1 rounded-xl p-2.5 text-[10px] leading-snug cursor-grab active:cursor-grabbing shadow-premium-sm border transition-all z-10 select-none text-right',
                        'bg-primary/10 text-primary-900 dark:text-primary-100 border-primary/20 hover:border-primary/40 hover:shadow-premium-md',
                        isCompleted && 'bg-success/10 text-success border-success/20 hover:bg-success/20 cursor-pointer',
                        isCancelled && 'bg-error/10 text-error border-error/20 opacity-60 hover:bg-error/20 cursor-pointer'
                      )}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                      }}
                      title={isDraggable ? "اسحب الحصة لتعديل موعدها" : undefined}
                    >
                      <div className="font-black truncate text-[11px] mb-0.5">{lesson.title}</div>
                      <div className="truncate text-foreground/80 font-semibold mb-1">
                        طالب: {lesson.studentId?.parentName}
                      </div>
                      <div className="font-extrabold text-accent flex items-center gap-1">
                        <span dir="ltr">{lesson.startTime} - {lesson.endTime}</span>
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
