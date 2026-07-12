from django.db import models
from django.conf import settings

class AIPreferences(models.Model):
    RESPONSE_LENGTH_CHOICES = [
        ('Short', 'Short'),
        ('Medium', 'Medium'),
        ('Detailed', 'Detailed'),
    ]
    RESPONSE_STYLE_CHOICES = [
        ('Professional', 'Professional'),
        ('Friendly', 'Friendly'),
        ('Concise', 'Concise'),
        ('Technical', 'Technical'),
        ('Simple Language', 'Simple Language'),
    ]
    REMINDER_TIME_CHOICES = [
        ('5 Minutes', '5 Minutes'),
        ('10 Minutes', '10 Minutes'),
        ('15 Minutes', '15 Minutes'),
        ('30 Minutes', '30 Minutes'),
        ('Custom', 'Custom'),
    ]
    THEME_CHOICES = [
        ('Light', 'Light'),
        ('Dark', 'Dark'),
        ('System', 'System'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_preferences'
    )
    response_length = models.CharField(max_length=20, choices=RESPONSE_LENGTH_CHOICES, default='Medium')
    response_style = models.CharField(max_length=30, choices=RESPONSE_STYLE_CHOICES, default='Friendly')
    preferred_goal = models.PositiveIntegerField(default=75)
    
    # Feature Toggles
    enable_suggestions = models.BooleanField(default=True)
    enable_daily_summary = models.BooleanField(default=True)
    enable_attendance_warnings = models.BooleanField(default=True)
    enable_weekly_insights = models.BooleanField(default=True)
    enable_monthly_report = models.BooleanField(default=True)
    enable_smart_recommendations = models.BooleanField(default=True)
    auto_generate_reports = models.BooleanField(default=True)
    voice_assistant = models.BooleanField(default=False)
    geofencing_enabled = models.BooleanField(default=False)
    college_latitude = models.FloatField(default=19.076)
    college_longitude = models.FloatField(default=72.8777)
    geofence_radius_meters = models.PositiveIntegerField(default=200)
    
    # Timings & Locale
    preferred_reminder_time = models.CharField(max_length=20, choices=REMINDER_TIME_CHOICES, default='15 Minutes')
    language = models.CharField(max_length=50, default='English')
    theme_preference = models.CharField(max_length=20, choices=THEME_CHOICES, default='System')
    
    # Privacy Settings
    allow_attendance_data = models.BooleanField(default=True)
    allow_timetable_analysis = models.BooleanField(default=True)
    allow_report_analysis = models.BooleanField(default=True)
    allow_analytics = models.BooleanField(default=True)

    def __str__(self):
        return f"AI Preferences for {self.user.email}"


class Conversation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    title = models.CharField(max_length=255, default='New Chat')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.user.email})"


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('model', 'Model'),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        null=True,
        blank=True
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    message = models.TextField()
    is_liked = models.BooleanField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.role}: {self.message[:30]}"
