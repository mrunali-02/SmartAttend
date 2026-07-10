from django.db import models
from django.conf import settings

class AIMemory(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_memory'
    )
    preferred_goal = models.PositiveIntegerField(default=75)
    reminder_time_mins = models.PositiveIntegerField(default=15)
    sync_calendar = models.BooleanField(default=False)
    favorite_layout = models.CharField(max_length=50, default='Default')
    geofencing_enabled = models.BooleanField(default=False)
    college_latitude = models.FloatField(default=19.076)
    college_longitude = models.FloatField(default=72.8777)
    geofence_radius_meters = models.PositiveIntegerField(default=200)

    def __str__(self):
        return f"AI Memory for {self.user.email}"

class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('model', 'Model'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_messages'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.user.email} - {self.role}: {self.message[:30]}"
