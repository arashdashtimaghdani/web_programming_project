from celery import shared_task


@shared_task
def log_activity(user_id, path, method, status_code, duration_ms, ip_address):
    from django.contrib.auth import get_user_model
    from .models import ActivityLog

    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        ActivityLog.objects.create(
            user=user, path=path, method=method,
            status_code=status_code, duration_ms=duration_ms, ip_address=ip_address,
        )
    except User.DoesNotExist:
        pass