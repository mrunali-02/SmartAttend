import datetime
import math
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
from ai.models import AIPreferences

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

        # Geofencing coordinates validation
        memory, _ = AIPreferences.objects.get_or_create(user=request.user)
        if memory.geofencing_enabled:
            lat = request.data.get('latitude')
            lon = request.data.get('longitude')
            if lat is None or lon is None:
                return Response({
                    "error": "Location coordinates (latitude and longitude) are required to mark attendance due to geofencing policy."
                }, status=status.HTTP_400_BAD_REQUEST)
            try:
                lat1, lon1 = float(lat), float(lon)
                lat2, lon2 = memory.college_latitude, memory.college_longitude
                
                # Haversine formula
                R = 6371000.0 # Earth radius in meters
                phi1 = math.radians(lat1)
                phi2 = math.radians(lat2)
                dphi = math.radians(lat2 - lat1)
                dlambda = math.radians(lon2 - lon1)
                
                a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
                distance = R * c
                
                if distance > memory.geofence_radius_meters:
                    return Response({
                        "error": f"Verification failed. You are outside the allowed college bounds (Distance: {round(distance, 1)}m, limit: {memory.geofence_radius_meters}m)."
                    }, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({"error": "Invalid location coordinates values."}, status=status.HTTP_400_BAD_REQUEST)

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

    @action(detail=False, methods=['POST'], url_path='backfill')
    def backfill_attendance(self, request):
        """
        Bulk records/updates attendance for a past date or multiple dates (backfill).
        Payload:
        - date: YYYY-MM-DD (optional, single day)
        - is_holiday: boolean (optional, single day)
        - records: list of slot records (optional, single day)
        - days: list of day items (optional, bulk week/days batch):
            - date: YYYY-MM-DD
            - is_holiday: boolean
            - records: list of objects:
                - lecture_slot_id: ID
                - status: Present, Absent, Late, Cancelled, Holiday
        """
        days_data = request.data.get('days')

        # Fallback to single day payload format if days is not supplied
        if not days_data:
            single_date = request.data.get('date')
            if single_date:
                days_data = [{
                    'date': single_date,
                    'is_holiday': request.data.get('is_holiday', False),
                    'records': request.data.get('records', [])
                }]
            else:
                return Response({"error": "Either date or days is required."}, status=status.HTTP_400_BAD_REQUEST)

        subjects_affected = set()

        for day_item in days_data:
            date_str = day_item.get('date')
            is_holiday = day_item.get('is_holiday', False)
            records_data = day_item.get('records', [])

            if not date_str:
                continue

            try:
                target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                continue

            day_of_week = target_date.strftime('%A')
            slots = LectureSlot.objects.filter(user=request.user, day=day_of_week)

            if is_holiday:
                for slot in slots:
                    Attendance.objects.update_or_create(
                        student=request.user,
                        lecture_slot=slot,
                        date=target_date,
                        defaults={
                            'subject': slot.subject,
                            'status': 'Holiday',
                            'remarks': 'Day marked as holiday'
                        }
                    )
                    subjects_affected.add(slot.subject.id)
            else:
                for rec in records_data:
                    slot_id = rec.get('lecture_slot_id')
                    status_val = rec.get('status')

                    if not slot_id or not status_val:
                        continue

                    try:
                        slot = LectureSlot.objects.get(id=slot_id, user=request.user)
                    except LectureSlot.DoesNotExist:
                        continue

                    # Create or update record
                    Attendance.objects.update_or_create(
                        student=request.user,
                        lecture_slot=slot,
                        date=target_date,
                        defaults={
                            'subject': slot.subject,
                            'status': status_val,
                            'remarks': 'Backfilled past record'
                        }
                    )
                    subjects_affected.add(slot.subject.id)

        # Trigger manual update stats trigger for subjects affected to guarantee database accuracy
        for sub_id in subjects_affected:
            try:
                sub = Subject.objects.get(id=sub_id)
                from .signals import update_subject_stats
                update_subject_stats(sub)
            except Subject.DoesNotExist:
                pass

        return Response({"detail": "Backfilled attendance successfully."})

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
        total_cancelled = 0
        
        subject_summaries = []
        
        for sub in subjects:
            total_lectures += sub.total_lectures
            total_present += sub.present_count
            total_absent += sub.absent_count
            total_late += sub.late_count
            sub_cancelled = getattr(sub, 'cancelled_count', 0)
            total_cancelled += sub_cancelled
            
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
                "cancelled_count": sub_cancelled,
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
            "cancelled_count": total_cancelled,
            "attendance_goal": attendance_goal,
            "consecutive_needed": consecutive_needed,
            "today_lectures_count": today_lectures_count,
            "today_marked_count": today_marked_count,
            "subjects": subject_summaries
        })
