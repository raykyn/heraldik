#! /usr/bin/python3

import csv
import json
import random

def getRandom():
    """
    Return a random entry from wappen.tsv
    """
    alist = []
    with open("./wappen.tsv", encoding="utf8") as coas:
        reader = csv.DictReader(coas, delimiter="\t")
        for row in reader:
            alist.append(row)
    chosen = random.choice(alist)
    return chosen
            
