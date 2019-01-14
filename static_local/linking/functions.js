$(document).ready(
    function(){

        var sessionID;
        var colID;
        var docID;
        var pageNo = 1;
        var pages;

        var mode = "pageXML";

        var all_past_names = [];
        var already_chosen_ids = [];
        var name_tags;
        var current_tag = 0;
        var pubyear = "";
        var xml = "";

        var chosen_refs = {}

        function setStandard() {
            all_past_names = [];
            already_chosen_ids = [];
            current_tag = 0;
            chosen_refs = {}
        }

        function filterTag(curr) {
            if(curr.tag[0].ref) { // Dont overwrite
                return false;
            }
            if(curr.tag[0].attr == "person" ||
                curr.tag[0].attr == "organization" ||
                curr.tag[0].attr == "place") {
                return true;
            }
            else {
                return false;
            }
        }

        function processTag(curr) {
            $.post("getCandidates/", { input: JSON.stringify(curr), all_tags: JSON.stringify(name_tags)}).done(
            function(data) {
                getNorms(data, curr);
            });
        }

        function getNorms(origNames, curr) {
            $.post("getNormalizedNames/", { input: JSON.stringify(origNames) }).done(
            function(data) {
                getPossibleRefs(origNames, data, curr);
            });
        }

        var helperTempSearch;

        function getPossibleRefs(data, norm_names, curr) {
            helperTempSearch = [data, norm_names, curr];
            var full = curr.string.join("").replace("¬","");
            if(full == "") {
                skip();
                return;
            }
            var joined = data.results.concat(norm_names.results);
            var asString = joined.join(", ");
            $("#fullstring").text(full);
            $("#signalList").text(asString);

            $.post("getRefCandidates/", { 
                input: JSON.stringify(joined), 
                pubyear: pubyear,
                past_names: JSON.stringify(all_past_names),
                past_ids: JSON.stringify(already_chosen_ids),
                type: curr.tag[0].attr
            }).done(
            function(data) {
                updateCandWindow(data["results"], curr);
                all_past_names.concat(joined);
            });
        }

        toGerman = {
            "role" : "Titel",
            "fname": "Vorname(n)",
            "gen"  : "Ordinalzahlen",
            "fmention" : "Ersterwähnung",
            "birth": "Geburtsdatum",
            "death": "Todesdatum",
            "orgs" : "Organisationen",
            "remark"   : "Bemerkungen",
            "otype": "Typ",
            "subtype"  : "Subtyp",
            "name" : "Name(n)",
            "location" : "Lage",
            "type" : "Type"
        }

        function createInfo(ol1, ol2, key, dict) {
            if(dict[key].length > 0) {
                var x = document.createElement("LI");
                var textNode = document.createTextNode(toGerman[key]);
                x.appendChild(textNode)
                ol1.appendChild(x);
                var x = document.createElement("LI");
                var textNode = document.createTextNode(dict[key].join(", "));
                x.appendChild(textNode)
                ol2.appendChild(x);
            }
        }

        function cleanCandWindows() {
            var cont = $("#foundEntryContainer")[0];
            while(cont.firstChild) {
                cont.removeChild(cont.firstChild);
            }
        }

        function updateCandWindow(hits, curr) {
            var lcolumn = $('<div id="leftCol"></div>');
            var rcolumn = $('<div id="rightCol"></div>');
            var bcolumn = $('<div id="buttonCol"></div>');
            var button = $('<button class="choose">Auswählen</button>');
            bcolumn.append(button);
            var entry = $('<div id="candWindow"></div>');
            entry.append(lcolumn);
            entry.append(rcolumn);
            entry.append(bcolumn);
            if (hits.length == 0) {
                var notFound = $('<h3>Keine Kandidaten gefunden. Erweitere die Normalisierungen für bessere Chancen!</h3>');
                $("#foundEntryContainer").append(notFound);
            }
            for (var i = 0; i < hits.length; i++) {
                var new_entry = entry.clone();
                $("#foundEntryContainer").append(new_entry);
                var ol = document.createElement("UL");
                var ol2 = document.createElement("UL");
                for (var info in toGerman) {
                    if (hits[i].hasOwnProperty(info)) {
                        createInfo(ol, ol2, info, hits[i])
                    }
                }
                new_entry[0].children[0].appendChild(ol);
                new_entry[0].children[1].appendChild(ol2);
                new_entry[0].children[2].children[0].refID = hits[i]["id"];
            }
            $(".choose").click( function() {
                var chosen_id = $(this)[0].refID;
                for (var i = 0; i < curr.tag.length; i++) {
                    curr.tag[i]["ref"] = chosen_id;
                }
                //console.log(curr.tag);
                //console.log(chosen_id);
                chosen_refs[current_tag] = curr.tag;
                //console.log(chosen_refs);
                already_chosen_ids.push(chosen_id);
                // make ready for the next process
                cleanCandWindows();
                current_tag++;
                if(current_tag >= name_tags.results.length) {
                    //TODO: Send references to python to change the PageXML
                    modifyXML();
                }
                else {
                    for (current_tag; current_tag < name_tags.results.length; current_tag++) {
                        if(filterTag(name_tags.results[current_tag])) {
                            processTag(name_tags.results[current_tag]);
                            break
                        }
                        else if(current_tag+1 == name_tags.results.length) {
                            for (var i = 0; i < name_tags.results[current_tag].tag.length; i++) {
                                name_tags.results[current_tag].tag[i]["ref"] = null;
                            }
                            chosen_refs[current_tag] = name_tags.results[current_tag].tag;
                            //TODO: Send references to python to change the PageXML
                            modifyXML();
                        }
                        else {
                            for (var i = 0; i < name_tags.results[current_tag].tag.length; i++) {
                                name_tags.results[current_tag].tag[i]["ref"] = null;
                            }
                            chosen_refs[current_tag] = name_tags.results[current_tag].tag;
                        }
                    }
                }
            });
        }

        function modifyXML() {
            //console.log(chosen_refs);
            $.post("changeXML/", { origXML: xml, refDict: JSON.stringify(chosen_refs) }).done(
                function (data) {
                    if(mode=="runTK") {
                        $.post("postTranscript/", { colID: colID, docID: docID, pageNo: pageNo, sid: sessionID, xml: data }).done(
                            function (data) {
                                r = data["response"];
                                if(r) {
                                    alert("Successful upload to server!");
                                }
                                else {
                                    alert("Failed upload to server! Please contanct an administrator.");
                                }
                            });
                    }
                    else {
                        $("textarea#xmlinputfield").val(data);
                        alert("All references chosen!");
                    }
                }
            );
        }

        function skip() {
            for (var i = 0; i < name_tags.results[current_tag].tag.length; i++) {
                name_tags.results[current_tag].tag[i]["ref"] = null;
            }
            chosen_refs[current_tag] = name_tags.results[current_tag].tag;
            cleanCandWindows();
            current_tag++;
            if(current_tag >= name_tags.results.length) {
                modifyXML()
            }
            else {
                for (current_tag; current_tag < name_tags.results.length; current_tag++) {
                    if(filterTag(name_tags.results[current_tag])) {
                        processTag(name_tags.results[current_tag]);
                        break
                    }
                    else if(current_tag+1 == name_tags.results.length) {
                        for (var i = 0; i < name_tags.results[current_tag].tag.length; i++) {
                            name_tags.results[current_tag].tag[i]["ref"] = null;
                        }
                        chosen_refs[current_tag] = name_tags.results[current_tag].tag;
                        modifyXML()
                    }
                    else {
                        for (var i = 0; i < name_tags.results[current_tag].tag.length; i++) {
                            name_tags.results[current_tag].tag[i]["ref"] = null;
                        }
                        chosen_refs[current_tag] = name_tags.results[current_tag].tag;
                    }
                }
            }
        }

        $("#skip").click( function() {skip()} );

        $(".run").click( function() {
    		setStandard();
            cleanCandWindows();
            mode = $(this)[0].id;
            if(mode == "runPXML") {
                xml = $("textarea#xmlinputfield").val();
                pubyear = $("input#pubyear").val();
            }
            else if (mode == "runTK") {
                // xml is already ready
                pubyear = $("input#pubyearTK").val();
            }
            if(pubyear == "") {
                pubyear = 0;
            }
            if(xml.length > 0) {
                $.post("getNameTags/", { input: xml, }).done(
                function(data) {
                    name_tags = data;
                    for (var i = 0; i < name_tags.results.length; i++) {
                        var curr = name_tags.results[i];
                        if(filterTag(curr)) {
                            current_tag = i;
                            processTag(curr);
                            break;
                        }
                        else {
                            for (var j = 0; j < name_tags.results[current_tag].tag.length; j++) {
                                name_tags.results[current_tag].tag[j]["ref"] = null;
                            }
                            chosen_refs[current_tag] = name_tags.results[current_tag].tag;
                        }
                    }
                });
            }
            }
        );

        $("#addNorm").click( function() {
            var origName = $("#origIn").val();
            var normName = $("#normIn").val();
            if(origName != "" && normName != "") {
                $(".addNorm").val("");
                $.post("submitNorm/", { orig: origName, norm: normName});
            }
        });

        $("#reload").click( function() {
            cleanCandWindows();
            processTag(name_tags.results[current_tag]);
        });

        $("#missingEntry").click( function() {
            var doc = $("#documentEntry").val();
            var refLink = $("#refLinkEntry").val();
            var subBy = $("#submittedByEntry").val();
            var string = $("#fullstring").text();
            if(subBy == "" || doc == "") {
                return
            }
            $(".missingEntry").val("");
            $.post("submitMissingEntry/", { context: string, doc: doc, ref: refLink, author: subBy });
        });

        $("#addTempSignal").click( function() {
            var toAdd = $("#tempSignalEntry").val();
            if(toAdd == "") {
                return
            }
            $("#tempSignalEntry").val("");
            var split_toAdd = toAdd.split(",");
            console.log(split_toAdd);
            helperTempSearch[1].results = helperTempSearch[1].results.concat(split_toAdd);
            cleanCandWindows();
            getPossibleRefs(helperTempSearch[0], helperTempSearch[1], helperTempSearch[2]);
        });

        $("#TKlogin").click( function() {
            usr = $("#username").val();
            pass = $("#pass").val();
            $.post("loginTranskribus/", { user: usr, pw: pass }).done(
                function(data) {
                    if(data == "None") {
                        //console.log("Login failed.");
                        $("#login_response").text("Failed to log in.");
                    } else {
                        //console.log("Login worked.");
                        $("#login_response").text("Successfully logged in.");
                        parser = new DOMParser();
                        xmlDoc = parser.parseFromString(data,"text/xml");
                        sessionID = xmlDoc.getElementsByTagName("sessionId")[0].childNodes[0].nodeValue;
                        $.post("getCollectionList/", { sid: sessionID }).done(
                            function(data) {
                                var cont = $('#coll_select')[0];
                                while(cont.firstChild) {
                                    cont.removeChild(cont.firstChild);
                                }
                                new_option = $('<option value="None" disabled selected>Wähle Collection</option>');
                                $('#coll_select').append(new_option);
                                colls = data["results"]
                                colls.sort((a, b) => a["colName"].localeCompare(b["colName"]))
                                for (var i = 0; i < colls.length; i++) {
                                    colID = colls[i]["colId"];
                                    colName = colls[i]["colName"];
                                    new_option = $('<option value="'+colID+'">'+colName+'</option>');
                                    $('#coll_select').append(new_option);
                                }
                            }
                    );
                }
                }
            );
        });

        $('#coll_select').on('change', function(evt, params) {
            colID = $('#coll_select').val();
            $.post("getDocumentList/", { sid: sessionID, colID: colID }).done(
                function(data) {
                    var cont = $('#doc_select')[0];
                    while(cont.firstChild) {
                        cont.removeChild(cont.firstChild);
                    }
                    new_option = $('<option value="None" disabled selected>Wähle Dokument</option>');
                    $('#doc_select').append(new_option);
                    docs = data["results"]
                    docs.sort((a, b) => a["title"].localeCompare(b["title"]))
                    for (var i = 0; i < docs.length; i++) {
                        docID = docs[i]["docId"];
                        docName = docs[i]["title"];
                        new_option = $('<option value="'+docID+'">'+docName+'</option>');
                        $('#doc_select').append(new_option);
                    }
                }
            );
        });


        $('#doc_select').on('change', function(evt, params) {
            docID = $('#doc_select').val();
            $.post("getDocument/", { colID: colID, docID: docID, sid: sessionID }).done(
                function(data) {
                    // TODO: Create Select Element for page choice
                    pages = data["results"]["pageList"]["pages"]
                    pageLen = pages.length;
                    var cont = $('#page_select')[0];
                    while(cont.firstChild) {
                        cont.removeChild(cont.firstChild);
                    }
                    new_option = $('<option value="None" disabled selected>Wähle Seite</option>');
                    $('#page_select').append(new_option);
                    for (var i = 0; i < pageLen; i++) {
                        j = i+1;
                        new_option = $('<option value="'+j+'">'+j+'</option>');
                        $("#page_select").append(new_option);
                    }
                }
            );
        });

        $('#page_select').on('change', function(evt, params) {
            pageNo = parseInt($('#page_select').val());
            url = pages[pageNo-1]["tsList"]["transcripts"][0]["url"]

            $.get(url).done( function(data) {
                var xmlText = new XMLSerializer().serializeToString(data);
                xml = xmlText;

                relevantPages = data.getElementsByTagName("Page");
                relevantPage = relevantPages[0]
                textregions = relevantPage.getElementsByTagName("TextRegion");
                all_text = []
                for (var i = 0; i < textregions.length; i++) {
                    textequivs = textregions[i].getElementsByTagName("TextEquiv");
                    if(textequivs.length > 0) {
                        this_unicode = textequivs[textequivs.length-1].getElementsByTagName("Unicode")[0].innerHTML;
                        all_text.push(this_unicode);
                    }
                }
                $("#showXMLText").html(all_text.join("\n\n"));
            });
        });
    }
);
