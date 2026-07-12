import datetime
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification, Attendance
from timetable.models import LectureSlot, Subject
from ai.models import AIPreferences
from analytics.calculations import calculate_smart_bunk, calculate_streaks
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        # Generate reactive notifications before listing
        self.generate_reactive_notifications(self.request.user)
        return Notification.objects.filter(student=self.request.user)

    def generate_reactive_notifications(self, user):
        """
        Dynamically schedules/inserts notification alerts when student opens center:
        - Low attendance warnings (< preferred_goal%)
        - Upcoming lecture reminder check (starting in next 15 mins)
        - Attendance streak warnings (absent streaks > 2)
        """
        today = timezone.now().date()
        memory, _ = AIPreferences.objects.get_or_create(user=user)
        target_goal = memory.preferred_goal
        try:
            offset_mins = int(memory.preferred_reminder_time.split()[0])
        except (ValueError, IndexError):
            offset_mins = 15

        # 1. Check Low Attendance Warning
        subjects = Subject.objects.filter(user=user)
        for sub in subjects:
            attended = sub.present_count + sub.late_count
            total = sub.total_lectures
            pct = (attended / total * 100) if total > 0 else 100.0
            
            if pct < target_goal and total > 0:
                calc = calculate_smart_bunk(attended, total, target_goal)
                title = f"⚠️ Attendance Warning: {sub.code}"
                msg = f"Your attendance in '{sub.name}' is currently at {round(pct, 1)}% (below your {target_goal}% goal). Attend the next {calc['consecutive_needed']} lecture(s) consecutively to recover."
                
                # Check if warning already exists to prevent duplicate spam
                if not Notification.objects.filter(student=user, title=title, category='Warning').exists():
                    Notification.objects.create(
                        student=user,
                        title=title,
                        message=msg,
                        category='Warning',
                        priority='High'
                    )

        # 2. Check Upcoming Lecture Reminders (for today)
        now_time = timezone.now().time()
        day_of_week = today.strftime('%A')
        slots = LectureSlot.objects.filter(user=user, day=day_of_week)
        
        for slot in slots:
            # Combine time to calculate delta
            slot_dt = datetime.datetime.combine(today, slot.start_time)
            now_dt = datetime.datetime.combine(today, now_time)
            diff_seconds = (slot_dt - now_dt).total_seconds()
            
            # Check if lecture starts in the window: e.g. between 0 and reminder_time_mins
            if 0 < diff_seconds <= (offset_mins * 60):
                title = f"📚 Lecture Reminder: {slot.subject.code}"
                msg = f"Your lecture '{slot.subject.name}' starts in {round(diff_seconds / 60)} minutes at {slot.start_time.strftime('%I:%M %p')}."
                
                # Prevent duplicate reminders for the same slot on the same day
                unique_ref = f"{title} - {today}"
                if not Notification.objects.filter(student=user, title=unique_ref).exists():
                    Notification.objects.create(
                        student=user,
                        title=unique_ref,
                        message=msg,
                        category='Reminder',
                        priority='Medium'
                    )

        # 3. Absent streak warnings
        streaks = calculate_streaks(user)
        if streaks["longest_absent_streak"] >= 2:
            title = "⚠️ High Absence Alert"
            msg = f"You have missed {streaks['longest_absent_streak']} classes consecutively. Make sure to check in to upcoming classes to avoid academic penalties."
            if not Notification.objects.filter(student=user, title=title).exists():
                Notification.objects.create(
                    student=user,
                    title=title,
                    message=msg,
                    category='Warning',
                    priority='High'
                )

    @action(detail=False, methods=['POST'], url_path='read-all')
    def read_all(self, request):
        Notification.objects.filter(student=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."})

    @action(detail=False, methods=['POST'], url_path='clear-all')
    def clear_all(self, request):
        Notification.objects.filter(student=request.user).delete()
        return Response({"detail": "Notification center cleared successfully."})
