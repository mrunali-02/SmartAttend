import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model

from timetable.models import Subject, LectureSlot
from attendance.models import Attendance
from .calculations import (
    calculate_streaks,
    calculate_attendance_score,
    calculate_smart_bunk
)
from ai.gemini_service import generate_local_fallback_insights

User = get_user_model()

class AnalyticsTestCase(TestCase):
    def setUp(self):
        # Create user
        self.user = User.objects.create_user(
            email='analyst@example.com',
            password='testpassword123',
            full_name='Test Student',
            college_name='Test College',
            department='Computer Science',
            semester='3',
            division='A',
            roll_number='102',
            batch='2026'
        )
        
        # Create subject
        self.subject = Subject.objects.create(
            user=self.user,
            name='Computer Networks',
            code='CS303',
            faculty_name='Dr. Rao',
            credits=3,
            semester='3',
            division='A'
        )

        # Create slot (Tuesday 10:00 AM - 11:00 AM)
        self.slot = LectureSlot.objects.create(
            user=self.user,
            subject=self.subject,
            day='Tuesday',
            start_time=datetime.time(10, 0),
            end_time=datetime.time(11, 0),
            lecture_type='Theory'
        )

    def test_streaks_calculation_algorithm(self):
        # Initial streaks are all 0
        streaks = calculate_streaks(self.user)
        self.assertEqual(streaks['current_streak'], 0)
        self.assertEqual(streaks['longest_present_streak'], 0)
        self.assertEqual(streaks['longest_absent_streak'], 0)

        # Mark 3 consecutive Presents
        dates = [
            datetime.date(2026, 7, 7),   # Tue
            datetime.date(2026, 7, 14),  # Tue
            datetime.date(2026, 7, 21)   # Tue
        ]
        
        for d in dates:
            Attendance.objects.create(
                student=self.user,
                subject=self.subject,
                lecture_slot=self.slot,
                date=d,
                status='Present'
            )
            
        streaks = calculate_streaks(self.user)
        self.assertEqual(streaks['current_streak'], 3)
        self.assertEqual(streaks['longest_present_streak'], 3)
        self.assertEqual(streaks['longest_absent_streak'], 0)

        # Mark 1 Absent (breaks the present streak)
        Attendance.objects.create(
            student=self.user,
            subject=self.subject,
            lecture_slot=self.slot,
            date=datetime.date(2026, 7, 28),
            status='Absent'
        )
        
        streaks = calculate_streaks(self.user)
        self.assertEqual(streaks['current_streak'], 0)
        self.assertEqual(streaks['longest_present_streak'], 3)
        self.assertEqual(streaks['longest_absent_streak'], 1)

    def test_smart_bunk_logic(self):
        # Target 75%
        # Case 1: Attended 8/10 (80%). Can bunk?
        # y <= (8 - 0.75 * 10) / 0.75 = (8 - 7.5) / 0.75 = 0.5 / 0.75 = 0.67 classes.
        # So we can bunk 0 classes safely.
        res = calculate_smart_bunk(attended=8, total=10, target_percentage=75)
        self.assertEqual(res['safe_bunks'], 0)
        self.assertEqual(res['consecutive_needed'], 0)

        # Case 2: Attended 9/10 (90%). Can bunk?
        # y <= (9 - 0.75 * 10) / 0.75 = (9 - 7.5) / 0.75 = 1.5 / 0.75 = 2 classes.
        res = calculate_smart_bunk(attended=9, total=10, target_percentage=75)
        self.assertEqual(res['safe_bunks'], 2)
        self.assertEqual(res['consecutive_needed'], 0)

        # Case 3: Attended 6/10 (60%). Needs consecutive?
        # x >= (0.75 * 10 - 6) / 0.25 = 1.5 / 0.25 = 6 classes.
        res = calculate_smart_bunk(attended=6, total=10, target_percentage=75)
        self.assertEqual(res['safe_bunks'], 0)
        self.assertEqual(res['consecutive_needed'], 6)

    def test_attendance_score_logic(self):
        # Perfect check-in (100% attendance, 0 late, 5 streak)
        score_data = calculate_attendance_score(
            overall_pct=100.0,
            total_lectures=5,
            late_count=0,
            longest_present_streak=5
        )
        self.assertEqual(score_data['score'], 100)
        self.assertEqual(score_data['label'], 'Excellent')
        self.assertEqual(score_data['color'], 'success')

        # Mid standing check-in
        score_data = calculate_attendance_score(
            overall_pct=70.0,
            total_lectures=10,
            late_count=2,
            longest_present_streak=3
        )
        # score = 0.6 * 70 + 0.2 * 80 + 0.2 * 60 = 42 + 16 + 12 = 70
        self.assertEqual(score_data['score'], 70)
        self.assertEqual(score_data['label'], 'Good')
        self.assertEqual(score_data['color'], 'warning')

    def test_fallback_insights_content(self):
        stats = {
            "overall_attendance": 65.0,
            "score": 60,
            "score_label": "Needs Improvement",
            "current_streak": 0,
            "longest_present_streak": 2,
            "late_count": 1,
            "subjects": [
                {
                    "name": "Computer Networks",
                    "code": "CS303",
                    "percentage": 65.0,
                    "present": 2,
                    "absent": 2,
                    "late": 1,
                    "total": 5
                }
            ]
        }
        insights = generate_local_fallback_insights(stats)
        self.assertIn("Action Required", insights)
        self.assertIn("CS303", insights)
