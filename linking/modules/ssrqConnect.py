#! /usr/bin/python3

import requests
from .secrets.secrets import PLACE_DB_PW


def createDummy(name, type):
    """
    Create a dummy entry to the SSRQ Person db.
    :param name:
    :param type:
    :return link_id (string):
    """
    try:
        print("Requesting dummy id for " + name)
        if type == "person":
            r = requests.get("https://www.ssrq-sds-fds.ch/persons-db-api/?create_per={}".format(name))
        elif type == "organization":
            r = requests.get("https://www.ssrq-sds-fds.ch/persons-db-api/?create_org={}".format(name))
        elif type == "place":
            r = requests.get("https://www.ssrq-sds-fds.ch/places-db-edit/edit/create-place.xq?name={}".format(name),
                             auth=("linking-tool", PLACE_DB_PW))
        else:
            print("{} type not recognized.".format(type))
            return ""
    except:
        print("No Internet connection. Can't create dummy id.")
        return ""
    if r.status_code == requests.codes.ok:
        if r.text == "Request limit reached for this hour":
            return "Too many requests."
        elif r.text == "not logged in as linking-tool":
            return "Not logged in."
        elif type == "place":
            link_id = r.text.strip('"')
        else:
            link_id = r.json()["ID"]
    else:
        print(r.status_code)
        print(r.headers)
        print("Failed to create dummy id for " + name)
        link_id = ""

    return link_id
