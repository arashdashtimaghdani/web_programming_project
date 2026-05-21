from django.urls import path
from .views import ProfileView, SecureProfileImageView

urlpatterns = [
    path("profile/", ProfileView.as_view(), name="profile"),
    path(
        "secure-profile-image/<str:token>/",
        SecureProfileImageView.as_view(),
        name="secure_profile_image",
    )
]
