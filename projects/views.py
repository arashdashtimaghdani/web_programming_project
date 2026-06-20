from django.shortcuts import render
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import generics, permissions
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from projects.models import Comment, Project
from rest_framework.response import Response

from projects.serializers import CommentProjectOwnerSerializer, ProjectSerializer
from projects.utils import verify_file_token


# Create your views here.
class UserProjectComments(APIView):
    # تعریف کلاس پجینیشن
    pagination_class = PageNumberPagination

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='page',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='شماره صفحه را وارد کنید'
            ),
        ],
        responses={200: CommentProjectOwnerSerializer(many=True)}
    )
    def get(self, request):
        # 1. گرفتن کوئری‌ست
        comments = Comment.objects.filter(project__author=request.user).order_by('-created')

        # 2. ایجاد شیء پجینیشن
        paginator = self.pagination_class()

        # 3. صفحه‌بندی کردن کوئری‌ست بر اساس درخواست کاربر
        page = paginator.paginate_queryset(comments, request)

        if page is not None:
            serializer = CommentProjectOwnerSerializer(page, many=True)
            # 4. برگرداندن پاسخ همراه با لینک‌های Next و Previous
            return paginator.get_paginated_response(serializer.data)

        # اگر پجینیشن غیرفعال بود یا مشکلی داشت
        serializer = CommentProjectOwnerSerializer(comments, many=True)
        return Response(serializer.data)


class UserProjectComment(APIView):
    @extend_schema(request=CommentProjectOwnerSerializer)  #
    def patch(self, request, pk):
        try:
            comment = Comment.objects.get(pk=pk, project__author=request.user)
        except Comment.DoesNotExist:
            return Response(
                {"detail": "Comment not found or you are not the project owner"},
                status=404
            )

        serializer = CommentProjectOwnerSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)


class UserProjectsListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        return Project.objects.filter(
            author=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
class SecureProjectFileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, token):
        try:
            data = verify_file_token(token)
            project = Project.objects.get(id=data["project_id"])
        except Exception:
            return Response({"detail": "Invalid or expired token"}, status=403)

        # چک کن یا owner هست یا پروژه public
        if project.visibility != "PB" and project.author != request.user:
            return Response({"detail": "Access denied"}, status=403)

        # فایل رو سرو کن
        from django.http import FileResponse
        return FileResponse(project.file.open(), as_attachment=True, filename=project.file.name.split("/")[-1])


