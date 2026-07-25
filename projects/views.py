from django.contrib.postgres.search import SearchVector, SearchRank, SearchQuery
from django.shortcuts import render
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from projects.models import Comment, Project
from rest_framework.response import Response

from projects.serializers import CommentProjectOwnerSerializer, ProjectSerializer, CommentCreateSerializer, \
    CommentSerializer
from projects.utils import verify_file_token
from projects.serializers import CommentCreateSerializer


# Create your views here.

# views which are related to projectOwner
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
    @extend_schema(request=CommentProjectOwnerSerializer)
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

            # ارسال notification به کامنت‌گذار
            new_status = serializer.validated_data.get("status")
            if new_status in ["AP", "RJ"]:
                from notifications.tasks import send_comment_notification
                send_comment_notification.delay(
                    recipient_id=comment.author.id,
                    comment_id=comment.id,
                    status=new_status,
                )

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


# views for users who want to see projects

class ProjectsListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        return Project.objects.filter(
            visibility="PB"
        ).order_by("-created_at")


class ProjectSearchPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class ProjectSearchView(APIView):
    pagination_class = ProjectSearchPagination

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='q',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=True,
                description='عبارت موردنظر برای جستجوی پروژه'
            ),
            OpenApiParameter(
                name='page',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='شماره صفحه'
            ),
            OpenApiParameter(
                name='page_size',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='تعداد آیتم در هر صفحه'
            ),
        ],
        responses={200: ProjectSerializer(many=True)}
    )
    def get(self, request):
        q = request.GET.get("q", "").strip()

        if not q:
            return Response(
                {"detail": "پارامتر q الزامی است"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # تبدیل کلمات به فرمت پیشوندی (برای حل مشکل سرچ بخشی از کلمه)
        words = q.split()
        raw_query_string = " & ".join(f"{word}:*" for word in words if word)
        query = SearchQuery(raw_query_string, search_type="raw")

        vector = (
                SearchVector("title", weight="A") +
                SearchVector("description", weight="B") +
                SearchVector("author__username", weight="B") +
                SearchVector("author__first_name", weight="C") +
                SearchVector("author__last_name", weight="C")
        )

        # اعمال فیلتر visibility قبل از جستجو
        # نکته: حتما چک کن در مدل Project، مقدار پابلیک چیست (مثلاً 'public' یا True)
        queryset = (
            Project.objects
            .filter(visibility='PB')
            .annotate(rank=SearchRank(vector, query))
            .filter(rank__gt=0)
            .order_by("-rank")
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ProjectSerializer(page, many=True, context={'request': request})

        return paginator.get_paginated_response(serializer.data)


class ProjectDetailView(generics.RetrieveAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        pk = self.kwargs["pk"]
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("پروژه پیدا نشد")

        # public پروژه یا owner خود کاربر
        if project.visibility == "PB" or project.author == self.request.user:
            return project

        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("دسترسی ندارید")


class SecureProjectFileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, token):
        try:
            data = verify_file_token(token)
            project = Project.objects.get(id=data["project_id"])
        except Exception:
            return Response({"detail": "Invalid or expired token"}, status=403)

        if project.visibility != "PB" and project.author != request.user:
            return Response({"detail": "Access denied"}, status=403)

        # چک کن آیا کاربر جدید هست
        from projects.models import ProjectDownload
        from notifications.tasks import send_download_notification

        is_new = not ProjectDownload.objects.filter(
            project=project, user=request.user
        ).exists()

        if is_new and project.author != request.user:
            ProjectDownload.objects.create(project=project, user=request.user)
            send_download_notification.delay(
                project_id=project.id,
                downloader_id=request.user.id,
            )

        from django.http import FileResponse
        return FileResponse(project.file.open(), as_attachment=True, filename=project.file.name.split("/")[-1])


class ProjectCommentCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=CommentCreateSerializer, responses={201: CommentCreateSerializer})
    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response({"detail": "پروژه پیدا نشد"}, status=404)

        if project.visibility != "PB" and project.author != request.user:
            return Response({"detail": "دسترسی ندارید"}, status=403)

        serializer = CommentCreateSerializer(
            data=request.data,
            context={"request": request, "project": project}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class ProjectCommentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = PageNumberPagination

    @extend_schema(responses={200: CommentSerializer(many=True)})
    def get(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response({"detail": "پروژه پیدا نشد"}, status=404)

        if project.visibility != "PB" and project.author != request.user:
            return Response({"detail": "دسترسی ندارید"}, status=403)

        comments = project.comments.filter(status="AP").order_by("created")
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(comments, request)
        serializer = CommentSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
