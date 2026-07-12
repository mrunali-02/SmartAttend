from rest_framework import serializers
from .models import Subject, LectureSlot
from django.core.exceptions import ValidationError

class SubjectSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    
    # Read-only cached fields
    total_lectures = serializers.IntegerField(read_only=True)
    present_count = serializers.IntegerField(read_only=True)
    absent_count = serializers.IntegerField(read_only=True)
    late_count = serializers.IntegerField(read_only=True)
    attendance_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = [
            'id', 'user', 'name', 'code', 'faculty_name', 'credits',
            'semester', 'division', 'batch', 'color', 'is_active',
            'total_lectures', 'present_count', 'absent_count', 'late_count',
            'attendance_percentage'
        ]

    def get_attendance_percentage(self, obj):
        if obj.total_lectures > 0:
            # Late status counts as present for percentage
            attended = obj.present_count + obj.late_count
            return round((attended / obj.total_lectures) * 100, 2)
        return 100.0  # Default to 100% if no lectures marked yet

    def validate(self, attrs):
        # Unique code per user validation
        user = self.context['request'].user
        code = attrs.get('code')
        if code:
            qs = Subject.objects.filter(user=user, code=code)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"code": "You have already created a subject with this code."})
        return attrs


class LectureSlotSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    subject_details = SubjectSerializer(source='subject', read_only=True)
    attendance_status = serializers.SerializerMethodField()

    class Meta:
        model = LectureSlot
        fields = [
            'id', 'user', 'subject', 'subject_details', 'day',
            'start_time', 'end_time', 'lecture_type', 'building', 'classroom',
            'attendance_status'
        ]

    def get_attendance_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        target_date = self.context.get('target_date')
        if not target_date:
            from django.utils import timezone
            target_date = timezone.now().date()
        elif isinstance(target_date, str):
            from django.utils import timezone
            import datetime
            try:
                target_date = datetime.datetime.strptime(target_date, '%Y-%m-%d').date()
            except ValueError:
                target_date = timezone.now().date()
                
        from attendance.models import Attendance
        att = Attendance.objects.filter(student=request.user, lecture_slot=obj, date=target_date).first()
        return att.status if att else None

    def validate(self, attrs):
        # Perform overlap and logic check via model clean
        instance = LectureSlot(**attrs)
        if self.instance:
            instance.pk = self.instance.pk
            instance.user = self.instance.user
        else:
            instance.user = self.context['request'].user
        
        try:
            instance.clean()
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)
        
        return attrs
