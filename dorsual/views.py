from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views import generic
from django.views.decorators.csrf import csrf_exempt
from .models import dorsualEntry
from .modules.transkribusConnect import login, getCollections, getDocuments, getDocumentR, changeDorsualTypeInXML
import json

# Create your views here.
class IndexView(generic.TemplateView):
    template_name = "index.html"


@csrf_exempt
def loginTranskribus(request):
    if request.is_ajax():
        usr = request.POST.get("user", None)
        pw = request.POST.get("pw", None)
        data = login(usr, pw)
        return HttpResponse(data)


@csrf_exempt
def getCollectionList(request):
    if request.is_ajax():
        collectionList = getCollections(request.POST.get("sid", None))
        return JsonResponse({"results": collectionList})


@csrf_exempt
def getDocumentList(request):
    if request.is_ajax():
        docList = getDocuments(request.POST.get("sid", None), request.POST.get("colID", None))
        return JsonResponse({"results": docList})


@csrf_exempt
def getDocument(request):
    if request.is_ajax():
        doc = getDocumentR(request.POST.get("colID", None), request.POST.get("docID", None), request.POST.get("sid", None))
        return JsonResponse({"results": doc})


@csrf_exempt
def submitJudgement(request):
    if request.is_ajax():
        collID = request.POST.get("collID")
        regionID = request.POST.get("regionID")
        judgement = request.POST.get("judgement")
        docID = request.POST.get("docID")
        docTitle = request.POST.get("docTitle")
        dorType = request.POST.get("dorType")
        image = request.POST.get("image")
        new = dorsualEntry(
                    collectionID=collID,
                        documentID=docID,
                        regionID=regionID,
                        docAndRegion=docID+regionID,
                        documentTitle=docTitle,
                        dorsualType=dorType,
                        imageSource=image,
                        judgement=True if judgement == "true" else False
                )
        new.save()
        return JsonResponse({"":""})


@csrf_exempt
def checkFilter(request):
    if request.is_ajax():
        fil = request.POST.get("filter")
        regionID = request.POST.get("regionID")
        docID = request.POST.get("docID")
        exists = True if dorsualEntry.objects.filter(docAndRegion=docID+regionID).exists() else False
        if exists:
            judgement = dorsualEntry.objects.get(docAndRegion=docID+regionID).judgement
            if judgement:
                return JsonResponse({"exists": 1, "judgement": 1})
            else:
                return JsonResponse({"exists": 1, "judgement": 0})
        else:
            return JsonResponse({"exists": 0, "judgement": 0})


@csrf_exempt
def changeDorsualType(request):
    if request.is_ajax():
        change_log = request.POST.get("changeLog")
        xmlText = request.POST.get("xmlText")
        collID = request.POST.get("collID")
        docID = request.POST.get("docID")
        sessionID = request.POST.get("sessionID")
        pageNo = request.POST.get("pageNo")
        response = changeDorsualTypeInXML(change_log, xmlText, collID, docID, sessionID, pageNo)

        return JsonResponse({"response": response})
