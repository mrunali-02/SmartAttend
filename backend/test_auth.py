import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    # Cleanup previous tests
    User.objects.filter(email="test@college.edu").delete()
    
    # Create user
    user = User.objects.create_user(
        email="test@college.edu",
        password="securepassword123",
        full_name="Alice Smith",
        college_name="State College",
        department="Computer Science",
        semester="5",
        division="A",
        roll_number="CS105",
        batch="2024"
    )
    print("User created successfully:", user)
    
    # Verify password hashing
    assert user.check_password("securepassword123") == True
    print("Password hashing verified.")
    
    # Verify username field is email
    assert User.USERNAME_FIELD == 'email'
    print("Username field verified as email.")
    
    # Cleanup
    user.delete()
    print("Cleanup successful. Test PASSED!")
except Exception as e:
    print("Test FAILED with error:", e)
