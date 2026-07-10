from django.urls import path
from .views import AIInsightsView
from .chatbot_views import AIChatView, AIMemoryView, ChatHistoryView

urlpatterns = [
    path('insights/', AIInsightsView.as_view(), name='ai-insights'),
    path('chat/', AIChatView.as_view(), name='ai-chat'),
    path('memory/', AIMemoryView.as_view(), name='ai-memory'),
    path('chat/history/', ChatHistoryView.as_view(), name='ai-chat-history'),
]
