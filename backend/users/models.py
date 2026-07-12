from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get('is_superuser') is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    clerk_user_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=255)
    name = models.CharField(max_length=255, null=True, blank=True)
    college_name = models.CharField(max_length=255, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    semester = models.CharField(max_length=10, null=True, blank=True)  # e.g., "1", "Semester 3"
    division = models.CharField(max_length=10, null=True, blank=True)
    roll_number = models.CharField(max_length=50, null=True, blank=True)
    batch = models.CharField(max_length=50, null=True, blank=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    profile_photo_url = models.URLField(max_length=500, null=True, blank=True) # URL from Google/Clerk
    student_id = models.CharField(max_length=100, null=True, blank=True)
    prn_number = models.CharField(max_length=100, null=True, blank=True)
    academic_year = models.CharField(max_length=50, null=True, blank=True)
    
    # New Profile Redesign Fields
    mobile_number = models.CharField(max_length=20, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    degree = models.CharField(max_length=50, null=True, blank=True)
    current_year = models.CharField(max_length=50, null=True, blank=True)
    student_status = models.CharField(max_length=50, null=True, blank=True)
    university = models.CharField(max_length=255, null=True, blank=True)
    course = models.CharField(max_length=255, null=True, blank=True)
    class_teacher = models.CharField(max_length=100, null=True, blank=True)
    teacher_guardian = models.CharField(max_length=100, null=True, blank=True)
    parent_contact = models.CharField(max_length=20, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    def __str__(self):
        return self.email
