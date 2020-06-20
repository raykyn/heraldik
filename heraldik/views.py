from django.shortcuts import render
from django.views import generic
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
from .modules.BlazonToXML_orig import convert
from .modules.getRandomCoA import getRandom
from django.contrib.staticfiles.storage import staticfiles_storage

import csv
import json
import random
import os

# Create your views here.

class IndexView(generic.TemplateView):
    template_name = "heraldik/index.html"


@csrf_exempt
def output(request):
    """
    Takes the input string by the user and returns an XML-String
    """
    if request.is_ajax():
        print("output")
        xmlstring = convert(request.GET.get("input", None))
        return HttpResponse(xmlstring)


@csrf_exempt
def solution(request):
    """
    Returns info about a random coat of arms.
    """
    if request.is_ajax():
        print("solution")
        print(os.getcwd())
        #coas = getRandom()
        alist = []
        url = staticfiles_storage.url("heraldik/wappen.tsv")
        with open(url, encoding="utf8") as coas:
            reader = csv.DictReader(coas, delimiter="\t")
            for row in reader:
                alist.append(row)
        chosen = random.choice(alist)
        return JsonResponse(coas)
