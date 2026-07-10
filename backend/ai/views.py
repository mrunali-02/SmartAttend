import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.core.cache import cache
from django.utils import timezone

from timetable.models import Subject
from attendance.models import Attendance
from analytics.calculations import calculate_streaks, calculate_attendance_score
from .gemini_service import get_gemini_insights

logger = logging.getLogger(__name__)

class AIInsightsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        cache_key = f"ai_insights_{user.id}"
        
        # Check cache
        cached_insights = cache.get(cache_key)
        if cached_insights:
            return Response({"insights": cached_insights, "cached": True})
            
        # Reconstruct stats packet
        subjects = Subject.objects.filter(user=user)
        
        total_lectures = 0
        total_present = 0
        total_absent = 0
        total_late = 0
        
        subject_list = []
        for sub in subjects:
            total_lectures += sub.total_lectures
            total_present += sub.present_count
            total_absent += sub.absent_count
            total_late += sub.late_count
            
            sub_attended = sub.present_count + sub.late_count
            sub_pct = round((sub_attended / sub.total_lectures * 100), 2) if sub.total_lectures > 0 else 100.0
            
            subject_list.append({
                "code": sub.code,
                "name": sub.name,
                "percentage": sub_pct,
                "present": sub.present_count,
                "absent": sub.absent_count,
                "late": sub.late_count,
                "total": sub.total_lectures
            })
            
        overall_attended = total_present + total_late
        overall_percentage = round((overall_attended / total_lectures * 100), 2) if total_lectures > 0 else 100.0
        
        streaks = calculate_streaks(user)
        score_data = calculate_attendance_score(
            overall_percentage,
            total_lectures,
            total_late,
            streaks["longest_present_streak"]
        )
        
        stats_data = {
            "overall_attendance": overall_percentage,
            "score": score_data["score"],
            "score_label": score_data["label"],
            "current_streak": streaks["current_streak"],
            "longest_present_streak": streaks["longest_present_streak"],
            "late_count": total_late,
            "subjects": subject_list
        }
        
        # Call service to get insights
        insights = get_gemini_insights(stats_data)
        
        # Cache for 15 minutes to reduce API volume
        cache.set(cache_key, insights, 900)
        
        return Response({"insights": insights, "cached": False})
