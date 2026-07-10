from django.urls import path
from .views import (
    AnalyticsDashboardView,
    AnalyticsPredictionView,
    AnalyticsGoalPlannerView,
    AnalyticsReportExportView
)

urlpatterns = [
    path('dashboard/', AnalyticsDashboardView.as_view(), name='analytics-dashboard'),
    path('predict/', AnalyticsPredictionView.as_view(), name='analytics-predict'),
    path('goal-planner/', AnalyticsGoalPlannerView.as_view(), name='analytics-goal-planner'),
    path('export/', AnalyticsReportExportView.as_view(), name='analytics-export'),
]
