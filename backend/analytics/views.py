import csv
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from timetable.models import Subject, LectureSlot
from attendance.models import Attendance
from .calculations import (
    calculate_streaks,
    calculate_attendance_score,
    calculate_smart_bunk,
    get_weekly_attendance_distribution,
    get_monthly_attendance_distribution
)

class AnalyticsDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        subjects = Subject.objects.filter(user=user)
        records = Attendance.objects.filter(student=user)
        
        # 1. Total statistics
        total_lectures = 0
        total_present = 0
        total_absent = 0
        total_late = 0
        
        subject_comparisons = []
        
        for sub in subjects:
            total_lectures += sub.total_lectures
            total_present += sub.present_count
            total_absent += sub.absent_count
            total_late += sub.late_count
            
            sub_attended = sub.present_count + sub.late_count
            sub_pct = round((sub_attended / sub.total_lectures * 100), 2) if sub.total_lectures > 0 else 100.0
            
            subject_comparisons.append({
                "id": sub.id,
                "name": sub.name,
                "code": sub.code,
                "percentage": sub_pct,
                "color": sub.color,
                "present": sub.present_count,
                "absent": sub.absent_count,
                "late": sub.late_count,
                "total": sub.total_lectures
            })
            
        overall_attended = total_present + total_late
        overall_percentage = round((overall_attended / total_lectures * 100), 2) if total_lectures > 0 else 100.0
        
        # 2. Streaks
        streaks = calculate_streaks(user)
        
        # 3. Attendance Score
        score_data = calculate_attendance_score(
            overall_percentage,
            total_lectures,
            total_late,
            streaks["longest_present_streak"]
        )
        
        # 4. Weekly & Monthly distributions
        weekly_chart = get_weekly_attendance_distribution(user)
        monthly_chart = get_monthly_attendance_distribution(user)
        
        # 5. Calendar Heatmap data
        # Formats list of check-in dates and their status colors
        calendar_data = []
        for r in records.order_by('date'):
            calendar_data.append({
                "date": str(r.date),
                "status": r.status,  # Present, Late, Absent
                "subject": r.subject.code
            })
            
        # 6. Today's schedule overview
        today_date = timezone.now().date()
        day_of_week = today_date.strftime('%A')
        today_slots = LectureSlot.objects.filter(user=user, day=day_of_week)
        
        today_marked_ids = Attendance.objects.filter(student=user, date=today_date).values_list('lecture_slot_id', flat=True)
        completed_lectures_count = len(today_marked_ids)
        remaining_lectures_count = today_slots.exclude(id__in=today_marked_ids).count()
        
        return Response({
            "overall_attendance": overall_percentage,
            "total_subjects": subjects.count(),
            "total_lectures": total_lectures,
            "present_count": total_present,
            "absent_count": total_absent,
            "late_count": total_late,
            "score": score_data["score"],
            "score_label": score_data["label"],
            "score_color": score_data["color"],
            "current_streak": streaks["current_streak"],
            "longest_present_streak": streaks["longest_present_streak"],
            "longest_absent_streak": streaks["longest_absent_streak"],
            "weekly_distribution": weekly_chart,
            "monthly_distribution": monthly_chart,
            "subjects": subject_comparisons,
            "calendar_heatmap": calendar_data,
            "today_completed": completed_lectures_count,
            "today_remaining": remaining_lectures_count
        })


class AnalyticsPredictionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Returns scenario calculations: what happens if user misses/attends X classes.
        """
        user = request.user
        subjects = Subject.objects.filter(user=user)
        
        total_lectures = sum(sub.total_lectures for sub in subjects)
        total_attended = sum(sub.present_count + sub.late_count for sub in subjects)
        
        current_pct = round((total_attended / total_lectures * 100), 2) if total_lectures > 0 else 100.0
        
        scenarios = {
            "current": current_pct,
            "miss_1": round((total_attended / (total_lectures + 1) * 100), 2) if total_lectures > 0 else 0,
            "miss_2": round((total_attended / (total_lectures + 2) * 100), 2) if total_lectures > 0 else 0,
            "miss_5": round((total_attended / (total_lectures + 5) * 100), 2) if total_lectures > 0 else 0,
            "miss_10": round((total_attended / (total_lectures + 10) * 100), 2) if total_lectures > 0 else 0,
            "attend_1": round(((total_attended + 1) / (total_lectures + 1) * 100), 2) if total_lectures > 0 else 100.0,
            "attend_2": round(((total_attended + 2) / (total_lectures + 2) * 100), 2) if total_lectures > 0 else 100.0,
            "attend_5": round(((total_attended + 5) / (total_lectures + 5) * 100), 2) if total_lectures > 0 else 100.0,
            "attend_10": round(((total_attended + 10) / (total_lectures + 10) * 100), 2) if total_lectures > 0 else 100.0,
        }
        
        return Response(scenarios)


class AnalyticsGoalPlannerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Calculates smart bunking requirements per subject for targets: 75, 80, 85, 90, 95
        """
        user = request.user
        subjects = Subject.objects.filter(user=user)
        targets = [75, 80, 85, 90, 95]
        
        planner_data = []
        for sub in subjects:
            attended = sub.present_count + sub.late_count
            total = sub.total_lectures
            
            sub_goals = {}
            for target in targets:
                calc = calculate_smart_bunk(attended, total, target)
                sub_goals[f"target_{target}"] = {
                    "consecutive_needed": calc["consecutive_needed"],
                    "safe_bunks": calc["safe_bunks"]
                }
                
            planner_data.append({
                "subject_id": sub.id,
                "name": sub.name,
                "code": sub.code,
                "color": sub.color,
                "attended": attended,
                "total": total,
                "goals": sub_goals
            })
            
        return Response(planner_data)


class AnalyticsReportExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Generates and downloads a CSV report of the student's attendance.
        """
        user = request.user
        report_type = request.query_params.get('type', 'semester') # weekly, monthly, semester
        
        records = Attendance.objects.filter(student=user).order_by('-date', '-timestamp')
        
        # Apply timeframe filter
        today = timezone.now().date()
        if report_type == 'weekly':
            start_date = today - datetime.timedelta(days=7)
            records = records.filter(date__gte=start_date)
        elif report_type == 'monthly':
            start_date = today - datetime.timedelta(days=30)
            records = records.filter(date__gte=start_date)
            
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="attendance_report_{report_type}_{today}.csv"'
        
        writer = csv.writer(response)
        # Header Info
        writer.writerow(['SMARTTTEND ATTENDANCE REPORT'])
        writer.writerow(['Student Name', user.full_name])
        writer.writerow(['Email', user.email])
        writer.writerow(['College', user.college_name])
        writer.writerow(['Division / Semester', f"Div {user.division} / Semester {user.semester}"])
        writer.writerow(['Date Exported', str(today)])
        writer.writerow(['Report Coverage', report_type.upper()])
        writer.writerow([])
        
        # Details Columns
        writer.writerow(['Subject Code', 'Subject Name', 'Faculty Name', 'Date', 'Status', 'Arrival Offset (mins)', 'Remarks'])
        
        for r in records:
            writer.writerow([
                r.subject.code,
                r.subject.name,
                r.subject.faculty_name,
                str(r.date),
                r.status,
                r.time_difference if r.time_difference is not None else 'On Time',
                r.remarks or 'N/A'
            ])
            
        return response
