from django.contrib.auth import get_user_model
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import JsonResponse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_yasg.utils import swagger_auto_schema


# Create your views here
class TestApi(APIView):
    def get(self, request):
        return Response({"message": "Test successful"})


# Create your views here


class RegisterView(APIView):
    @swagger_auto_schema(request_body=RegisterSerializer)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response({
                "message": "user created",
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=400)


def test_api(request):
    return JsonResponse({"message": "Hello from Django!"})


def register(request):
    get_user_model().objects.create_user(username="negar", password="123")
    return 1


def about_page_view(request):
    context = {"name": "Alice"}  # new
    return render(request, "pages/about.html")  # new
