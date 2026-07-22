import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import AttendanceDialog from '../components/AttendanceDialog';
import LessonFormDialog from '../components/LessonFormDialog';
import WeekScheduleGrid from '../components/WeekScheduleGrid';
import { schedulingApi } from '../services/schedulingApi';

import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';

const SchedulePage = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [error, setError] = useState(null);

  // Automatically clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const { data, isLoading } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => schedulingApi.getAllLessons(),
  });

  const createMutation = useMutation({
    mutationFn: schedulingApi.createLesson,
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
      setFormOpen(false);
      setError(null);
    },
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'حدث خطأ أثناء الحجز');
    },
  });

  const handleCreate = (formData) => {
    const date = new Date(formData.lessonDate);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    createMutation.mutate({ ...formData, dayOfWeek });
  };

  const updateTimeMutation = useMutation({
    mutationFn: ({ id, data }) => schedulingApi.updateLessonTime(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
      setError(null);
    },
    onError: (err) => {
      setError(err.response?.data?.error?.message || 'حدث خطأ أثناء نقل الحصة');
    },
  });

  const handleLessonDrop = (lessonId, targetDay, targetHour) => {
    const lessons = data?.data || [];
    const lesson = lessons.find((l) => l._id === lessonId);
    if (!lesson) return;

    // Calculate original duration
    const startHour = parseInt(lesson.startTime.split(':')[0], 10);
    const startMin = parseInt(lesson.startTime.split(':')[1], 10);
    const endHour = parseInt(lesson.endTime.split(':')[0], 10);
    const endMin = parseInt(lesson.endTime.split(':')[1], 10);
    const durationMinutes = (endHour - startHour) * 60 + (endMin - startMin);

    // Set new start and end time based on the slot target hour
    const pad = (num) => String(num).padStart(2, '0');
    const newStartHour = targetHour;
    const newStartMin = 0;
    const newEndMinutes = newStartHour * 60 + newStartMin + durationMinutes;
    const newEndHour = Math.floor(newEndMinutes / 60);
    const newEndMin = newEndMinutes % 60;

    const startTime = `${pad(newStartHour)}:${pad(newStartMin)}`;
    const endTime = `${pad(newEndHour)}:${pad(newEndMin)}`;

    const lessonDate = targetDay.toISOString().split('T')[0];

    updateTimeMutation.mutate({
      id: lessonId,
      data: { lessonDate, startTime, endTime },
    });
  };

  const markAttendanceMutation = useMutation({
    mutationFn: (data) =>
      schedulingApi.markAttendance(selectedLesson._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
      setAttendanceOpen(false);
      setSelectedLesson(null);
    },
  });

  const handleMarkAttendance = (formData) => {
    markAttendanceMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader title="الجدول الدراسي" description="قم بسحب وإفلات الحصص لتعديل مواعيدها بسهولة مع نظام كشف تصادم ذكي">
        <Button onClick={() => setFormOpen(true)} className="gap-2 button-premium-hover">
          <Plus className="h-4 w-4" />
          حجز حصة جديدة
        </Button>
      </PageHeader>

      {/* Elegant, high-fidelity Collision/Conflict Notification Banner */}
      {error && (
        <div className="bg-error/10 border-2 border-error/20 text-error p-4 rounded-xl flex items-center justify-between animate-shake shadow-premium-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="font-extrabold text-xs md:text-sm">
              عذراً، تم الكشف عن تعارض في الجدولة: {error}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="text-error hover:bg-error/10 text-xs font-bold"
          >
            إغلاق
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-xl bg-card text-muted-foreground gap-3 animate-pulse">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="font-bold text-sm">جاري تحميل الجدول الدراسي التفاعلي...</span>
        </div>
      ) : (
        <WeekScheduleGrid
          lessons={data?.data || []}
          onLessonClick={(l) => {
            setSelectedLesson(l);
            setAttendanceOpen(true);
          }}
          onLessonDrop={handleLessonDrop}
        />
      )}

      <LessonFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
        error={error}
      />

      <AttendanceDialog
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        lesson={selectedLesson}
        onSubmit={handleMarkAttendance}
        isSubmitting={markAttendanceMutation.isPending}
      />
    </div>
  );
};

export default SchedulePage;
