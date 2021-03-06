#! /usr/bin/python3

import csv
from collections import namedtuple, OrderedDict, defaultdict
from .parameters import FIRST_MENTION_TOLERANCE
try:
    from lxml import etree as et
except:
    import xml.etree.ElementTree as et
import json
import requests
import re


CONTEXTLENGTH = 100
PLACEHOLDER_ATTRIBUTE_NAME = "ref_placeholder_id" # this needs to be changed in the js file as well!

typeDict = {
        "persName" : "person",
        "placeName" : "place",
        "orgName" : "organization"
    }


def getNamespace(element):
    """
    Dreist gestohlen von https://stackoverflow.com/questions/9513540/python-elementtree-get-the-namespace-string-of-an-element
    """
    m = re.match(r'\{.*\}', element.tag)
    return m.group(0) if m else ''
    
    
def processChildrenContext(parent, ns):
    """
    Helper Method for getContext.
    """
    textCollector = []
    for child in parent:
        if child.tag == "{}lb".format(ns):
            textCollector.append(" ")
        if child.text is not None:
            textCollector.append(child.text)
        childText = processChildrenContext(child, ns)
        textCollector.append(childText)
        if child.tail is not None:
            textCollector.append(child.tail)
    return "".join(textCollector)
    
    
    
def getContext(startnode, mode, ns):
    """
    mode == True => context1
    mode == False => context2
    """
    context = []
    context_len = 0
    if mode:
        nextNode = lambda x : x.getprevious()
    else:
        nextNode = lambda x : x.getnext()
        if startnode.tail is not None:
            context_len += len(startnode.tail)
            context.append(startnode.tail)
    oldNode = startnode
    newNode = nextNode(startnode)
    while context_len < 100:
        if newNode is not None:
            if mode:
                if newNode.tail is not None:
                    context_len += len(newNode.tail)
                    context.append(newNode.tail)
                childText = processChildrenContext(newNode, ns)
                context_len += len(childText)
                context.append(childText)
                if newNode.text is not None:
                    context_len += len(newNode.text)
                    context.append(newNode.text)
                if newNode.tag == "{}lb".format(ns):
                    context_len += 1
                    context.append(" ")
            else:
                if newNode.tag == "{}lb".format(ns):
                    context_len += 1
                    context.append(" ")
                if newNode.text is not None:
                    context_len += len(newNode.text)
                    context.append(newNode.text)
                childText = processChildrenContext(newNode, ns)
                context_len += len(childText)
                context.append(childText)
                if newNode.tail is not None:
                    context_len += len(newNode.tail)
                    context.append(newNode.tail)
            oldNode = newNode
            newNode = nextNode(newNode)
        else:
            if mode:
                if oldNode.getparent().text is not None:
                    context_len += len(oldNode.getparent().text)
                    context.append(oldNode.getparent().text)
                break
            else:
                break
    if mode:
        context.reverse()
    context = "".join(context)
    return context
    

def getTEINames(xml):
    """
    Get plain text TEI.
    Return dict containg a list of dicts and the modified xml:
    - results:
        [
        - id: (int) # this is a placeholder id which will used to later find the tags again
        - names : (string)
        - context : (list)
        - type : (string)
        ]
    - mod_xml (string) # containing the placeholder ids
    """
    
    data = { "results" : [], "mod_xml" : ""}
    
    placeholder_counter = 0
    
    # first remove either abbrev or expan tags (and all choice tags)
    # xml = re.sub(r'<\?xml version="1.0" encoding="UTF-8"\?>', "", xml)
    # xml = re.sub(r"<abbr>.*?<\/abbr>", "", xml)
    # xml = re.sub(r"(<choice>|<\/choice>)", "", xml)
    # xml = re.sub(r"<expan>", "", xml)
    # xml = re.sub(r"<\/expan>", "", xml)
    
    root = et.fromstring(xml)
    ns = getNamespace(root)
    tags = ["{}persName".format(ns), "{}orgName".format(ns), "{}placeName".format(ns)]
    counter = 0
    active = False # checks if we are actually in the body
    for child in root.iter():
        if child.tag == "{}text".format(ns):
            active = True
        if not active or child.tag not in tags or ("ref" in child.attrib and len(child.attrib["ref"]) > 0):
            continue
        context1 = getContext(child, True, ns)
        context2 = getContext(child, False, ns)
        context = ["[...]"+context1[-100:], context2[:100]+"[...]"]
        names = child.text + processChildrenContext(child, ns)
        placeholder = placeholder_counter
        child.attrib[PLACEHOLDER_ATTRIBUTE_NAME] = str(placeholder)
        new_entry = {}
        new_entry["id"] = str(placeholder)
        placeholder_counter += 1
        new_entry["names"] = names
        new_entry["context"] = context
        new_entry["type"] = typeDict[re.sub(ns, "", child.tag)]
        data["results"].append(new_entry)
    data["mod_xml"] = et.tounicode(root)
    
    return data


