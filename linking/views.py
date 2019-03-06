from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views import generic
from django.views.decorators.csrf import csrf_exempt
from .models import NormEntry, MissingEntry
from .modules.pylink import getNames, getCand, get_persons, get_places, get_organizations, change_XML, getTEIData, getTEINames
from .modules.transkribusConnect import login, getCollections, getDocuments, getDocumentR, postPage
from .modules.ssrqConnect import createDummy
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
def getNamesTEI(request):
    """
    Get plain text TEI.
    Return dict containg a list of dicts and the modified xml:
    - results:
        [
        - id: (int) # this is a placeholder id which will used to later find the tags again
        - names : (list)
        - context : (list)
        ]
    - mod_xml (string)
    """
    if request.is_ajax():
        data = getTEINames(request.POST.get("input", None));
        # TODO: maybe include the stuff getDataTEI does in here instead?
        return JsonResponse(data);

        
@csrf_exempt
def getDataTEI(request):
    """
    Get XML-Node.
    Return a dictionary:
    - orig_names
        - results (list)
    - norm_names
        - results (list)
    - fulltext
        - string (list)
    """
    if request.is_ajax():
        #data = getTEIData(request.POST.get("input", None));
        data = {
            "orig_names" : { "results" : "" },
            "norm_names" : { "results" : [] },
            "fulltext" : { "string" : [] },
        }
        names = request.POST.get("input", None)
        data["fulltext"]["string"] = [names]
        names = [w.rstrip(",.!?") for w in names.split() if w[0].isupper()]
        data["orig_names"]["results"] = names
        data["norm_names"]["results"] = []
        for name in names:
            norms = NormEntry.objects.filter(orig_name=name)
            data["norm_names"]["results"].extend([x.norm() for x in norms])
        return JsonResponse(data);

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
    """
    :param request:
    :return dict with link_id (string):
    """
    if request.is_ajax():
        name = request.POST.get("name", None)
        link_id = createDummy(name)
    return JsonResponse({"entry":link_id})
    
    
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
