from django.urls import path

from . import views

urlpatterns = [
        path("", views.IndexView.as_view(), name="index"),
        path('loginTranskribus/', views.loginTranskribus, name='loginTranskribus'),
        path('getCollectionList/', views.getCollectionList, name='getCollectionList'),
        path('getDocumentList/', views.getDocumentList, name='getDocumentList'),
        path('getDocument/', views.getDocument, name='getDocument'),
        path('submitJudgement/', views.submitJudgement, name='submitJudgement'),
        path('checkFilter/', views.checkFilter, name='checkFilter')
        ]