def getTEIData(xml):
    data = {
        "orig_names" : { "results" : [] },
        "norm_names" : { "results" : [] },
        "fulltext" : { 
            "string" : [],
            "type" : ""
        },
    }
    typeDict = {
        "persName" : "person",
        "placeName" : "place",
        "orgName" : "organization"
    }
    m = re.match(r"<(\S+) .*?>(.*?)<\/\1>", xml)
    if m:
        data["fulltext"]["type"] = typeDict[m.group(1)]
        text = m.group(2)
        text = re.sub(r"<abbr>.*?<\/abbr>", "", text)
        text = re.sub(r"<\/?\S+?( .*?)?>", "", text)
        data["fulltext"]["string"].append(text)
        data["orig_names"]["results"] = [w.rstrip(",.!?") for w in text.split() if w[0].isupper()]
    else:
        print("Invalid xml tag: " + xml)
    
    return data


def change_XML(xml, ref_dict):
    ref_dict = json.JSONDecoder(object_pairs_hook=OrderedDict).decode(ref_dict)
    #~ for key, val in ref_dict.items():
        #~ print(key)
        #~ print(val)
    content = re.sub("<\?xml version.*?>", "", xml)
    try:
        root = et.fromstring(content)
    except:
        return {"XMLERROR":"XMLERROR"}
    textlines = root.findall(".//{http://schema.primaresearch.org/PAGE/gts/pagecontent/2013-07-15}TextLine")
    for i, tl in enumerate(textlines):
        # Konstruiere neues custom-Attribut für alle Textlines
        # Finde alle Tags mit der entsprechenden Zeilennummer
        # Baue den String neu
        custom = []
        for n, taglist in ref_dict.items():
            for tagattr in taglist:
                if int(tagattr["lineNo"]) != i:
                    continue
                parts = []
                for name, j in tagattr.items():
                    if name not in ["attr", "lineNo", "ref"]:
                        parts.append("{}:{};".format(name, j))
                if tagattr["ref"] is not None:
                    parts.append("ref:{};".format(tagattr["ref"]))
                joined_parts = ' '.join(parts)
                this_string = "%s {%s}" % (tagattr["attr"], joined_parts)
                custom.append(this_string)
        custom = ' '.join(custom)
        tl.set("custom", custom)
    return et.tostring(root, encoding="utf8")


def get_organizations(names, past_names, past_ids):
    """ Create a list of candidate dictionaries for organizations."""
    print("Start searching")
    primary_hits = []
    org_ids = set()
    for n in set(names):
        # First search if it's part of the name
        try:
            print("Sent first request " + n)
            r = requests.get("https://www.ssrq-sds-fds.ch/persons-db-api/?org_search={}".format(n))
            print("Got first request")
        except:
            print("No Internet connection. Skipping.")
            continue
        if r.status_code == requests.codes.ok and r.text != "null": # at least one match
            for match in r.json()["results"]:
                if type(match) == dict:
                    org_id = match["id"]
                elif match == "id":
                    org_id = r.json()["results"]["id"]
                else:
                    continue
                org_ids.add(org_id)
        elif r.status_code == requests.codes.ok and r.text == "null": # No matches
            pass # list stays empty
        else: # Error 4XX or 5XX
            print("Querying for {} returned an error.".format(n))
                
    print("Sent second request: " + ",".join(list(org_ids)))
    org_info = requests.get("https://www.ssrq-sds-fds.ch/persons-db-api/?id_search_det={}".format(",".join(list(org_ids))))
    print("Got second request")
    if org_info.status_code == requests.codes.ok and org_info.text != "null":
        org_info = org_info.json()
        for found in org_info:
            org_dict = {}
            org_dict["name"] = []
            org_dict["otype"] = []
            org_dict["subtype"] = []
            org_dict["fmention"] = []
            org_dict["points"] = 0
            
            # Fill the dict with all the entries we found
            for entry in found["details"]:
                for key, value in entry.items():
                    if key in ["id", "lang", "var_id", "type", "occ"]:
                        continue
                    elif key == "surname":
                        org_dict["name"].append(value)
                    elif key == "first_mention":
                        org_dict["fmention"].append(value)
                    elif key == "org_type":
                        org_dict["otype"].append(value)
                    elif key == "sub_type":
                        org_dict["subtype"].append(value)

            clean_id = found["@ID"].replace("http://ssrq-sds-fds.ch/Register/#", "") # replace link if not necessary
            if clean_id in past_ids:
                org_dict["points"] += 1
            org_dict["id"] = clean_id
            primary_hits.append(org_dict)

    else: # couldnt find key in db
        print("Org ID {} could not be found in DB".format(org_id))
            
    print("Finish searching")

    return primary_hits
    
    
    
    
