import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from timetable.models import Subject, LectureSlot
from attendance.models import Attendance

User = get_user_model()

class AttendanceTestCase(APITestCase):
    def setUp(self):
        # Create user
        self.user = User.objects.create_user(
            email='student@example.com',
            password='testpassword123',
            full_name='Test Student',
            college_name='Test College',
            department='Computer Science',
            semester='3',
            division='A',
            roll_number='101',
            batch='2026'
        )
        
        # Create subjects
        self.subject = Subject.objects.create(
            user=self.user,
            name='Database Management Systems',
            code='CS301',
            faculty_name='Dr. Sharma',
            credits=4,
            semester='3',
            division='A'
        )

        # Create slot (Monday 10:00 AM - 11:00 AM)
        self.slot = LectureSlot.objects.create(
            user=self.user,
            subject=self.subject,
            day='Monday',
            start_time=datetime.time(10, 0),
            end_time=datetime.time(11, 0),
            lecture_type='Theory'
        )

    def test_lecture_overlap_validation(self):
        # Create a new slot that overlaps with the existing slot (e.g. 10:30 AM - 11:30 AM)
        overlapping_slot = LectureSlot(
            user=self.user,
            subject=self.subject,
            day='Monday',
            start_time=datetime.time(10, 30),
            end_time=datetime.time(11, 30),
            lecture_type='Theory'
        )
        with self.assertRaises(ValidationError):
            overlapping_slot.clean()

    def test_mark_attendance_window_validation(self):
        self.client.force_authenticate(user=self.user)
        
        # Date is July 13, 2026 (which is a Monday)
        test_date = '2026-07-13'
        
        # Case 1: Early check-in (9:50 AM - too early, window starts at 9:55 AM)
        response = self.client.post('/api/attendance/records/mark/', {
            'lecture_slot_id': self.slot.id,
            'date': test_date,
            'status': 'Present',
            'device_time': '2026-07-13T09:50:00.000Z'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("window", response.data['error'].lower())

        # Case 2: On-time check-in (10:05 AM - valid)
        response = self.client.post('/api/attendance/records/mark/', {
            'lecture_slot_id': self.slot.id,
            'date': test_date,
            'status': 'Present',
            'device_time': '2026-07-13T10:05:00.000Z'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Case 3: Duplicate check-in (same slot, same date)
        response = self.client.post('/api/attendance/records/mark/', {
            'lecture_slot_id': self.slot.id,
            'date': test_date,
            'status': 'Present',
            'device_time': '2026-07-13T10:10:00.000Z'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already marked", response.data['error'].lower())

    def test_attendance_statistics_caching(self):
        # Initial check
        self.assertEqual(self.subject.total_lectures, 0)
        self.assertEqual(self.subject.present_count, 0)

        # Mark 1: Present (on Monday July 13, 2026)
        Attendance.objects.create(
            student=self.user,
            subject=self.subject,
            lecture_slot=self.slot,
            date=datetime.date(2026, 7, 13),
            status='Present'
        )
        # Refresh from database
        self.subject.refresh_from_db()
        self.assertEqual(self.subject.total_lectures, 1)
        self.assertEqual(self.subject.present_count, 1)

        # Mark 2: Absent (on Monday July 20, 2026)
        Attendance.objects.create(
            student=self.user,
            subject=self.subject,
            lecture_slot=self.slot,
            date=datetime.date(2026, 7, 20),
            status='Absent'
        )
        self.subject.refresh_from_db()
        self.assertEqual(self.subject.total_lectures, 2)
        self.assertEqual(self.subject.present_count, 1)
        self.assertEqual(self.subject.absent_count, 1)
        
        # Test deletion
        record = Attendance.objects.filter(status='Absent').first()
        record.delete()
        self.subject.refresh_from_db()
        self.assertEqual(self.subject.total_lectures, 1)
        self.assertEqual(self.subject.present_count, 1)
        self.assertEqual(self.subject.absent_count, 0)
