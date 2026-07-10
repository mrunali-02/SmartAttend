import datetime
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework import permissions

from .models import LectureSlot

class iCalendarExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        slots = LectureSlot.objects.filter(user=user)

        # Base week dates in July 2026 to align recurrence days correctly:
        # Monday is July 13, 2026.
        day_base_dates = {
            'Monday': '20260713',
            'Tuesday': '20260714',
            'Wednesday': '20260715',
            'Thursday': '20260716',
            'Friday': '20260717',
            'Saturday': '20260718',
        }
        
        day_ics_codes = {
            'Monday': 'MO',
            'Tuesday': 'TU',
            'Wednesday': 'WE',
            'Thursday': 'TH',
            'Friday': 'FR',
            'Saturday': 'SA',
        }

        ics_lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Smartttend//Class Schedule Timetable//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
        ]

        for slot in slots:
            base_date = day_base_dates.get(slot.day, '20260713')
            by_day = day_ics_codes.get(slot.day, 'MO')
            
            # Format time strings: e.g. "09:00:00" -> "090000"
            start_time_str = slot.start_time.strftime('%H%M%S')
            end_time_str = slot.end_time.strftime('%H%M%S')
            
            event_id = f"lecture_slot_{slot.id}_{by_day.lower()}"
            
            ics_lines.extend([
                'BEGIN:VEVENT',
                f'UID:{event_id}@smartttend.com',
                f'DTSTART;TZID=Asia/Kolkata:{base_date}T{start_time_str}',
                f'DTEND;TZID=Asia/Kolkata:{base_date}T{end_time_str}',
                f'RRULE:FREQ=WEEKLY;BYDAY={by_day}',
                f'SUMMARY:{slot.subject.name} ({slot.subject.code})',
                f'DESCRIPTION:Faculty: {slot.subject.faculty_name} | Type: {slot.lecture_type}',
                f'LOCATION:Semester {slot.subject.semester} - Division {slot.subject.division}',
                'END:VEVENT'
            ])

        ics_lines.append('END:VCALENDAR')
        
        ics_content = "\r\n".join(ics_lines)
        
        response = HttpResponse(ics_content, content_type='text/calendar')
        response['Content-Disposition'] = f'attachment; filename="smartttend_timetable_{user.roll_number or "schedule"}.ics"'
        return response