def get_first_mention_or_birth(person, year):
    """ Get the earliest year of existance for that person """
    birthdates = [e for e in person["birth"] if e is not None]
    if len(birthdates) > 0:
        valid_birthdates = []
        for b in birthdates:
            b = str(b)
            if b.startswith("um"):
                um = True
            else:
                um = False
            bs = re.findall("\d{3,4}", b)
            if bs:
                valid_birthdates.append((um, bs))
        if valid_birthdates:
            earliest_list = \
            sorted(valid_birthdates, key=lambda x: (x[0], sorted(x[1], key=lambda y: int(y))[0]), reverse=True)[
                0]  # [(str. []), (str, [])]
            earliest = sorted(earliest_list[1], key=lambda y: int(y))[0] # (str, [])
            return (earliest_list[0], int(earliest))
        
    first_mentions = [e for e in person["fmention"] if e is not None]
    if len(first_mentions) > 0:
        valid_fmentions = []
        for b in first_mentions:
            b = str(b)
            if b.startswith("um"):
                um = True
            else:
                um = False
            bs = re.findall("\d{3,4}", b)
            if bs:
                valid_fmentions.append((um, bs))
        if valid_fmentions:
            earliest_list = \
            sorted(valid_fmentions, key=lambda x: (x[0], sorted(x[1], key=lambda y: int(y))[0]), reverse=True)[
                0]  # [(str. []), (str, [])]
            earliest = sorted(earliest_list[1], key=lambda y: int(y))[0] # (str, [])
            return (earliest_list[0], int(earliest)-FIRST_MENTION_TOLERANCE)
    return None
        
        
def get_persons(names, year, past_names, past_ids):
    """ Create list of candidate dictionaries for persons. """
    print("Start searching")
    primary_hits = []
    person_ids = set()
    for n in set(names):
        try:
            print("Sent first request " + n)
            r = requests.get("https://www.ssrq-sds-fds.ch/persons-db-api/?forename_search={}".format(n))
            print("Got first request")
        except:
            print("No Internet connection. Skipping.")
            continue
            
        if r.status_code == requests.codes.ok and r.text != "null": # at least one match
            for match in r.json()["results"]:
                if type(match) == str:
                    person_id = match
                else:
                    print("Returned json isn't valid for this script.")
                    continue
                person_ids.add(person_id)
        elif r.status_code == requests.codes.ok and r.text == "null": # No matches
            pass # list stays empty
        else: # Error 4XX or 5XX
            print("Querying for {} returned an error.".format(n))
                        
    print("Sent second request: " + ",".join(list(person_ids)))
    person_ids = list(person_ids)
    # cut the request into multiple requests if it's too long
    chunks = [person_ids[x:x+500] for x in range(0, len(person_ids), 500)]
    
    all_person_info = []
    
    for ch in chunks:
        person_info = requests.get("https://www.ssrq-sds-fds.ch/persons-db-api/?id_search_det={}".format(",".join(list(ch))))
        print("Got second request")
        if person_info.status_code == requests.codes.ok and person_info.text != "null":
            person_info = person_info.json()
            all_person_info.extend(person_info)
        else: # couldnt find key in db
            print("Person IDs {} could not be found in DB".format(",".join(list(ch))))
    
    for found in all_person_info:
        person_dict = {}
        person_dict["orgs"] = []
        person_dict["birth"] = []
        person_dict["death"] = []
        person_dict["role"] = []
        person_dict["gen"] = []
        person_dict["fname"] = []
        person_dict["remark"] = []
        person_dict["fmention"] = []
        person_dict["points"] = 0
        
        # Fill the dict with all the entries we found
        for entry in found["details"]:
            for key, value in entry.items():
                if key in ["id", "lang", "org_id", "type", "occ"]:
                    continue
                elif key == "surname":
                    person_dict["orgs"].append(value)
                elif key == "forename":
                    person_dict["fname"].append(value)
                elif key == "birth":
                    person_dict["birth"].append(value)
                elif key == "role":
                    person_dict["role"].append(value)
                elif key == "genname":
                    person_dict["gen"].append(value)
                elif key == "death":
                    person_dict["death"].append(value)
                elif key == "first_mention":
                    person_dict["fmention"].append(value)
        
        # look for them orgs! :D
        # filter persons out who are born after the document was created
        if int(year) != 0:
            earliest = get_first_mention_or_birth(person_dict, year)
            if earliest is None or earliest == 0:
                person_dict["year_diff"] = 100
            else:
                earliest_date = earliest[1]
                #person_dict["earliest_date"] = earliest_date # is this redundant?
                um = earliest[0]
                if um:
                    umyear = year + 10
                else:
                    umyear = year
                if earliest_date > umyear:
                    continue
                elif earliest_date < umyear:
                    person_dict["year_diff"] = umyear - earliest_date
                else:
                    person_dict["year_diff"] = 0
        else:
            person_dict["year_diff"] = 0
        
        for org in person_dict["orgs"]:
            for n in set(names):
                if n == str(org):
                    person_dict["points"] += 1
                elif n in str(org):
                    person_dict["points"] += 0.5
            for n in past_names:
                if n == str(org):
                    person_dict["points"] += 0.1

        clean_id = found["@ID"].replace("http://ssrq-sds-fds.ch/Register/#", "") # replace link if not necessary
        if clean_id in past_ids:
            person_dict["points"] += 1
            
        person_dict["id"] = clean_id
        primary_hits.append(person_dict)

    primary_hits = sorted(primary_hits, key=lambda k: (k['points'], -1*k['year_diff']), reverse=True)
    
    print("Finish searching")
    
    return primary_hits

