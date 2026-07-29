from django.urls import path
from .views import ProfileView, SecureProfileImageView, RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path(
        "secure-profile-image/<str:token>/",
        SecureProfileImageView.as_view(),
        name="secure_profile_image",
    )
]
