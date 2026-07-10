import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from .models import AIMemory, ChatMessage
from timetable.models import Subject, LectureSlot
from ai.chatbot_views import generate_offline_chat_fallback

User = get_user_model()

class AIChatbotTestCase(APITestCase):
    def setUp(self):
        # Create user
        self.user = User.objects.create_user(
            email='chatbot_user@example.com',
            password='testpassword123',
            full_name='Mrunali Patel',
            college_name='L.D. College',
            department='Information Technology',
            semester='6',
            division='B',
            roll_number='302',
            batch='2026'
        )
        
        # Create AI Memory settings
        self.memory = AIMemory.objects.create(
            user=self.user,
            preferred_goal=80,
            reminder_time_mins=10,
            geofencing_enabled=True
        )

        # Create subject
        self.subject = Subject.objects.create(
            user=self.user,
            name='Software Engineering',
            code='CS304',
            faculty_name='Prof. Vikas',
            credits=3,
            semester='6',
            division='B'
        )

    def test_settings_memory_endpoints(self):
        self.client.force_authenticate(user=self.user)
        
        # Test GET settings memory
        response = self.client.get('/api/ai/memory/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['preferred_goal'], 80)
        self.assertEqual(response.data['reminder_time_mins'], 10)
        self.assertTrue(response.data['geofencing_enabled'])

        # Test PUT settings memory update
        response = self.client.put('/api/ai/memory/', {
            'preferred_goal': 85,
            'reminder_time_mins': 20,
            'geofencing_enabled': False
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.memory.refresh_from_db()
        self.assertEqual(self.memory.preferred_goal, 85)
        self.assertEqual(self.memory.reminder_time_mins, 20)
        self.assertFalse(self.memory.geofencing_enabled)

    def test_chatbot_messages_saving_in_db(self):
        self.client.force_authenticate(user=self.user)
        
        # Verify initial messages is 0
        self.assertEqual(ChatMessage.objects.filter(user=self.user).count(), 0)

        # Send query to AIChatView
        response = self.client.post('/api/ai/chat/', {
            'message': 'Can I skip software engineering classes?'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("response", response.data)
        
        # Verify that 2 messages (1 user, 1 AI model reply) were saved in db
        messages = ChatMessage.objects.filter(user=self.user).order_by('timestamp')
        self.assertEqual(messages.count(), 2)
        self.assertEqual(messages[0].role, 'user')
        self.assertEqual(messages[1].role, 'model')
        self.assertEqual(messages[0].message, 'Can I skip software engineering classes?')

    def test_local_offline_chat_fallback(self):
        stats = {
            "name": "Mrunali Patel",
            "goal": 80,
            "low_subjects": ["CS304 (72%)"],
            "tomorrow_slots": 2
        }
        
        # Test bunk query
        reply = generate_offline_chat_fallback("can I skip class?", stats)
        self.assertIn("should NOT skip classes", reply)
        self.assertIn("CS304 (72%)", reply)

        # Test schedule query
        reply = generate_offline_chat_fallback("what lectures do I have tomorrow?", stats)
        self.assertIn("2 lecture(s)", reply)