def get_places(names, past_names, past_ids):
    # send name query to api https://www.ssrq-sds-fds.ch/places-db-edit/views/loc-search.xq?query=Biel
    # get information by passing the id to https://www.ssrq-sds-fds.ch/places-db-edit/views/get-info.xq?id=loc000740
    
    print("Start searching")
    
    places = []
    place_ids = set()
    for n in set(names):
        try:
            print("Sent first request " + n)
            r = requests.get("https://www.ssrq-sds-fds.ch/places-db-edit/views/loc-search.xq?query={}".format(n))
            print("Got first request")
        except:
            print("No Internet connection. Skipping.")
            continue
        if r.status_code == requests.codes.ok and r.text != "null": # at least one match
            for match in r.json()["results"]:
                if type(match) == dict:
                    place_id = match["id"]
                elif match == "id":
                    place_id = r.json()["results"]["id"]
                else:
                    continue
                place_ids.add(place_id)
        elif r.status_code == requests.codes.ok and r.text == "null": # No matches
            pass # list stays empty
        else: # Error 4XX or 5XX
            print("Querying for {} returned an error.".format(n))

    for place_id in place_ids:
        print("Sent second request " + place_id)
        place_info = requests.get("https://www.ssrq-sds-fds.ch/places-db-edit/views/get-info.xq?id={}".format(place_id))
        print("Got second request")
        if place_info.status_code == requests.codes.ok and place_info.text != "null" and place_info.json() != []:
            place_info = place_info.json()
            place_dict = {}
            place_dict["id"] = place_id
            try:
                place_dict["name"] = [place_info["stdName"]["#text"]]
            except:
                place_dict["name"] = ["No name found"]
            place_dict["location"] = [place_info["location"]]
            if type(place_info["type"]) == str:
                place_dict["type"] = [place_info["type"]]
            elif type(place_info["type"]) == list:
                place_dict["type"] = place_info["type"]
            else:
                print("what is this place type?")
            places.append(place_dict)
        else: # couldnt find key in db
            print("Place ID {} could not be found in DB".format(place_id))
            
    print("Finish searching")
            
    return places

def getCand(curr, complete_tags):
    curr = json.loads(curr)
    complete_tags = json.loads(complete_tags)
    string = curr["string"]
    tag = curr["tag"]
    tagattr = tag[0]["attr"]
    full_search = []
    for i in range(len(tag)):
        if "offset" in tag[i]:
            expan_str = solve_abbrevs(string[i], tag[i], complete_tags["results"])
            full_search.append(expan_str)
        else:
            print("Malformed tag: "+str(tag))
    expan_str = ' '.join(full_search)
    expan_str = solve_line_breaks(expan_str)
    signal_words = [w.rstrip(",.!?") for w in expan_str.split() if w[0].isupper()]
    return {"results":signal_words}
    
    
