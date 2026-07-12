from django.db import models
from django.conf import settings
from timetable.models import Subject, LectureSlot

class Attendance(models.Model):
    STATUS_CHOICES = [
        ('Present', 'Present'),
        ('Absent', 'Absent'),
        ('Late', 'Late'),
        ('Cancelled', 'Cancelled'),
        ('Holiday', 'Holiday'),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    lecture_slot = models.ForeignKey(
        LectureSlot,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    device_time = models.DateTimeField(null=True, blank=True)
    time_difference = models.IntegerField(null=True, blank=True)  # difference in minutes
    remarks = models.TextField(blank=True, default='')

    class Meta:
        unique_together = ('student', 'lecture_slot', 'date')
        ordering = ['-date', '-timestamp']

    def __str__(self):
        return f"{self.student.email} - {self.subject.name} - {self.date} ({self.status})"

class Notification(models.Model):
    CATEGORY_CHOICES = [
        ('Reminder', 'Reminder'),
        ('Warning', 'Warning'),
        ('Goal', 'Goal'),
        ('General', 'General'),
    ]
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='General')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Medium')
    is_read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.student.email} - {self.title} ({'Read' if self.is_read else 'Unread'})"
