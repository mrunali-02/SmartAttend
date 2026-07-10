from django.urls import path
from .views import AIInsightsView

urlpatterns = [
    path('insights/', AIInsightsView.as_view(), name='ai-insights'),
]
