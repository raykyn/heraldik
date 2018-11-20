from django.urls import path

from . import views

urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('getNameTags/', views.getNameTags, name='getNameTags'),
    path('getCandidates/', views.getCandidates, name='getCandidates'),
    path('getNormalizedNames/', views.getNormalizedNames, name='getNormalizedNames'),
    path('getRefCandidates/', views.getRefCandidates, name='getRefCandidates'),
    path('submitNorm/', views.submitNorm, name='submitNorm'),
    path('changeXML/', views.changeXML, name='changeXML'),
    path('submitMissingEntry/', views.submitMissingEntry, name='submitMissingEntry'),
    path('login_transkribus/', views.login_transkribus, name='login_transkribus'),
    path('getCollectionList/', views.getCollectionList, name='getCollectionList'),
    path('getDocumentList/', views.getDocumentList, name='getDocumentList'),
    
]
