from django.contrib.auth import get_user_model
from django.http import Http404, FileResponse
from django.views import View
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, ProfileSerializer
from .models import Profile
from .utils import verify_image_token
from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, extend_schema_view


@extend_schema_view(
    put=extend_schema(
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {
                    "university": {"type": "string"},
                    "bio": {"type": "string"},
                    "profile_image": {
                        "type": "string",
                        "format": "binary"
                    }
                },
                "required": ["profile_image"]
            }
        },
        responses=ProfileSerializer
    ),
    patch=extend_schema(
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {
                    "university": {"type": "string"},
                    "bio": {"type": "string"},
                    "profile_image": {
                        "type": "string",
                        "format": "binary"
                    }
                }
            }
        },
        responses=ProfileSerializer
    ),
)
class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    # برای آپلود فایل
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return Profile.objects.get(user=self.request.user)

    @extend_schema(
        request={"multipart/form-data": ProfileSerializer},
        responses=ProfileSerializer
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @extend_schema(
        request={"multipart/form-data": ProfileSerializer},
        responses=ProfileSerializer
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)


class SecureProfileImageView(View):

    def get(self, request, token):

        profile_id = verify_image_token(token)

        if not profile_id:
            raise Http404("Invalid or expired link")

        profile = Profile.objects.get(id=profile_id)

        if not profile.profile_image:
            raise Http404("Image not found")

        return FileResponse(profile.profile_image.open("rb"))
