$(document).ready(
    function(){
        
        $('#db_select').val("ssrq");
        
        typeColorDict = {
            "person" : "teal",
            "organization" : "yellowGreen",
            "place" : "olive"
        }
        
        console.log("ready");

        var sessionID;
        var colID;
        var docID;
        var pageNo = 1;
        var pages;
        var current_type;

        var global_curr;

        var mode = "pageXML";
        var chosen_db = "ssrq"; // this is our standard db

        var all_past_names = [];
        var already_chosen_ids = [];
        var name_tags;
        var current_tag = 0;
        var pubyear = "";
        var xml = "";
        var xmlDocument;

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
        
        function checkIfRefNotPresent(curr) {
            if(curr.tag[0].ref) {
                return false;
            }
            return true;
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
                getPossibleRefs(origNames, data, curr, [curr.context[0],curr.context[1]]);
            });
        }

        var helperTempSearch;

        function getPossibleRefs(data, norm_names, curr, context) {
            global_curr = curr;
            helperTempSearch = [data, norm_names, curr, context];
            var full = context[0] + "<b>" + curr.string.join(" ").replace("¬","") + "</b>" + context[1];
            if(full == "") {
                skip();
                return;
            }
            var joined = data.results.concat(norm_names.results);
            var asString = joined.join(", ");
            
            if(mode != "runTEI") {
                type = curr.tag[0].attr;
            } else {
                type = name_tags.results[current_tag].type;
            }
            current_type = type;
            
            $("#fullstring").html(full);
            $("#signalList").text(asString);
            
            $(".changeOnType").css("background-color", typeColorDict[type]);

            if(chosen_db == "ssrq") {
                $.post("getRefCandidates/", { 
                    input: JSON.stringify(joined), 
                    pubyear: pubyear,
                    past_names: JSON.stringify(all_past_names),
                    past_ids: JSON.stringify(already_chosen_ids),
                    type: type
                }).done(
                function(data) {
                    updateCandWindow(data["results"], curr);
                    all_past_names.concat(joined);
                });
            } else if (chosen_db == "gnd") {
                // put everything in this part in a separate funtion later
                //console.log(joined)
                // send one query (q0, q1, q2, q3...) for each pair of signalwords
                // sort by the overall best score
                var query_types = convertTypeGND[type];
                var query_array = []
                for(var x = 0; x < query_types.length; x++) {
                    for(var i = 0; i < joined.length; i++) {
                        query_array.push([joined[i], query_types[x]]);
                        for(var j = i+1; j < joined.length; j++) {
                            query_array.push([[joined[i], joined[j]].join(", "), query_types[x]]);
                        }
                    }
                }
                var queries = {}
                for(var i = 0; i < query_array.length; i++) {
                    queries[String(i)] = {"query": query_array[i][0], "type": query_array[i][1]};
                }
                console.log(queries);
                var query_data = {"queries" : JSON.stringify(queries)};
                $.ajax({
                    url: "http://lobid.org/gnd/reconcile", 
                    type: "POST",
                    data: query_data,
                    success: function(result){
                        console.log(result);
                        // instead of logging, get detailed information about the top 10? 50? 100? hits
                        // maybe field search will be better...
                    }
                });
            }
        }
        
        convertTypeGND = {
            "person" : ["Person"],
            "place" : ["PlaceOrGeographicName"],
            "organization" : ["Family", "CorporateBody"]
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

        function createInfo(table, key, dict) {
            if(dict[key].length > 0) {
                var label = toGerman[key];
                var info = dict[key].join(", ");
                var tr = document.createElement("tr");
                var lc = document.createElement("td");
                var textNode = document.createTextNode(label);
                lc.appendChild(textNode);
                tr.appendChild(lc);

                var rc = document.createElement("td");
                var textNode = document.createTextNode(info);
                rc.appendChild(textNode);
                tr.appendChild(rc);
                table.appendChild(tr);
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
            // var rcolumn = $('<div id="rightCol"></div>');
            var bcolumn = $('<div id="buttonCol"></div>');
            var button = $('<button class="choose">Auswählen</button>');
            bcolumn.append(button);
            var entry = $('<div id="candWindow"></div>');
            entry.append(lcolumn);
            // entry.append(rcolumn);
            entry.append(bcolumn);
            if (hits.length == 0) {
                var notFound = $('<h3>Keine Kandidaten gefunden. Erweitere die Normalisierungen für bessere Chancen!</h3>');
                $("#foundEntryContainer").append(notFound);
            }
            for (var i = 0; i < hits.length; i++) {
                var new_entry = entry.clone();
                $("#foundEntryContainer").append(new_entry);
                var table = document.createElement("table");
                for (var info in toGerman) {
                    if (hits[i].hasOwnProperty(info)) {
                        createInfo(table, info, hits[i])
                    }
                }
                new_entry[0].children[0].appendChild(table);
                //new_entry[0].children[0].appendChild(ol);
                //new_entry[0].children[1].appendChild(ol2);
                new_entry[0].children[1].children[0].refID = hits[i]["id"];
            }
            $(".choose").click( function() {
                if(mode != "runTEI") {
                    var chosen_id = $(this)[0].refID;
                    for (var i = 0; i < curr.tag.length; i++) {
                        curr.tag[i]["ref"] = chosen_id;
                    }
                    //console.log(curr.tag);
                    //console.log(chosen_id);
                    chosen_refs[current_tag] = curr.tag;
                    //console.log(chosen_refs);
                    already_chosen_ids.push(chosen_id);
                } else {
                    // find the node with the correct placeholder in our xmlDocument
                    // remove the placeholder and add the ref attribute instead
                    var placeholder = name_tags.results[current_tag].id
                    var node = $(xmlDocument).find("*[ref_placeholder_id='"+placeholder+"']")
                    node.attr("ref", $(this)[0].refID);
                    node.removeAttr("ref_placeholder_id");
                    //console.log($(this)[0].refID);
                    already_chosen_ids.push($(this)[0].refID);
                    //console.log(xmlDocument);
                }
                // make ready for the next process
                cleanCandWindows();
                current_tag++;
                if(mode != "runTEI") {
                    PageXML_continue();
                } else {
                    TEI_continue();
                }
            });
        }

        function PageXML_continue() {
            if(current_tag >= name_tags.results.length) {
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
                            if(checkIfRefNotPresent(name_tags.results[current_tag])) {
                                name_tags.results[current_tag].tag[i]["ref"] = null;
                            }
                        }
                        chosen_refs[current_tag] = name_tags.results[current_tag].tag;
                        modifyXML();
                    }
                    else {
                        for (var i = 0; i < name_tags.results[current_tag].tag.length; i++) {
                            if(checkIfRefNotPresent(name_tags.results[current_tag])) {
                                name_tags.results[current_tag].tag[i]["ref"] = null;
                            }
                        }
                        chosen_refs[current_tag] = name_tags.results[current_tag].tag;
                    }
                }
            }
        }
        
        function TEI_continue() {
            // Checks if all tags have been processed and if true
            // transforms the xmlDocument back to string and writes it to
            // the textarea
            // returns true if there are more tags to process
            // else continue with the next tag            
            if(current_tag >= name_tags.results.length) {
                var xmlText = new XMLSerializer().serializeToString(xmlDocument);
                $("textarea#xmlinputfieldTEI").val(xmlText);
                alert("All references chosen!");
            }
            else {
                $.post("getDataTEI/", { input: name_tags.results[current_tag].names, }).done(
                function(data) {
                    //console.log(data);
                    getPossibleRefs(data.orig_names, data.norm_names, data.fulltext, name_tags.results[current_tag].context);
                });
            }
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
            if(mode != "runTEI") {
                for (var i = 0; i < name_tags.results[current_tag].tag.length; i++) {
                    name_tags.results[current_tag].tag[i]["ref"] = null;
                }
                chosen_refs[current_tag] = name_tags.results[current_tag].tag;
            } else {
                // even if we skip we need to delete the placeholder
                var placeholder = name_tags.results[current_tag].id
                var node = $(xmlDocument).find("*[ref_placeholder_id='"+placeholder+"']")
                node.removeAttr("ref_placeholder_id");
            }
            // TODO: Append placeholder if skip is pressed?
            cleanCandWindows();
            current_tag++;
            //
            if(mode != "runTEI") {
                PageXML_continue();
            } else {
                TEI_continue();
            }
        }

        $("#skip").click( function() { skip()} );

        $(".run").click( function() {
            console.log("Running...");
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
            else if (mode == "runTEI") {
                xml = $("textarea#xmlinputfieldTEI").val();
                pubyear = $("input#pubyearTEI").val();
            }
            if(pubyear == "") {
                pubyear = 0;
            }
            if(xml.length > 0 && (mode == "runTK" || mode == "runPXML")) {
                $.post("getNameTags/", { input: xml, }).done(
                function(data) {
                    name_tags = data;
                    PageXML_continue();
                    //~ console.log(name_tags);
                    //~ for (var i = 0; i < name_tags.results.length; i++) {
                        //~ var curr = name_tags.results[i];
                        //~ current_tag = i;
                        //~ if(filterTag(curr)) {
                            //~ processTag(curr);
                            //~ break;
                        //~ }
                        //~ else {
                            //~ PageXML_continue();
                        //~ }
                    //~ }
                });
            }
            else if(xml.length > 0 && mode == "runTEI") {
                current_tag = 0;
                
                /*
                 * New plan to get from TEI
                 * send the TEI text in plain text to python
                 * return a list of dict containing [{id: int, name: string, context: string}]
                 */
                 
                $.post("getNamesTEI/", { input: xml, }).done(
                function(data) {
                    xml = data.mod_xml;
                    parser = new DOMParser();
                    xmlDocument = parser.parseFromString(xml,"text/xml");
                    
                    name_tags = data;
                    
                    $.post("getDataTEI/", { input: name_tags.results[current_tag].names, }).done(
                    function(data) {
                        //console.log(data);
                        getPossibleRefs(data.orig_names, data.norm_names, data.fulltext, name_tags.results[current_tag].context);
                    });
                });
            }
        });

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
            if(mode != "runTEI") {
                processTag(name_tags.results[current_tag]);
            } else {
                $.post("getDataTEI/", { input: name_tags.results[current_tag].names, }).done(
                function(data) {
                    //console.log(data);
                    getPossibleRefs(data.orig_names, data.norm_names, data.fulltext, name_tags.results[current_tag].context);
                });
            }
        });

        $("#missingEntry").click( function() {
            var name = $("#missingName").val();
            $(".missingEntry").val("");
            $.post("submitMissingEntry/", { name: name, type: current_type }).done(
                function(data) {
                    // data.entry holds the id
                    // open a new windoow/tab for editing purposes
                    // dont forget to add id to already taken ids
                    // link id
                    var link_id = data.entry;
                    if(link_id == "Too many requests") {
                        alert("Too many requests in the last hour. No entry created.")
                        return;
                    } else if (link_id == "Not logged in.") {
                        alert("Please log into the linking-tool account of the place database to create an entry.")
                    }
                    var win;
                    if(current_type == "person" || current_type == "organization") {
                        win = window.open("https://www.ssrq-sds-fds.ch/persons-db-edit/?query="+link_id+"&?upd", "_blank");
                    } else {
                        win = window.open("https://www.ssrq-sds-fds.ch/places-db-edit/edit/edit-place.xq?id="+link_id, "_blank");
                    }
                    if(win) {
                        // TODO: Find a way to put focus on the old window
                    } else {
                        alert('Please allow popups for this website');
                    }
                    if(mode != "runTEI") {
                        var chosen_id = link_id;
                        for (var i = 0; i < global_curr.tag.length; i++) {
                            global_curr.tag[i]["ref"] = chosen_id;
                        }
                        chosen_refs[current_tag] = global_curr.tag;
                        already_chosen_ids.push(chosen_id);
                    } else {
                        var placeholder = name_tags.results[current_tag].id
                        var node = $(xmlDocument).find("*[ref_placeholder_id='"+placeholder+"']")
                        node.attr("ref", link_id);
                        node.removeAttr("ref_placeholder_id");
                        already_chosen_ids.push(link_id);
                    }
                    cleanCandWindows();
                    current_tag++;
                    if(mode != "runTEI") {
                        PageXML_continue();
                    } else {
                        TEI_continue();
                    }
                }
            );
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
            getPossibleRefs(helperTempSearch[0], helperTempSearch[1], helperTempSearch[2], helperTempSearch[3]);
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
        
        $('#db_select').on('change', function(evt, params) {
            chosen_db = $('#db_select').val();

            if(chosen_db == "ssrq") {
                $('#missingEntryContainer').css('display', 'inline');
            } else {
                $('#missingEntryContainer').css('display', 'none');
            }
        });
    }
);
