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
    path('loginTranskribus/', views.loginTranskribus, name='loginTranskribus'),
    path('getCollectionList/', views.getCollectionList, name='getCollectionList'),
    path('getDocumentList/', views.getDocumentList, name='getDocumentList'),
    path('getDocument/', views.getDocument, name='getDocument'),
    path('postTranscript/', views.postTranscript, name='postTranscript'),
    path('getDataTEI/', views.getDataTEI, name='getDataTEI'),
    
]
