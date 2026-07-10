from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet, LectureSlotViewSet

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'slots', LectureSlotViewSet, basename='lectureslot')

urlpatterns = [
    path('', include(router.urls)),
]
