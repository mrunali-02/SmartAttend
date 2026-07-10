import datetime
import math
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime

from .models import Attendance
from .serializers import AttendanceSerializer
from timetable.models import Subject, LectureSlot

class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer

    def get_permissions(self):
        # Admin-only for update and destroy
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = Attendance.objects.filter(student=user)

        # Filters
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        date_param = self.request.query_params.get('date')
        if date_param:
            queryset = queryset.filter(date=date_param)

        month_param = self.request.query_params.get('month')
        if month_param:
            # month_param can be integer 1-12
            try:
                queryset = queryset.filter(date__month=int(month_param))
            except ValueError:
                pass

        search_param = self.request.query_params.get('search')
        if search_param:
            queryset = queryset.filter(
                Q(subject__name__icontains=search_param) |
                Q(subject__code__icontains=search_param) |
                Q(subject__faculty_name__icontains=search_param)
            )

        # Sorting
        sort_param = self.request.query_params.get('sort', '-date')
        if sort_param in ['date', '-date', 'timestamp', '-timestamp']:
            queryset = queryset.order_by(sort_param)

        return queryset

    @action(detail=False, methods=['POST'], url_path='mark')
    def mark_attendance(self, request):
        """
        Marks attendance for the student.
        Payload:
        - lecture_slot_id: ID of the LectureSlot
        - date: YYYY-MM-DD
        - status: Present, Absent, Late (default Present)
        - device_time: ISO timestamp from device (optional)
        - remarks: text (optional)
        """
        slot_id = request.data.get('lecture_slot_id')
        date_str = request.data.get('date')
        status_val = request.data.get('status', 'Present')
        device_time_str = request.data.get('device_time')
        remarks = request.data.get('remarks', '')

        if not slot_id:
            return Response({"error": "lecture_slot_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Fetch slot
        try:
            slot = LectureSlot.objects.get(id=slot_id, user=request.user)
        except LectureSlot.DoesNotExist:
            return Response({"error": "Lecture slot not found."}, status=status.HTTP_404_NOT_FOUND)

        # 2. Determine check-in datetime
        if device_time_str:
            try:
                # Parse device ISO string
                check_in_time = parse_datetime(device_time_str)
                if not check_in_time:
                    raise ValueError()
                if timezone.is_aware(check_in_time):
                    check_in_time = timezone.make_naive(check_in_time, timezone.get_current_timezone())
            except Exception:
                check_in_time = timezone.make_naive(timezone.now(), timezone.get_current_timezone())
        else:
            check_in_time = timezone.make_naive(timezone.now(), timezone.get_current_timezone())

        check_in_date = check_in_time.date()
        if date_str:
            try:
                check_in_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        # 3. Check correct day of the week
        check_in_day_name = check_in_date.strftime('%A')
        if check_in_day_name != slot.day:
            return Response({
                "error": f"Invalid day. This lecture is scheduled for {slot.day}, but date is a {check_in_day_name}."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 4. Check duplicate
        if Attendance.objects.filter(student=request.user, lecture_slot=slot, date=check_in_date).exists():
            return Response({
                "error": "Attendance already marked for this lecture slot on this date."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 5. Timing window validation (5 min before start to 10 min after end)
        slot_start_dt = datetime.datetime.combine(check_in_date, slot.start_time)
        slot_end_dt = datetime.datetime.combine(check_in_date, slot.end_time)

        window_start = slot_start_dt - datetime.timedelta(minutes=5)
        window_end = slot_end_dt + datetime.timedelta(minutes=10)

        # Create localized checkout time using same date for comparison
        check_in_compare_dt = datetime.datetime.combine(check_in_date, check_in_time.time())

        # If outside window, reject
        if not (window_start <= check_in_compare_dt <= window_end):
            return Response({
                "error": f"Attendance can only be marked within the scheduled lecture window (from {window_start.strftime('%I:%M %p')} to {window_end.strftime('%I:%M %p')})."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 6. Calculate Time Difference (in minutes)
        # Difference relative to the scheduled start time
        time_difference_seconds = (check_in_compare_dt - slot_start_dt).total_seconds()
        time_difference_minutes = round(time_difference_seconds / 60)

        # Save record
        attendance = Attendance.objects.create(
            student=request.user,
            subject=slot.subject,
            lecture_slot=slot,
            date=check_in_date,
            status=status_val,
            device_time=check_in_time,
            time_difference=time_difference_minutes,
            remarks=remarks
        )

        serializer = self.get_serializer(attendance)
        return Response({
            "detail": f"Attendance marked as {status_val} successfully.",
            "record": serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['GET'], url_path='summary')
    def summary(self, request):
        """
        Calculates and returns overall attendance metrics for the dashboard.
        """
        subjects = Subject.objects.filter(user=request.user)
        
        total_lectures = 0
        total_present = 0
        total_absent = 0
        total_late = 0
        
        subject_summaries = []
        
        for sub in subjects:
            total_lectures += sub.total_lectures
            total_present += sub.present_count
            total_absent += sub.absent_count
            total_late += sub.late_count
            
            sub_attended = sub.present_count + sub.late_count
            sub_pct = round((sub_attended / sub.total_lectures * 100), 2) if sub.total_lectures > 0 else 100.0
            
            subject_summaries.append({
                "id": sub.id,
                "name": sub.name,
                "code": sub.code,
                "faculty_name": sub.faculty_name,
                "credits": sub.credits,
                "color": sub.color,
                "total_lectures": sub.total_lectures,
                "present_count": sub.present_count,
                "absent_count": sub.absent_count,
                "late_count": sub.late_count,
                "percentage": sub_pct
            })
            
        overall_attended = total_present + total_late
        overall_percentage = round((overall_attended / total_lectures * 100), 2) if total_lectures > 0 else 100.0
        
        # Calculate goal advice
        # Default target attendance is 75%
        attendance_goal = 75
        consecutive_needed = 0
        
        if overall_percentage < attendance_goal and total_lectures > 0:
            # G = 0.75
            goal_decimal = attendance_goal / 100.0
            consecutive_needed = math.ceil((goal_decimal * total_lectures - overall_attended) / (1.0 - goal_decimal))
            if consecutive_needed < 0:
                consecutive_needed = 0

        # Today's status calculation
        today_date = timezone.now().date()
        day_of_week = today_date.strftime('%A')
        today_slots = LectureSlot.objects.filter(user=request.user, day=day_of_week)
        
        today_lectures_count = today_slots.count()
        today_marked_count = Attendance.objects.filter(student=request.user, date=today_date).count()
        
        return Response({
            "overall_percentage": overall_percentage,
            "total_lectures": total_lectures,
            "present_count": total_present,
            "absent_count": total_absent,
            "late_count": total_late,
            "attendance_goal": attendance_goal,
            "consecutive_needed": consecutive_needed,
            "today_lectures_count": today_lectures_count,
            "today_marked_count": today_marked_count,
            "subjects": subject_summaries
        })
