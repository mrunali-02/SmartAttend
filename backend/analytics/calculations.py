import datetime
import math
from django.db.models import Count, Q
from django.utils import timezone
from attendance.models import Attendance
from timetable.models import Subject, LectureSlot

def calculate_streaks(user):
    """
    Calculates attendance streaks:
    - current_streak: consecutive Present or Late check-ins leading up to now.
    - longest_present_streak: max consecutive Present or Late check-ins in history.
    - longest_absent_streak: max consecutive Absent check-ins in history.
    """
    records = Attendance.objects.filter(student=user).order_by('date', 'timestamp')
    
    current_present_streak = 0
    longest_present_streak = 0
    
    current_absent_streak = 0
    longest_absent_streak = 0
    
    for record in records:
        if record.status in ['Present', 'Late']:
            # Present streak increments
            current_present_streak += 1
            if current_present_streak > longest_present_streak:
                longest_present_streak = current_present_streak
            
            # Reset absent streak
            current_absent_streak = 0
        else:
            # Absent streak increments
            current_absent_streak += 1
            if current_absent_streak > longest_absent_streak:
                longest_absent_streak = current_absent_streak
                
            # Reset present streak
            current_present_streak = 0
            
    # For current streak, it represents the most recent present streak.
    # If the user's last record was absent, current streak is 0.
    return {
        "current_streak": current_present_streak,
        "longest_present_streak": longest_present_streak,
        "longest_absent_streak": longest_absent_streak
    }

def calculate_attendance_score(overall_pct, total_lectures, late_count, longest_present_streak):
    """
    Calculates a credit/placement-worthy performance score (0-100) based on:
    - Attendance percentage (60%)
    - Punctuality / Late ratio (20%)
    - Consistency / Streak reward (20%)
    """
    if total_lectures == 0:
        return {
            "score": 100,
            "label": "Excellent",
            "color": "success"
        }
        
    # 1. Attendance component (60%)
    score_att = overall_pct
    
    # 2. Punctuality component (20%)
    late_ratio = late_count / total_lectures
    score_punct = (1.0 - late_ratio) * 100
    
    # 3. Streak component (20%)
    # Streak of 5+ gives full streak score, scaled otherwise
    score_streak = min(longest_present_streak * 20, 100)
    
    # Overall score
    score = round(0.6 * score_att + 0.2 * score_punct + 0.2 * score_streak)
    
    if score >= 85:
        label = "Excellent"
        color = "success"
    elif score >= 70:
        label = "Good"
        color = "warning"
    else:
        label = "Needs Improvement"
        color = "error"
        
    return {
        "score": score,
        "label": label,
        "color": color
    }

def calculate_smart_bunk(attended, total, target_percentage):
    """
    Calculates either safe bunks remaining or consecutive lectures needed.
    """
    target = target_percentage / 100.0
    
    if total == 0:
        return {
            "consecutive_needed": 0,
            "safe_bunks": 0
        }
        
    current_pct = (attended / total)
    
    if current_pct >= target:
        # User is above target, can safely bunk
        # A / (T + y) >= target => A >= target * T + target * y => y <= (A - target * T) / target
        safe_bunks = math.floor((attended - target * total) / target)
        return {
            "consecutive_needed": 0,
            "safe_bunks": max(0, safe_bunks)
        }
    else:
        # User is below target, needs consecutive classes
        # (A + x) / (T + x) >= target => A + x >= target * T + target * x => x(1 - target) >= target * T - A
        if target == 1.0:
            consecutive_needed = 999  # cannot reach 100% easily if missed once
        else:
            consecutive_needed = math.ceil((target * total - attended) / (1.0 - target))
        return {
            "consecutive_needed": max(0, consecutive_needed),
            "safe_bunks": 0
        }

def get_weekly_attendance_distribution(user):
    """
    Returns weekly attendance statistics (average present, late, absent per day of the week)
    """
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    distribution = {day: {"Present": 0, "Late": 0, "Absent": 0, "Total": 0} for day in days}
    
    records = Attendance.objects.filter(student=user)
    
    for r in records:
        day_name = r.date.strftime('%A')
        if day_name in distribution:
            if r.status in distribution[day_name]:
                distribution[day_name][r.status] += 1
                distribution[day_name]["Total"] += 1
            
    return [
        {
            "day": day,
            "Present": distribution[day]["Present"],
            "Late": distribution[day]["Late"],
            "Absent": distribution[day]["Absent"],
            "Total": distribution[day]["Total"]
        } for day in days
    ]

def get_monthly_attendance_distribution(user):
    """
    Returns monthly attendance percentages and counts for charts
    """
    records = Attendance.objects.filter(student=user).order_by('date')
    if not records.exists():
        return []
        
    monthly_data = {}
    
    for r in records:
        # e.g. "2026-07"
        month_key = r.date.strftime('%b %Y')
        if month_key not in monthly_data:
            monthly_data[month_key] = {"Present": 0, "Late": 0, "Absent": 0, "Total": 0}
            
        if r.status in monthly_data[month_key]:
            monthly_data[month_key][r.status] += 1
            monthly_data[month_key]["Total"] += 1
        
    chart_data = []
    for month_label, counts in monthly_data.items():
        attended = counts["Present"] + counts["Late"]
        pct = round((attended / counts["Total"]) * 100, 2) if counts["Total"] > 0 else 0
        chart_data.append({
            "name": month_label,
            "Present": counts["Present"],
            "Late": counts["Late"],
            "Absent": counts["Absent"],
            "percentage": pct
        })
        
    return chart_data