def solve_line_breaks(instr):
    return instr.replace("¬ ", "")


def get_tag_info(info, lineNo):
    """
    Read tags from PageXML and convert them to into a list of
    NamedTuples.
    """
    taginfo = []
    info = info.split("} ")
    for i in info:
        i = i.split(" {")
        attr_dict = OrderedDict()
        attr_dict["attr"] = i[0]
        attr_dict["lineNo"] = lineNo
        attrs = i[1].split(";")
        for a in attrs:
            if a == "}" or len(a) < 1:
                continue
            a = a.strip()
            a = a.split(":")
            attr_dict[a[0]] = a[1]
        MyNamedTuple = namedtuple('MyNamedTuple', list(attr_dict.keys()))(**attr_dict)
        taginfo.append(MyNamedTuple)
        
    return taginfo

    
def get_tagged_str(taginfo, line, lastline, nextline):
    """
    Find the corresponding string for the tags.
    Only happens to tags that need a ref attribute.
    TODO: Only add [...] if lastline is the first line 
        or nextline is the last line of the document
    """
    this_type = taginfo.attr
    if this_type in ["person", "organization", "place"]:
        context = []
        if hasattr(taginfo,"offset") and hasattr(taginfo,"length"):
            offset = int(taginfo.offset)
            length = int(taginfo.length)
            string = line[int(offset):int(offset)+int(length)]
            # GET CONTEXT
            contextSTART = int(offset)-CONTEXTLENGTH
            contextEND = int(offset)+int(length)+CONTEXTLENGTH
            if(contextSTART >= 0):
                context.append("[...]"+line[contextSTART:offset])
            elif(contextSTART+len(lastline) > 0):
                context.append("[...]"+lastline[contextSTART:]+"<br>"+line[:offset])
            elif(contextSTART+len(lastline) <= 0):
                context.append("[...]"+lastline+"<br>"+line[:offset])
            else:
                context.append("")
            if(contextEND < len(line)):
                context.append(line[offset+length:contextEND]+"[...]")
            elif(contextEND-len(line) < len(nextline)):
                context.append(line[offset+length:]+"<br>"+nextline[:contextEND-len(line)]+"[...]")
            elif(contextEND-len(line) >= len(nextline)):
                context.append(line[offset+length:]+"<br>"+nextline+"[...]")
            else:
                context.append("")
            return (taginfo), string, context
        else:
            print("Malformed Tag: "+str(taginfo))
            return (taginfo), "", ["", ""]
    else:
        return (taginfo), "", ["", ""]
        
        
def solve_abbrevs(text, tag, all_tags):
    """
    Solve all abbreviations on a line by looking at the tags.
    """
    shift = 0 # if an expan is longer than an abbrev, we have to shift all offset-indicators
    # collect all abbreviations on that line
    abbrs = []
    for i in all_tags:
        entry = i["tag"][0]
        string = i["string"][0]
        if entry["attr"] == "abbrev" and int(entry["lineNo"]) == int(tag["lineNo"]) and "expansion" in entry:
            abbrs.append(entry)
    for ab in abbrs:
        abbr_index = int(ab["offset"])+shift - int(tag["offset"])
        if abbr_index >= 0 and abbr_index < len(text):
            str_part1 = text[:abbr_index]
            str_part2 = text[abbr_index+int(ab["length"]):]
            text = str_part1 + ab["expansion"] + str_part2
            shift += (len(ab["expansion"])-int(ab["length"]))
            
    return text
    

