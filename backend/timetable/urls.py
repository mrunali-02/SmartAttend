from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubjectViewSet,
    LectureSlotViewSet,
    TimetableUploadView,
    TimetableSaveView,
    TimetableListView,
    TimetableDetailView
)
from .calendar_views import iCalendarExportView

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'slots', LectureSlotViewSet, basename='lectureslot')

urlpatterns = [
    path('upload', TimetableUploadView.as_view(), name='timetable-upload'),
    path('save', TimetableSaveView.as_view(), name='timetable-save'),
    path('timetable', TimetableListView.as_view(), name='timetable-list'),
    path('timetable/<int:pk>', TimetableDetailView.as_view(), name='timetable-detail'),
    path('', include(router.urls)),
    path('calendar/export/', iCalendarExportView.as_view(), name='calendar-export'),
]
