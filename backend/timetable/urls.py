from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet, LectureSlotViewSet
from .calendar_views import iCalendarExportView

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'slots', LectureSlotViewSet, basename='lectureslot')

urlpatterns = [
    path('', include(router.urls)),
    path('calendar/export/', iCalendarExportView.as_view(), name='calendar-export'),
]
