from django.shortcuts import render
from django.views import generic
from django.http import JsonResponse, HttpResponse
from .modules.BlazonToXML_orig import convert

# Create your views here.

class IndexView(generic.TemplateView):
    template_name = "heraldik/index.html"

def output(request):
    """
    Takes the input string by the user and returns an XML-String
    """
    if request.is_ajax():
        xmlstring = convert(request.GET.get("input", None))
        return HttpResponse(xmlstring)
