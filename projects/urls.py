from django.urls import path
from .views import UserProjectComments, UserProjectComment, UserProjectsListCreateAPIView, SecureProjectFileView

urlpatterns = [
    path("my-projects/<int:pk>/", UserProjectsListCreateAPIView.as_view(), name="user-project-detail"),
    path("projects/comments/", UserProjectComments.as_view(), name="Comments"),
    path("comment/<int:pk>/", UserProjectComment.as_view(),name="comment"),
    path('my-projects/', UserProjectsListCreateAPIView.as_view(), name='user-projects'),
    path("files/<str:token>/", SecureProjectFileView.as_view(), name="secure_project_file"),

]
