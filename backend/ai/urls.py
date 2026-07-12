from django.urls import path
from .views import AIInsightsView
from .chatbot_views import (
    AIChatView,
    ConversationViewSet,
    ConversationDetailView,
    ChatMessageFeedbackView,
    AIPreferencesView,
    AIUsageDashboardView,
    AIMemoryResetView
)

urlpatterns = [
    path('insights/', AIInsightsView.as_view(), name='ai-insights'),
    path('chat/', AIChatView.as_view(), name='ai-chat'),
    path('conversations/', ConversationViewSet.as_view(), name='ai-conversations'),
    path('conversations/<int:pk>/', ConversationDetailView.as_view(), name='ai-conversation-detail'),
    path('messages/<int:message_id>/feedback/', ChatMessageFeedbackView.as_view(), name='ai-message-feedback'),
    path('memory/', AIPreferencesView.as_view(), name='ai-memory'),
    path('dashboard/', AIUsageDashboardView.as_view(), name='ai-usage-dashboard'),
    path('memory/reset/', AIMemoryResetView.as_view(), name='ai-memory-reset'),
]
