from django.contrib import admin

from activity.models import ActivityLog


# Register your models here.
@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("user", "method", "path", "status_code", "duration_ms", "created_at")
    list_filter = ("method", "status_code")
    search_fields = ("user__username", "path")
    ordering = ("-created_at",)
