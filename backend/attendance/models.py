from django.db import models
from django.conf import settings
from timetable.models import Subject, LectureSlot

class Attendance(models.Model):
    STATUS_CHOICES = [
        ('Present', 'Present'),
        ('Absent', 'Absent'),
        ('Late', 'Late'),
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
