from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from activity.models import ActivityLog
from projects.models import Comment, Project, ProjectDownload

User = get_user_model()

ACTIVITY_WINDOW_DAYS = 14


def _activity_over_time(queryset, days=ACTIVITY_WINDOW_DAYS):
    """Daily activity counts for the last `days` days, always including empty days."""
    since = (timezone.now() - timedelta(days=days - 1)).date()
    rows = (
        queryset.filter(created_at__date__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
    )
    counts_by_day = {r["day"]: r["count"] for r in rows}

    series = []
    for i in range(days):
        day = since + timedelta(days=i)
        series.append({"date": day.isoformat(), "count": counts_by_day.get(day, 0)})
    return series


class DashboardView(APIView):
    """
    Requirement 3.8 — Dashboard & Analytics.
    Every authenticated user gets their own stats (project count, downloads,
    activity over time). Staff/admin users additionally get a `system` block
    with site-wide analytics.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        my_projects = Project.objects.filter(author=user)

        data = {
            "projects_count": my_projects.count(),
            "public_projects_count": my_projects.filter(
                visibility=Project.Visibility.PUBLIC
            ).count(),
            "total_downloads": ProjectDownload.objects.filter(
                project__author=user
            ).count(),
            "comments_received": Comment.objects.filter(
                project__author=user, active=True
            ).count(),
            "activity_over_time": _activity_over_time(
                ActivityLog.objects.filter(user=user)
            ),
            "top_projects": list(
                my_projects.annotate(download_count=Count("downloads"))
                .order_by("-download_count")
                .values("id", "title", "download_count")[:5]
            ),
        }

        if user.is_staff:
            data["system"] = {
                "users_count": User.objects.count(),
                "projects_count": Project.objects.count(),
                "public_projects_count": Project.objects.filter(
                    visibility=Project.Visibility.PUBLIC
                ).count(),
                "total_downloads": ProjectDownload.objects.count(),
                "comments_count": Comment.objects.filter(active=True).count(),
                "activity_over_time": _activity_over_time(ActivityLog.objects.all()),
                "top_projects": list(
                    Project.objects.annotate(download_count=Count("downloads"))
                    .order_by("-download_count")
                    .values("id", "title", "author__username", "download_count")[:10]
                ),
            }

        return Response(data)
