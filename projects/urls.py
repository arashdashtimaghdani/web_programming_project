from django.urls import path
from .views import UserProjectComments, UserProjectComment, UserProjectsListCreateAPIView, SecureProjectFileView, \
    ProjectsListCreateAPIView, ProjectSearchView, ProjectCommentCreateView, ProjectCommentListView, ProjectDetailView

urlpatterns = [
    path("my-projects/<int:pk>/", UserProjectsListCreateAPIView.as_view(), name="user-project-detail"),
    path("projects/comments/", UserProjectComments.as_view(), name="Comments"),
    path("comment/<int:pk>/", UserProjectComment.as_view(),name="comment"),
    path('my-projects/', UserProjectsListCreateAPIView.as_view(), name='user-projects'),
    path("files/<str:token>/", SecureProjectFileView.as_view(), name="secure_project_file"),
    path("search/", ProjectSearchView.as_view(), name="project-search"),
    path("projects/<int:pk>/comments/add/", ProjectCommentCreateView.as_view(), name="project-comment-add"),
    path("projects/<int:pk>/comments/", ProjectCommentListView.as_view(), name="project-comments"),
    path("projects/<int:pk>/", ProjectDetailView.as_view(), name="project-detail"),

]
