#! /usr/bin/python3

import csv
import json
import random

def getRandom():
    """
    Return a random entry from wappen.tsv
    """
    alist = []
    with open("static/heraldik/wappen.tsv") as coas:
        reader = csv.DictReader(coas, delimiter="\t")
        for row in reader:
            alist.append(row)
    chosen = random.choice(alist)
    return chosen
            
