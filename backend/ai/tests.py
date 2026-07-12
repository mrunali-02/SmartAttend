import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from .models import AIPreferences, Conversation, ChatMessage
from timetable.models import Subject, LectureSlot
from ai.chatbot_views import generate_offline_fallback

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
        
        # Create AI preferences settings
        self.prefs = AIPreferences.objects.create(
            user=self.user,
            preferred_goal=80,
            response_style='Friendly'
        )

        # Create subject
        self.subject = Subject.objects.create(
            user=self.user,
            name='Software Engineering',
            code='CS304',
            faculty_name='Prof. Vikas',
            credits=3,
            semester='6',
            division='B',
            total_lectures=10,
            present_count=6,
            absent_count=4
        )

    def test_settings_preferences_endpoints(self):
        self.client.force_authenticate(user=self.user)
        
        # Test GET settings memory
        response = self.client.get('/api/ai/memory/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['preferred_goal'], 80)
        self.assertEqual(response.data['response_style'], 'Friendly')

        # Test PUT settings memory update
        response = self.client.put('/api/ai/memory/', {
            'preferred_goal': 85,
            'response_style': 'Concise',
            'enable_suggestions': False
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.prefs.refresh_from_db()
        self.assertEqual(self.prefs.preferred_goal, 85)
        self.assertEqual(self.prefs.response_style, 'Concise')
        self.assertFalse(self.prefs.enable_suggestions)

    def test_chatbot_conversations_creation_and_history(self):
        self.client.force_authenticate(user=self.user)
        
        # Verify initial conversations is 0
        self.assertEqual(Conversation.objects.filter(user=self.user).count(), 0)

        # Send query to AIChatView (should auto-create a conversation thread)
        response = self.client.post('/api/ai/chat/', {
            'message': 'Can I skip software engineering classes?'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("response", response.data)
        
        # Verify conversation thread was created
        self.assertEqual(Conversation.objects.filter(user=self.user).count(), 1)
        conv = Conversation.objects.first()
        
        # Verify messages inside conversation
        messages = conv.messages.all().order_by('timestamp')
        self.assertEqual(messages.count(), 2)
        self.assertEqual(messages[0].role, 'user')
        self.assertEqual(messages[1].role, 'model')
        
        # Rename conversation thread
        response = self.client.put(f'/api/ai/conversations/{conv.id}/', {
            'title': 'SE Skip Discussion'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        conv.refresh_from_db()
        self.assertEqual(conv.title, 'SE Skip Discussion')

        # Delete conversation thread
        response = self.client.delete(f'/api/ai/conversations/{conv.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Conversation.objects.filter(user=self.user).count(), 0)

    def test_local_offline_chat_fallback(self):
        # Test bunk query
        reply = generate_offline_fallback("can I skip class?", self.user, 80, [self.subject])
        self.assertIn("against skipping", reply)
