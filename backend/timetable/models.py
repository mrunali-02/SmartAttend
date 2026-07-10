from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class Subject(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subjects'
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    faculty_name = models.CharField(max_length=255)
    credits = models.PositiveIntegerField(default=3)
    semester = models.CharField(max_length=10)
    division = models.CharField(max_length=10)
    batch = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=20, default='#3b82f6')
    is_active = models.BooleanField(default=True)
    
    # Precalculated statistics for performance
    total_lectures = models.PositiveIntegerField(default=0)
    present_count = models.PositiveIntegerField(default=0)
    absent_count = models.PositiveIntegerField(default=0)
    late_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('user', 'code')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

class LectureSlot(models.Model):
    DAY_CHOICES = [
        ('Monday', 'Monday'),
        ('Tuesday', 'Tuesday'),
        ('Wednesday', 'Wednesday'),
        ('Thursday', 'Thursday'),
        ('Friday', 'Friday'),
        ('Saturday', 'Saturday'),
    ]
    LECTURE_TYPE_CHOICES = [
        ('Theory', 'Theory'),
        ('Practical', 'Practical'),
        ('Lab', 'Lab'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lecture_slots'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='lecture_slots'
    )
    day = models.CharField(max_length=15, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    lecture_type = models.CharField(
        max_length=15,
        choices=LECTURE_TYPE_CHOICES,
        default='Theory'
    )

    class Meta:
        ordering = ['day', 'start_time']

    def __str__(self):
        return f"{self.subject.name} | {self.day} {self.start_time}-{self.end_time}"

    def clean(self):
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time.")
        
        # Overlap check for the same user on the same day
        overlapping = LectureSlot.objects.filter(
            user=self.user,
            day=self.day,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        )
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)
        
        if overlapping.exists():
            raise ValidationError("This lecture slot overlaps with an existing scheduled lecture.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
