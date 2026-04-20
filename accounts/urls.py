from django.contrib import admin
from django.urls import path

from accounts.views import TestApi
from .views import RegisterView

urlpatterns = [
    path("api/test/", TestApi.as_view()),
    path("api/register",RegisterView.as_view())

]
