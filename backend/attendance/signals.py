from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Attendance

def update_subject_stats(subject):
    qs = Attendance.objects.filter(subject=subject)
    subject.present_count = qs.filter(status='Present').count()
    subject.absent_count = qs.filter(status='Absent').count()
    subject.late_count = qs.filter(status='Late').count()
    subject.cancelled_count = qs.filter(status='Cancelled').count()
    subject.total_lectures = subject.present_count + subject.absent_count + subject.late_count
    subject.save()

@receiver(post_save, sender=Attendance)
def attendance_saved(sender, instance, **kwargs):
    update_subject_stats(instance.subject)

@receiver(post_delete, sender=Attendance)
def attendance_deleted(sender, instance, **kwargs):
    update_subject_stats(instance.subject)
