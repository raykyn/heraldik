from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views import generic
from django.views.decorators.csrf import csrf_exempt
from .models import NormEntry, MissingEntry
from .modules.pylink import getNames, getCand, get_persons, get_places, get_organizations, change_XML
import json

class IndexView(generic.TemplateView):
    template_name = "linking/index.html"
    
def changeXML(request):
    """
    Get ref_dict and original xml.
    Return modified xml.
    """
    if request.is_ajax():
        mod_xml = change_XML(request.GET.get("origXML", None), request.GET.get("refDict", None))
        return HttpResponse(mod_xml)

def getNameTags(request):
    """
    Get XML-String.
    Return a list of all tagged text to link.
    """
    if request.is_ajax():
        names = getNames(request.GET.get("input", None))
        return JsonResponse(names)

def getCandidates(request):
    """
    Get tag dict.
    Return list of candidates.
    """
    if request.is_ajax():
        candidates = getCand(request.GET.get("input", None), request.GET.get("all_tags", None))
        return JsonResponse(candidates)

def getNormalizedNames(request):
    """
    Get list of names.
    Search in database for each name.
    Return a list of all normalized names.
    """
    if request.is_ajax():
        norm_names = []
        orig_names = json.loads(request.GET.get("input", None))
        for name in orig_names["results"]:
            norms = NormEntry.objects.filter(orig_name=name)
            norm_names.extend([x.norm() for x in norms])
        return JsonResponse({"results": norm_names})

def getRefCandidates(request):
    if request.is_ajax():
        names = json.loads(request.GET.get("input", None))
        pubyear = int(request.GET.get("pubyear", None))
        past_names = json.loads(request.GET.get("past_names", None))
        past_ids = json.loads(request.GET.get("past_ids", None))
        attrType = request.GET.get("type", None)
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

