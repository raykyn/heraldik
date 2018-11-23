from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views import generic
from django.views.decorators.csrf import csrf_exempt
from .models import NormEntry, MissingEntry
from .modules.pylink import getNames, getCand, get_persons, get_places, get_organizations, change_XML
from .modules.transkribusConnect import login, getCollections, getDocuments, getDocumentR, postPage
import json

class IndexView(generic.TemplateView):
    template_name = "linking/index.html"
   
@csrf_exempt
def changeXML(request):
    """
    Get ref_dict and original xml.
    Return modified xml.
    """
    if request.is_ajax():
        mod_xml = change_XML(request.POST.get("origXML", None), request.POST.get("refDict", None))
        return HttpResponse(mod_xml)

@csrf_exempt
def getNameTags(request):
    """
    Get XML-String.
    Return a list of all tagged text to link.
    """
    if request.is_ajax():
        names = getNames(request.POST.get("input", None))
        return JsonResponse(names)

@csrf_exempt
def getCandidates(request):
    """
    Get tag dict.
    Return list of candidates.
    """
    if request.is_ajax():
        candidates = getCand(request.POST.get("input", None), request.POST.get("all_tags", None))
        return JsonResponse(candidates)

@csrf_exempt
def getNormalizedNames(request):
    """
    Get list of names.
    Search in database for each name.
    Return a list of all normalized names.
    """
    if request.is_ajax():
        norm_names = []
        orig_names = json.loads(request.POST.get("input", None))
        for name in orig_names["results"]:
            norms = NormEntry.objects.filter(orig_name=name)
            norm_names.extend([x.norm() for x in norms])
        return JsonResponse({"results": norm_names})

@csrf_exempt
def getRefCandidates(request):
    if request.is_ajax():
        names = json.loads(request.POST.get("input", None))
        pubyear = int(request.POST.get("pubyear", None))
        past_names = json.loads(request.POST.get("past_names", None))
        past_ids = json.loads(request.POST.get("past_ids", None))
        attrType = request.POST.get("type", None)
        if attrType == "person":
            hits = get_persons(names, pubyear, past_names, past_ids)
        elif attrType == "place":
            hits = get_places(names, past_names, past_ids)
        elif attrType == "organization":
            hits = get_organizations(names, past_names, past_ids)
        return JsonResponse({"results": hits})

@csrf_exempt
def submitNorm(request):
    if request.is_ajax():
        orig = request.POST.get("orig", None)
        norm = request.POST.get("norm", None)
        on = NormEntry(orig_name=orig, norm_name=norm)
        on.save()
    return JsonResponse({"":""})
    
    
@csrf_exempt
def submitMissingEntry(request):
    if request.is_ajax():
        string = request.POST.get("context", None)
        document = request.POST.get("doc", None)
        reflink = request.POST.get("ref", None)
        author = request.POST.get("author", None)
        new = MissingEntry(context=string, doc=document, ref=reflink, author=author)
        new.save()
    return JsonResponse({"":""})
    
    
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
def postTranscript(request):
    if request.is_ajax():
        r = postPage(request.POST.get("colID"), request.POST.get("docID"), request.POST.get("pageNo"), request.POST.get("sid"), request.POST.get("xml"))
    return JsonResponse({"response":r})
