import os
import datetime
import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import AIMemory, ChatMessage
from timetable.models import Subject, LectureSlot
from analytics.calculations import calculate_smart_bunk

logger = logging.getLogger(__name__)

class AIChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user_message = request.data.get('message')
        
        if not user_message:
            return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        # 1. Fetch user memory/settings
        memory, _ = AIMemory.objects.get_or_create(user=user)
        target_goal = memory.preferred_goal
        
        # 2. Gather database facts context for RAG
        subjects = Subject.objects.filter(user=user)
        subject_stats = []
        low_attendance_subjects = []
        
        for sub in subjects:
            attended = sub.present_count + sub.late_count
            total = sub.total_lectures
            pct = round((attended / total * 100), 2) if total > 0 else 100.0
            
            calc = calculate_smart_bunk(attended, total, target_goal)
            bunk_advice = ""
            if pct < target_goal:
                bunk_advice = f"needs {calc['consecutive_needed']} consecutive classes to hit {target_goal}%"
                low_attendance_subjects.append(f"{sub.name} ({pct}%)")
            else:
                bunk_advice = f"can safely miss {calc['safe_bunks']} classes"
                
            subject_stats.append(
                f"- {sub.name} ({sub.code}): {pct}% attendance (Attended {attended}/{total}), {bunk_advice}. Instructor: {sub.faculty_name}"
            )
            
        # Schedule Tomorrow
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
        
        # Format System Context
        rag_context = f"""
        You are 'Smartttend AI Assistant', a helpful and companion academic advisor.
        Answer student's questions using ONLY the facts and data below. Never invent or hallucinate data. If the question refers to data not available, politely say so.

        Student Profile:
        - Name: {user.full_name}
        - College: {user.college_name}
        - Semester / Division: Semester {user.semester} / Div {user.division}
        - Attendance Goal Target: {target_goal}%
        - Geofencing: {'Enabled' if memory.geofencing_enabled else 'Disabled'}

        Current Subject Attendance & Smart Bunk Status:
        {subject_stats_str}

        Tomorrow's Schedule ({tomorrow_day}):
        {tomorrow_schedule_str}
        """

        # Save User Message to History
        ChatMessage.objects.create(user=user, role='user', message=user_message)
        
        # Fetch previous message history (limit to last 15 messages for token control)
        history_msgs = ChatMessage.objects.filter(user=user).order_by('-timestamp')[:15]
        history_msgs = reversed(history_msgs) # chronological order
        
        # 3. Invoke Gemini
        api_key = os.environ.get('GEMINI_API_KEY')
        reply_text = ""
        
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                
                # Format conversation history
                contents = []
                # Inject RAG system context as a primer message
                contents.append({"role": "user", "parts": [f"System Instruction Primer:\n{rag_context}\n\nUnderstood. I will help the student using this database context."]})
                contents.append({"role": "model", "parts": ["Understood. I am ready to advise the student."]})
                
                for msg in history_msgs:
                    # Skip user message we just created to prevent duplication, it will be added at the end
                    if msg.message == user_message and msg.role == 'user':
                        continue
                    contents.append({
                        "role": "user" if msg.role == 'user' else "model",
                        "parts": [msg.message]
                    })
                    
                # Append user prompt
                contents.append({"role": "user", "parts": [user_message]})
                
                response = model.generate_content(contents)
                reply_text = response.text.strip()
                
            except Exception as e:
                logger.error(f"Gemini chat failed: {str(e)}")
                reply_text = generate_offline_chat_fallback(user_message, stats_context={
                    "name": user.full_name,
                    "goal": target_goal,
                    "low_subjects": low_attendance_subjects,
                    "tomorrow_slots": len(tomorrow_slots)
                })
        else:
            logger.info("GEMINI_API_KEY is not set. Generating chat fallback.")
            reply_text = generate_offline_chat_fallback(user_message, stats_context={
                "name": user.full_name,
                "goal": target_goal,
                "low_subjects": low_attendance_subjects,
                "tomorrow_slots": len(tomorrow_slots)
            })

        # Save AI Reply to History
        ChatMessage.objects.create(user=user, role='model', message=reply_text)
        
        return Response({
            "response": reply_text,
            "timestamp": timezone.now()
        })


def generate_offline_chat_fallback(message, stats_context):
    """
    Offline chatbot dialog logic fallback.
    """
    msg = message.lower()
    name = stats_context["name"]
    goal = stats_context["goal"]
    low = stats_context["low_subjects"]
    tomorrow = stats_context["tomorrow_slots"]
    
    if "skip" in msg or "bunk" in msg:
        if low:
            return f"Hi {name}, based on your database logs, you should NOT skip classes right now. Your attendance in {', '.join(low)} is below your {goal}% goal threshold."
        return f"Yes {name}, you have maintained a safe average above your {goal}% goal. You can safely bunk one lecture, but keep an eye on your dashboard simulator offsets!"
        
    if "tomorrow" in msg:
        if tomorrow > 0:
            return f"You have {tomorrow} lecture(s) scheduled for tomorrow. Open the Timetable tab to see the exact time intervals."
        return "You have no lectures scheduled for tomorrow. Enjoy your free day!"
        
    if "attendance" in msg or "percentage" in msg:
        if low:
            return f"Your overall attendance is in standing, but {', '.join(low)} needs immediate attention to cross your {goal}% target."
        return f"Your attendance is looking great and is fully above your {goal}% target goal. Good job!"
        
    if "goal" in msg:
        return f"Your preferred attendance goal is configured to {goal}%. You can customize this target inside the Settings page."
        
    return f"Hello {name}! I can answer questions about your schedule, attendance percentages, goal thresholds, or if you can bunk classes. Try asking: 'Can I skip tomorrow?'"


class AIMemoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        memory, _ = AIMemory.objects.get_or_create(user=request.user)
        return Response({
            "preferred_goal": memory.preferred_goal,
            "reminder_time_mins": memory.reminder_time_mins,
            "sync_calendar": memory.sync_calendar,
            "favorite_layout": memory.favorite_layout,
            "geofencing_enabled": memory.geofencing_enabled,
            "college_latitude": memory.college_latitude,
            "college_longitude": memory.college_longitude,
            "geofence_radius_meters": memory.geofence_radius_meters
        })

    def put(self, request):
        memory, _ = AIMemory.objects.get_or_create(user=request.user)
        
        memory.preferred_goal = request.data.get('preferred_goal', memory.preferred_goal)
        memory.reminder_time_mins = request.data.get('reminder_time_mins', memory.reminder_time_mins)
        memory.sync_calendar = request.data.get('sync_calendar', memory.sync_calendar)
        memory.favorite_layout = request.data.get('favorite_layout', memory.favorite_layout)
        memory.geofencing_enabled = request.data.get('geofencing_enabled', memory.geofencing_enabled)
        memory.college_latitude = request.data.get('college_latitude', memory.college_latitude)
        memory.college_longitude = request.data.get('college_longitude', memory.college_longitude)
        memory.geofence_radius_meters = request.data.get('geofence_radius_meters', memory.geofence_radius_meters)
        
        memory.save()
        return Response({"detail": "AI settings preferences saved successfully."})


class ChatHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        messages = ChatMessage.objects.filter(user=request.user).order_by('timestamp')
        history = [{"role": msg.role, "message": msg.message, "timestamp": msg.timestamp} for msg in messages]
        return Response(history)

    def delete(self, request):
        ChatMessage.objects.filter(user=request.user).delete()
        return Response({"detail": "Chat history cleared successfully."})
