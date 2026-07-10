from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet
from .notification_views import NotificationViewSet

router = DefaultRouter()
router.register(r'records', AttendanceViewSet, basename='attendance')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
