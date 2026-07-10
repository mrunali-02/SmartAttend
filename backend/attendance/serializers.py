from rest_framework import serializers
from .models import Attendance
from timetable.serializers import SubjectSerializer, LectureSlotSerializer

class AttendanceSerializer(serializers.ModelSerializer):
    student_email = serializers.EmailField(source='student.email', read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    subject_details = SubjectSerializer(source='subject', read_only=True)
    lecture_slot_details = LectureSlotSerializer(source='lecture_slot', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_email', 'student_name', 'subject', 'subject_details',
            'lecture_slot', 'lecture_slot_details', 'date', 'status',
            'timestamp', 'device_time', 'time_difference', 'remarks'
        ]
        read_only_fields = ['student', 'subject', 'timestamp', 'time_difference']
