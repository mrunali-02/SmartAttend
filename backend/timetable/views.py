from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
import datetime

from .models import Subject, LectureSlot
from .serializers import SubjectSerializer, LectureSlotSerializer
from .ocr_service import parse_timetable_file

class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LectureSlotViewSet(viewsets.ModelViewSet):
    serializer_class = LectureSlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LectureSlot.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Pass the date to the serializer context to dynamically check attendance_status
        date_param = self.request.query_params.get('date') or self.request.data.get('date')
        context['target_date'] = date_param
        return context

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['GET'], url_path='today')
    def today(self, request):
        """
        Returns today's lecture slots sorted by start time.
        Allows passing 'date' (YYYY-MM-DD) or 'day' (e.g. Monday) in query params.
        """
        # Determine day of week
        day_param = request.query_params.get('day')
        date_param = request.query_params.get('date')
        
        if date_param:
            try:
                target_date = datetime.datetime.strptime(date_param, '%Y-%m-%d').date()
                day_of_week = target_date.strftime('%A')
            except ValueError:
                target_date = timezone.now().date()
                day_of_week = target_date.strftime('%A')
        else:
            target_date = timezone.now().date()
            day_of_week = target_date.strftime('%A') if not day_param else day_param

        # Filter slots by day
        slots = LectureSlot.objects.filter(user=request.user, day=day_of_week).order_by('start_time')
        
        # Pass date down to serializer context
        serializer = self.get_serializer(slots, many=True, context={
            'request': request,
            'target_date': date_param or str(target_date)
        })
        
        return Response({
            "day": day_of_week,
            "date": str(target_date),
            "lectures": serializer.data
        })

    @action(detail=False, methods=['GET'], url_path='weekly')
    def weekly(self, request):
        """
        Returns all lecture slots grouped by day of the week.
        """
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        slots = LectureSlot.objects.filter(user=request.user)
        
        grouped_slots = {day: [] for day in days}
        
        for slot in slots:
            if slot.day in grouped_slots:
                serializer = self.get_serializer(slot)
                grouped_slots[slot.day].append(serializer.data)
                
        # Sort each day's slots by start time
        for day in days:
            grouped_slots[day].sort(key=lambda x: x['start_time'])
            
        return Response(grouped_slots)

    @action(detail=False, methods=['POST'], url_path='import')
    def import_timetable(self, request):
        """
        Endpoint to upload timetable file and parse it.
        Returns a list of extracted subjects and lecture slots.
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            parsed_slots = parse_timetable_file(file_obj)
            return Response({
                "detail": "Timetable processed successfully.",
                "slots": parsed_slots
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to parse timetable: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'], url_path='confirm-import')
    def confirm_import(self, request):
        """
        Saves the parsed/edited slots list to the database.
        Creates subjects (if they do not already exist) and lecture slots.
        """
        slots_data = request.data.get('slots', [])
        if not slots_data:
            return Response({"error": "No slot data provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        created_subjects = 0
        created_slots = 0
        
        try:
            for slot in slots_data:
                # Find or create Subject
                subject_name = slot.get('subject_name')
                subject_code = slot.get('subject_code')
                faculty_name = slot.get('faculty_name', 'TBD')
                color = slot.get('color', '#3b82f6')
                
                subject, created = Subject.objects.get_or_create(
                    user=request.user,
                    code=subject_code,
                    defaults={
                        'name': subject_name,
                        'faculty_name': faculty_name,
                        'credits': 3,
                        'semester': request.user.semester or '1',
                        'division': request.user.division or 'A',
                        'color': color
                    }
                )
                if created:
                    created_subjects += 1
                    
                # Create LectureSlot
                start_time_str = slot.get('start_time')
                end_time_str = slot.get('end_time')
                day = slot.get('day')
                lecture_type = slot.get('lecture_type', 'Theory')
                
                # Double-check overlap before creating
                overlapping = LectureSlot.objects.filter(
                    user=request.user,
                    day=day,
                    start_time__lt=end_time_str,
                    end_time__gt=start_time_str
                )
                
                if not overlapping.exists():
                    LectureSlot.objects.create(
                        user=request.user,
                        subject=subject,
                        day=day,
                        start_time=start_time_str,
                        end_time=end_time_str,
                        lecture_type=lecture_type
                    )
                    created_slots += 1
                    
            return Response({
                "detail": f"Import completed successfully. Created {created_subjects} subjects and {created_slots} lecture slots.",
                "created_subjects": created_subjects,
                "created_slots": created_slots
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": f"Failed to save timetable slots: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.views import APIView

class TimetableUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            parsed_slots = parse_timetable_file(file_obj)
            low_confidence = len(parsed_slots) == 0
            
            return Response({
                "detail": "We couldn't confidently extract your timetable. Please review and edit the detected subjects before saving." if low_confidence else "Timetable processed successfully.",
                "low_confidence": low_confidence,
                "slots": parsed_slots
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to parse timetable: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class TimetableSaveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        slots_data = request.data.get('slots', [])
        created_subjects = 0
        created_slots = 0
        
        try:
            for slot in slots_data:
                subject_name = slot.get('subject_name')
                subject_code = slot.get('subject_code') or subject_name[:6].upper().replace(" ", "")
                faculty_name = slot.get('faculty_name', 'TBD')
                color = slot.get('color', '#3b82f6')
                
                subject, created = Subject.objects.get_or_create(
                    user=request.user,
                    code=subject_code,
                    defaults={
                        'name': subject_name,
                        'faculty_name': faculty_name,
                        'credits': 3,
                        'semester': request.user.semester or '1',
                        'division': request.user.division or 'A',
                        'color': color
                    }
                )
                if created:
                    created_subjects += 1
                    
                # Create LectureSlot
                start_time_str = slot.get('start_time')
                end_time_str = slot.get('end_time')
                day = slot.get('day')
                lecture_type = slot.get('lecture_type', 'Theory')
                classroom = slot.get('classroom', '')
                
                # Check overlapping slots to prevent duplicates
                overlapping = LectureSlot.objects.filter(
                    user=request.user,
                    day=day,
                    start_time=start_time_str,
                    end_time=end_time_str
                )
                
                if not overlapping.exists():
                    LectureSlot.objects.create(
                        user=request.user,
                        subject=subject,
                        day=day,
                        start_time=start_time_str,
                        end_time=end_time_str,
                        lecture_type=lecture_type,
                        classroom=classroom
                    )
                    created_slots += 1
                    
            return Response({
                "detail": f"Timetable saved successfully. Created {created_subjects} subjects and {created_slots} slots.",
                "created_subjects": created_subjects,
                "created_slots": created_slots
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": f"Failed to save timetable: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class TimetableListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        slots = LectureSlot.objects.filter(user=request.user).order_by('day', 'start_time')
        serializer = LectureSlotSerializer(slots, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data
        subject_name = data.get('subject_name')
        subject_code = data.get('subject_code') or subject_name[:6].upper().replace(" ", "")
        faculty_name = data.get('faculty_name')
        building = data.get('building')
        classroom = data.get('classroom', '')
        day = data.get('day')
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        lecture_type = data.get('lecture_type', 'Theory')
        credits = int(data.get('credits', 3) or 3)
        color = data.get('color', '#3b82f6')

        if not subject_name or not faculty_name or not building or not day or not start_time_str or not end_time_str:
            return Response({"error": "Subject Name, Faculty Name, Building, Day, Start Time, and End Time are required fields."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate times
        try:
            import datetime
            t_start = datetime.datetime.strptime(start_time_str, "%H:%M").time() if len(start_time_str) == 5 else datetime.datetime.strptime(start_time_str, "%H:%M:%S").time()
            t_end = datetime.datetime.strptime(end_time_str, "%H:%M").time() if len(end_time_str) == 5 else datetime.datetime.strptime(end_time_str, "%H:%M:%S").time()
            if t_start >= t_end:
                return Response({"error": "End time must be after start time."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"error": "Invalid start_time or end_time format. Use HH:MM format."}, status=status.HTTP_400_BAD_REQUEST)

        # Overlapping check
        overlapping = LectureSlot.objects.filter(
            user=request.user,
            day=day,
            start_time__lt=end_time_str,
            end_time__gt=start_time_str
        )
        if overlapping.exists():
            return Response({"error": "This lecture slot overlaps with an existing scheduled lecture on the same day."}, status=status.HTTP_400_BAD_REQUEST)

        # Create or get subject
        subject, created = Subject.objects.get_or_create(
            user=request.user,
            code=subject_code,
            defaults={
                'name': subject_name,
                'faculty_name': faculty_name,
                'credits': credits,
                'semester': request.user.semester or '1',
                'division': request.user.division or 'A',
                'color': color
            }
        )

        # Create slot
        slot = LectureSlot.objects.create(
            user=request.user,
            subject=subject,
            day=day,
            start_time=start_time_str,
            end_time=end_time_str,
            lecture_type=lecture_type,
            building=building,
            classroom=classroom
        )

        serializer = LectureSlotSerializer(slot)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TimetableDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        try:
            slot = LectureSlot.objects.get(pk=pk, user=request.user)
        except LectureSlot.DoesNotExist:
            return Response({"error": "Lecture slot not found."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = LectureSlotSerializer(slot, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            slot = LectureSlot.objects.get(pk=pk, user=request.user)
        except LectureSlot.DoesNotExist:
            return Response({"error": "Lecture slot not found."}, status=status.HTTP_404_NOT_FOUND)
            
        slot.delete()
        return Response({"detail": "Lecture slot deleted successfully."}, status=status.HTTP_200_OK)
