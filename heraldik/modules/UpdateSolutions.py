#! /usr/bin/python3

from BlazonToXML_orig import convert
import csv
import re

INPUT = "../../static_local/heraldik/wappen.tsv"

new_dictionary_list = []

with open(INPUT) as inp:
    reader = csv.DictReader(inp, delimiter="\t")
    for row in reader:
        blazon = row["blazon"]
        print(row["id"])
        new_solution = re.sub(">\s*?<", "> <", convert(blazon))
        new_solution = re.sub('<\?xml version="1.0" \?> ', "", new_solution).strip()
        old_solution = re.sub(">\s*?<", "> <", row["solution"]).strip()
        if new_solution != row["solution"]:
            print("CHANGED")
            row["solution"] = new_solution
        new_dictionary_list.append(row)
        
with open(INPUT, mode="w") as out:
    fieldnames = ["id", "solution", "blazon", "info", "link", "clue"]
    writer = csv.DictWriter(out, fieldnames=fieldnames, delimiter="\t")
    writer.writeheader()
    for row in new_dictionary_list:
        writer.writerow(row)
