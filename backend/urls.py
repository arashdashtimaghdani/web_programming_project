"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from accounts.views import RegisterView
from accounts.views import test_api
from accounts.views import register
from accounts.views import about_page_view
# Swagger imports
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="Backend API Documentation",
        default_version='v1',
        description="API documentation for your Django backend.",
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/test/", test_api),
    path("api/register", register),
    path("about", about_page_view),
    path("accounts/",include('accounts.urls')),
    # Swagger routes
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='redoc'),
    re_path(r'^swagger.json/$', schema_view.without_ui(cache_timeout=0), name='swagger-json'),
]
