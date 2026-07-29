import time
from .tasks import log_activity


class ActivityTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        response = self.get_response(request)

        if request.user.is_authenticated:
            log_activity.delay(
                user_id=request.user.id,
                path=request.path,
                method=request.method,
                status_code=response.status_code,
                duration_ms=int((time.time() - start_time) * 1000),
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        return response