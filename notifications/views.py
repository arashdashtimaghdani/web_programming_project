from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.pagination import PageNumberPagination
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = PageNumberPagination

    def get(self, request):
        notifications = request.user.notifications.all()
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(notifications, request)
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = request.user.notifications.get(pk=pk)
            notif.is_read = True
            notif.save()
            return Response({"detail": "خوانده شد"})
        except Notification.DoesNotExist:
            return Response({"detail": "پیدا نشد"}, status=404)


class NotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response({"detail": "همه خوانده شد"})