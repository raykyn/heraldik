from django.urls import path

from . import views

urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('output/', views.output, name='output'),
    path('solution/', views.solution, name='solution'),
]
