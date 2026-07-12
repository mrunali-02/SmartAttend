from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'name', 'college_name', 'department',
            'semester', 'division', 'roll_number', 'batch', 'student_id',
            'prn_number', 'academic_year', 'profile_photo', 'profile_photo_url',
            'mobile_number', 'date_of_birth', 'gender', 'degree', 'current_year',
            'student_status', 'university', 'course', 'class_teacher',
            'teacher_guardian', 'parent_contact',
            'created_at', 'updated_at', 'date_joined'
        ]
        read_only_fields = ['id', 'email', 'profile_photo_url', 'created_at', 'updated_at', 'date_joined']

    def update(self, instance, validated_data):
        if 'name' in validated_data and validated_data['name']:
            validated_data['full_name'] = validated_data['name']
        elif 'full_name' in validated_data and validated_data['full_name']:
            validated_data['name'] = validated_data['full_name']
        return super().update(instance, validated_data)

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = [
            'email', 'password', 'confirm_password', 'full_name',
            'college_name', 'department', 'semester', 'division',
            'roll_number', 'batch'
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Password fields must match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            college_name=validated_data['college_name'],
            department=validated_data['department'],
            semester=validated_data['semester'],
            division=validated_data['division'],
            roll_number=validated_data['roll_number'],
            batch=validated_data['batch']
        )
        return user
