#! /usr/bin/python3

import requests


def createDummy(name):
    """
    Create a dummy entry to the SSRQ Person db.
    :param name:
    :return link_id (string):
    """
    try:
        print("Requesting dummy id for " + name)
        r = requests.get("https://www.ssrq-sds-fds.ch/persons-db-api/?create={}".format(name))
    except:
        print("No Internet connection. Can't create dummy id.")
        return ""
    if r.status_code == requests.codes.ok:
        link_id = r.json()["ID"]
    else:
        print("Failed to create dummy id for " + name)
        link_id = ""

    return link_id
