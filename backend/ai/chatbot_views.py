import os
import datetime
import logging
from django.utils import timezone
from django.db.models import Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import AIPreferences, Conversation, ChatMessage
from timetable.models import Subject, LectureSlot
from analytics.calculations import calculate_smart_bunk

logger = logging.getLogger(__name__)

class AIChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user_message = request.data.get('message')
        conversation_id = request.data.get('conversation_id')
        
        if not user_message:
            return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        # 1. Fetch/Create Conversation thread
        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, user=user)
            except Conversation.DoesNotExist:
                return Response({"error": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            conversation = Conversation.objects.create(
                user=user,
                title=user_message[:40] if len(user_message) > 40 else user_message
            )
            
        # 2. Get AI Preferences
        prefs, _ = AIPreferences.objects.get_or_create(user=user)
        target_goal = prefs.preferred_goal
        
        # 3. Gather RAG facts context
        subjects = Subject.objects.filter(user=user)
        subject_stats = []
        
        for sub in subjects:
            attended = sub.present_count + sub.late_count
            total = sub.total_lectures
            pct = round((attended / total * 100), 2) if total > 0 else 100.0
            
            calc = calculate_smart_bunk(attended, total, target_goal)
            bunk_advice = ""
            if pct < target_goal:
                bunk_advice = f"needs {calc['consecutive_needed']} consecutive classes to hit {target_goal}%"
            else:
                bunk_advice = f"can safely miss {calc['safe_bunks']} classes"
                
            subject_stats.append(
                f"- {sub.name} ({sub.code}): {pct}% attendance (Attended {attended}/{total}), {bunk_advice}."
            )
            
        tomorrow_date = timezone.now().date() + datetime.timedelta(days=1)
        tomorrow_day = tomorrow_date.strftime('%A')
        tomorrow_slots = LectureSlot.objects.filter(user=user, day=tomorrow_day).order_by('start_time')
        
        tomorrow_schedule = []
        for slot in tomorrow_slots:
            tomorrow_schedule.append(
                f"- {slot.subject.name} ({slot.subject.code}) at {slot.start_time.strftime('%I:%M %p')} - {slot.end_time.strftime('%I:%M %p')} ({slot.lecture_type})"
            )
            
        tomorrow_schedule_str = "\n".join(tomorrow_schedule) if tomorrow_schedule else "No lectures scheduled for tomorrow."
        subject_stats_str = "\n".join(subject_stats) if subject_stats else "No subjects registered."
        
        # Assemble Prompt Context
        rag_context = f"""
        You are 'Smartttend AI Assistant', a helpful and companion academic advisor.
        Answer student's questions using ONLY the facts and data below. Never invent or duplicate fake attendance logs.
        Format your response cleanly in Markdown paragraphs.
        
        AI Style Settings:
        - Response Tone: {prefs.response_style}
        - Response Length: {prefs.response_length}

        Student Profile:
        - Name: {user.full_name or user.name}
        - Email: {user.email}
        - Student ID: {user.student_id}
        - Semester / Division: Semester {user.semester} / Div {user.division}
        - Department / Branch: {user.department}
        - Batch: {user.batch}
        - Academic Year: {user.academic_year}
        - Attendance Goal Target: {target_goal}%

        Current Subject Attendance & Smart Bunk Status:
        {subject_stats_str}

        Tomorrow's Schedule ({tomorrow_day}):
        {tomorrow_schedule_str}
        """

        # Save User Message
        ChatMessage.objects.create(conversation=conversation, role='user', message=user_message)
        
        # Load thread conversation history (limit to last 20 messages for context window)
        history_msgs = ChatMessage.objects.filter(conversation=conversation).order_by('-timestamp')[:20]
        history_msgs = reversed(history_msgs)
        
        api_key = os.environ.get('GEMINI_API_KEY')
        reply_text = ""
        
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-2.5-flash')
                
                contents = []
                # Inject RAG system context
                contents.append({"role": "user", "parts": [f"System Instructions:\n{rag_context}\n\nUnderstood. I will help the student using this database context."]})
                contents.append({"role": "model", "parts": ["Understood. I am ready to advise the student."]})
                
                for msg in history_msgs:
                    # Skip the newly created message to avoid duplicate input
                    if msg.message == user_message and msg.role == 'user':
                        continue
                    contents.append({
                        "role": "user" if msg.role == 'user' else "model",
                        "parts": [msg.message]
                    })
                    
                contents.append({"role": "user", "parts": [user_message]})
                
                response = model.generate_content(contents)
                reply_text = response.text.strip()
                
            except Exception as e:
                logger.error(f"Gemini API invocation failed: {str(e)}")
                reply_text = generate_offline_fallback(user_message, user, target_goal, subjects)
        else:
            reply_text = generate_offline_fallback(user_message, user, target_goal, subjects)

        # Save Model Reply
        ChatMessage.objects.create(conversation=conversation, role='model', message=reply_text)
        
        # Auto rename conversation from default if it's the first exchange
        if conversation.title == 'New Chat' or len(conversation.messages.all()) <= 2:
            conversation.title = user_message[:40]
            conversation.save()

        return Response({
            "id": conversation.id,
            "title": conversation.title,
            "response": reply_text,
            "timestamp": timezone.now()
        })


def generate_offline_fallback(message, user, goal, subjects):
    msg = message.lower()
    low_subs = []
    for sub in subjects:
        attended = sub.present_count + sub.late_count
        pct = (attended / sub.total_lectures * 100) if sub.total_lectures > 0 else 100.0
        if pct < goal:
            low_subs.append(f"{sub.code} ({round(pct)}%)")

    if "skip" in msg or "bunk" in msg:
        if low_subs:
            return f"Based on your course averages, I advise **against skipping** any classes today. Your attendance in {', '.join(low_subs)} is below your {goal}% goal target."
        return f"Your subject consistency is healthy! You can skip one class if necessary, but review your simulator dashboard options first."
        
    if "attendance" in msg or "percentage" in msg:
        if low_subs:
            return f"Your overall standing is acceptable, but {', '.join(low_subs)} needs attendance check-ins to hit your {goal}% goal target."
        return f"Congratulations, {user.full_name}! Your course attendance is fully above your {goal}% target goal."
        
    return f"Hello {user.full_name}! I am currently offline. I can assist you with basic schedules, goal planners, and bunk queries. Ask: 'Can I skip tomorrow?'"


class ConversationViewSet(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # List all conversations
        conversations = Conversation.objects.filter(user=request.user).order_by('-updated_at')
        data = []
        for conv in conversations:
            data.append({
                "id": conv.id,
                "title": conv.title,
                "created_at": conv.created_at,
                "updated_at": conv.updated_at
            })
        return Response(data)

    def post(self, request):
        # Create new chat thread
        title = request.data.get('title', 'New Chat')
        conv = Conversation.objects.create(user=request.user, title=title)
        return Response({
            "id": conv.id,
            "title": conv.title,
            "created_at": conv.created_at
        }, status=status.HTTP_201_CREATED)


class ConversationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            conv = Conversation.objects.get(id=pk, user=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
            
        messages = conv.messages.all().order_by('timestamp')
        messages_data = [{
            "id": m.id,
            "role": m.role,
            "message": m.message,
            "is_liked": m.is_liked,
            "timestamp": m.timestamp
        } for m in messages]
        
        return Response({
            "id": conv.id,
            "title": conv.title,
            "messages": messages_data
        })

    def put(self, request, pk):
        # Rename conversation thread
        try:
            conv = Conversation.objects.get(id=pk, user=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
            
        title = request.data.get('title')
        if not title:
            return Response({"error": "Title is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        conv.title = title
        conv.save()
        return Response({"id": conv.id, "title": conv.title})

    def delete(self, request, pk):
        # Delete conversation thread
        try:
            conv = Conversation.objects.get(id=pk, user=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
            
        conv.delete()
        return Response({"detail": "Conversation deleted successfully."})


class ChatMessageFeedbackView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        # Like / Dislike message
        try:
            msg = ChatMessage.objects.get(id=message_id, conversation__user=request.user)
        except ChatMessage.DoesNotExist:
            return Response({"error": "Message not found."}, status=status.HTTP_404_NOT_FOUND)
            
        is_liked = request.data.get('is_liked')
        msg.is_liked = is_liked
        msg.save()
        return Response({"id": msg.id, "is_liked": msg.is_liked})


class AIPreferencesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        prefs, _ = AIPreferences.objects.get_or_create(user=request.user)
        return Response({
            "response_length": prefs.response_length,
            "response_style": prefs.response_style,
            "preferred_goal": prefs.preferred_goal,
            "enable_suggestions": prefs.enable_suggestions,
            "enable_daily_summary": prefs.enable_daily_summary,
            "enable_attendance_warnings": prefs.enable_attendance_warnings,
            "enable_weekly_insights": prefs.enable_weekly_insights,
            "enable_monthly_report": prefs.enable_monthly_report,
            "enable_smart_recommendations": prefs.enable_smart_recommendations,
            "auto_generate_reports": prefs.auto_generate_reports,
            "voice_assistant": prefs.voice_assistant,
            "preferred_reminder_time": prefs.preferred_reminder_time,
            "language": prefs.language,
            "theme_preference": prefs.theme_preference,
            "allow_attendance_data": prefs.allow_attendance_data,
            "allow_timetable_analysis": prefs.allow_timetable_analysis,
            "allow_report_analysis": prefs.allow_report_analysis,
            "allow_analytics": prefs.allow_analytics
        })

    def put(self, request):
        prefs, _ = AIPreferences.objects.get_or_create(user=request.user)
        
        prefs.response_length = request.data.get('response_length', prefs.response_length)
        prefs.response_style = request.data.get('response_style', prefs.response_style)
        prefs.preferred_goal = request.data.get('preferred_goal', prefs.preferred_goal)
        prefs.enable_suggestions = request.data.get('enable_suggestions', prefs.enable_suggestions)
        prefs.enable_daily_summary = request.data.get('enable_daily_summary', prefs.enable_daily_summary)
        prefs.enable_attendance_warnings = request.data.get('enable_attendance_warnings', prefs.enable_attendance_warnings)
        prefs.enable_weekly_insights = request.data.get('enable_weekly_insights', prefs.enable_weekly_insights)
        prefs.enable_monthly_report = request.data.get('enable_monthly_report', prefs.enable_monthly_report)
        prefs.enable_smart_recommendations = request.data.get('enable_smart_recommendations', prefs.enable_smart_recommendations)
        prefs.auto_generate_reports = request.data.get('auto_generate_reports', prefs.auto_generate_reports)
        prefs.voice_assistant = request.data.get('voice_assistant', prefs.voice_assistant)
        prefs.preferred_reminder_time = request.data.get('preferred_reminder_time', prefs.preferred_reminder_time)
        prefs.language = request.data.get('language', prefs.language)
        prefs.theme_preference = request.data.get('theme_preference', prefs.theme_preference)
        
        # Privacy
        prefs.allow_attendance_data = request.data.get('allow_attendance_data', prefs.allow_attendance_data)
        prefs.allow_timetable_analysis = request.data.get('allow_timetable_analysis', prefs.allow_timetable_analysis)
        prefs.allow_report_analysis = request.data.get('allow_report_analysis', prefs.allow_report_analysis)
        prefs.allow_analytics = request.data.get('allow_analytics', prefs.allow_analytics)
        
        prefs.save()
        return Response({"detail": "AI settings preferences saved successfully."})


class AIUsageDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Total chats
        total_chats = Conversation.objects.filter(user=user).count()
        
        # Total messages
        total_messages = ChatMessage.objects.filter(conversation__user=user).count()
        
        # Chats created today
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_chats = Conversation.objects.filter(user=user, created_at__gte=today_start).count()
        
        # Mock responses times
        avg_response_time = "1.2s"
        api_status = "Connected"
        connection_status = "Online"
        
        # Weekly usage summary
        weekly_usage = [
            {"name": "Mon", "chats": 2},
            {"name": "Tue", "chats": 5},
            {"name": "Wed", "chats": 3},
            {"name": "Thu", "chats": 7},
            {"name": "Fri", "chats": 4},
            {"name": "Sat", "chats": 0},
            {"name": "Sun", "chats": 1}
        ]
        
        return Response({
            "total_chats": total_chats,
            "total_messages": total_messages,
            "today_chats": today_chats,
            "avg_response_time": avg_response_time,
            "api_status": api_status,
            "connection_status": connection_status,
            "weekly_usage": weekly_usage,
            "gemini_version": "Gemini 2.5 Flash",
            "api_model": "gemini-2.5-flash",
            "last_used": timezone.now()
        })


class AIMemoryResetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        # Delete conversations and preferences
        Conversation.objects.filter(user=user).delete()
        AIPreferences.objects.filter(user=user).delete()
        return Response({"detail": "AI memory and preferences cleared successfully."})