def getNames(xml):
    """
    get person, organization and place tags from PageXML.
    """
    content = re.sub("<\?xml version.*?>", "", xml)
    try:
        root = et.fromstring(content)
    except Exception as e:
        print(e)
        return {"XMLERROR":"XMLERROR"}
    pagename = root.find(".//{http://schema.primaresearch.org/PAGE/gts/pagecontent/2013-07-15}Page").get("imageFilename")
    textlines = root.findall(".//{http://schema.primaresearch.org/PAGE/gts/pagecontent/2013-07-15}TextLine")
    all_tags = OrderedDict()
    len_saver = []
    for i, tl in enumerate(textlines):
        if i > 0:
            lastline = textlines[i-1].find(".//{http://schema.primaresearch.org/PAGE/gts/pagecontent/2013-07-15}Unicode")
            if lastline is not None:
                lastline = lastline.text
            else:
                lastline = ""
        else:
            lastline = ""
        line = tl.find(".//{http://schema.primaresearch.org/PAGE/gts/pagecontent/2013-07-15}Unicode")
        if line is not None and line.text is not None:
            line = line.text
        else:
            line = ""
        if i+1 < len(textlines):
            nextline = textlines[i+1].find(".//{http://schema.primaresearch.org/PAGE/gts/pagecontent/2013-07-15}Unicode")
            if nextline is not None:
                nextline = nextline.text
            else:
                nextline = ""
        else:
            nextline = ""
        len_saver.append(len(line))
        taginfo = get_tag_info(tl.get("custom"), i)
        all_tags[i] = OrderedDict()
        for ti in taginfo:
            tag, string, context = get_tagged_str(ti, line, lastline, nextline)
            string = (string, context) # DIRTY WATCH OUT, FROM THIS POINT ON, STRING IS A TUPLE, NOT A STRING OBJECT
            all_tags[i][tag] = string
    complete_tags = OrderedDict()
    for i, linetags in all_tags.items():
        for tag, string in linetags.items():
            if hasattr(tag, "continued") and tag.continued == "true" and (tag.offset != "0" or i == 0) and int(tag.offset)+int(tag.length) == len_saver[i]:
                complete = [(tag, string)]
                if i+1 < len(all_tags):
                    for tag2, string2 in all_tags[i + 1].items():
                        if tag.attr == tag2.attr and tag2.offset == "0" and hasattr(tag2, "continued") and tag2.continued == "true":
                            complete.append((tag2, string2))
                            if int(tag2.offset) + int(tag2.length) == len_saver[i + 1] and i+2 < len(all_tags):
                                for tag3, string3 in all_tags[i + 2].items():
                                    if tag.attr == tag3.attr and tag3.offset == "0" and hasattr(tag3, "continued") and tag3.continued == "true":
                                        complete.append((tag3, string3))
                                        break
                            break
                complete_tags[tuple([t[0] for t in complete])] = tuple([t[1] for t in complete])
            elif hasattr(tag, "continued") and tag.continued == "true" and tag.offset == "0":
                # this node should already be appended, so we only check that it is not an error in which case we add it
                complete = [(tag, string)]
                predecessor = False
                if i-1 >= 0:
                    for tag2, string2 in all_tags[i - 1].items():
                        if tag.attr == tag2.attr and hasattr(tag2, "continued") and tag2.continued == "true" and int(tag2.offset)+int(tag2.length) == len_saver[i - 1]:
                            # if this is found, this node has already been appended
                            predecessor = True
                            break
                if not predecessor and int(tag.offset)+int(tag.length) == len_saver[i] and i+1 < len(all_tags):
                    # if we don't find a predecessor and reach the end of this line, we need to check for further lines
                    for tag2, string2 in all_tags[i + 1].items():
                        if tag.attr == tag2.attr and tag2.offset == "0" and hasattr(tag2,
                                                                                    "continued") and tag2.continued == "true":
                            complete.append((tag2, string2))
                            if int(tag2.offset) + int(tag2.length) == len_saver[i + 1] and i+2 < len(all_tags):
                                for tag3, string3 in all_tags[i + 2].items():
                                    if tag.attr == tag3.attr and tag3.offset == "0" and hasattr(tag3,
                                                                                                "continued") and tag3.continued == "true":
                                        complete.append((tag3, string3))
                                        break
                            break
                    complete_tags[tuple([t[0] for t in complete])] = tuple([t[1] for t in complete])
                elif not predecessor:
                    complete_tags[tuple([t[0] for t in complete])] = tuple([t[1] for t in complete])
                else:
                    pass

            else: # simply append
                complete_tags[tag] = string
                
    #~ for tag, info in complete_tags.items():
        #~ print(tag)
        #~ print(info)
    
    jsonout = []
    for tag, string in complete_tags.items():
        if type(tag) != tuple:
            new_tag = [tag._asdict()]
            new_string = [string[0]]
            new_context = string[1]
        elif type(tag) == tuple:
            new_tag = [x._asdict() for x in tag]
            print(string)
            new_string = [x[0] for x in list(string)]
            new_context = [string[0][1][0], string[-1][1][1]]
        jsonout.append({"tag" : new_tag, "string" : new_string, "context" : new_context})
                
    return {"results":jsonout}
