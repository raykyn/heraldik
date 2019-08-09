#! /usr/bin/python3

import re
import requests
import json
import xml.etree.ElementTree as et

def login(usr, pw):
    r = requests.post("https://transkribus.eu/TrpServer/rest/auth/login", data={"user":usr, "pw":pw})
    if r.status_code == requests.codes.ok:
        return r.text
    else:
        print(r)
        print("Login failed.")
        return None
        

def getCollections(sid):
    r = requests.get("https://transkribus.eu/TrpServer/rest/collections/list?JSESSIONID={}".format(sid))
    if r.status_code == requests.codes.ok:
        return r.json()
    else:
        print(r)
        print("SessionID invalid?")
        return None
        
        
def getDocuments(sid, colid):
    r = requests.get("https://transkribus.eu/TrpServer/rest/collections/{}/list?JSESSIONID={}".format(colid, sid))
    if r.status_code == requests.codes.ok:
        return r.json()
    else:
        print(r)
        print("SessionID or collectionID invalid?")
        return None


def getDocumentR(colid, docid, sid):
    r = requests.get("https://transkribus.eu/TrpServer/rest/collections/{}/{}/fulldoc?JSESSIONID={}".format(colid, docid, sid))
    if r.status_code == requests.codes.ok:
        return r.json()
    else:
        print(r)
        print("documentID or collectionID invalid?")
        return None
        
        
def postPage(colid, docid, pageNo, sid, xml):
    r = requests.post("https://transkribus.eu/TrpServer/rest/collections/{}/{}/{}/text?JSESSIONID={}".format(colid, docid, pageNo, sid), data=xml.encode("utf8"), params={ "note":"DC" })
    if r.status_code == requests.codes.ok:
        return True
    else:
        print(r)
        print("documentID or collectionID invalid?")
        return False
        
        
def changeDorsualTypeInXML(change_log, xmlText, collID, docID, sessionID, pageNo):
    change_log = json.loads(change_log)
    modified_xml = xmlText
    for textregionID, input_type in change_log.items():
        # TODO: Implement case if entry has no structure tag yet
        exp = """(?<=<TextRegion id="{}" custom=")(.*?structure {{type:)(\S+?);""".format(textregionID)
        modified_xml = re.sub(exp, r"\1{};".format(input_type), modified_xml)

    postPage(collID, docID, pageNo, sessionID, modified_xml)
    
    # TODO: post the new xml to the server by using the postPage function
    # always post to the pageNo that is last TODO: get this info somehow from js
    return True

if __name__ == "__main__":
    data = login("KTest@gmx.ch", "")
    print(data)
    data = et.fromstring(data)
    sid = data.find("sessionId").text
    print(sid)
    coll = getCollections(sid)
    print(str(coll))
