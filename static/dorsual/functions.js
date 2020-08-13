$(document).ready(
    function(){

    	// var root_url = "http://104.248.136.9:5004/01/"
	var root_url = "https://www.koenigsfelden.uzh.ch:5000/iiif/2/"
    	var sessionID = "";
        var changeLog = {};

    	$("#loginBtn").click( function() {
    		var forminfo = $("#loginForm").serializeArray();
    		var usr = forminfo[0]["value"];
    		var pwd = forminfo[1]["value"];
    		
    		$.post("loginTranskribus/", { user: usr, pw: pwd }).done(
                function(data) {
                	if(data == "None") {
                        alert("Login failed.");
                    } else {
                    	alert("Login successful.")
                    	var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(data,"text/xml");
                        sessionID = xmlDoc.getElementsByTagName("sessionId")[0].childNodes[0].nodeValue;
                        $.post("getCollectionList/", { sid: sessionID }).done(
                            function(data) {
                                var cont = $('#coll_select')[0];
                                while(cont.firstChild) {
                                    cont.removeChild(cont.firstChild);
                                }
                                // var new_option = $('<option value="None" disabled selected>Wähle Collection</option>');
                                coll_select = $('#coll_select')[0];

                                var colls = data["results"];
                                colls.sort((a, b) => a["colName"].localeCompare(b["colName"]))
                                for (var i = 0; i < colls.length; i++) {
                                    var colID = colls[i]["colId"];
                                    var colName = colls[i]["colName"];
                                    // var new_option = $('<option value="'+colID+'">'+colName+'</option>');
                                    // $('#coll_select').append(new_option);
                                    coll_select.options[coll_select.options.length] = new Option(colName, colID);
                                }
                                $('.selectpicker').selectpicker('refresh');
                            }
                    	);
                    }
                }
            );
    	});

    	function compare (a, b) {
    		if (a.title > b.title) 
    			return 1;
    		else {
    			return 0;
    		}
    	}
        
        function createRows (textregions, imageFileName, docTitle, type, colID, docID, filter, xmlText, document_col) {
		for (var j = 0; j < textregions.length; j++) {
                create_row(textregions[j], imageFileName, docTitle, type, colID, docID, filter, xmlText, document_col);
            }
        }

    	function getDocumentList (c, colIDs, type, filter) {
    		let colID = colIDs[c];
			$.post("getDocumentList/", { sid: sessionID, colID: colID }).done(
            function(data) {
            	data["results"] = data["results"].sort(compare);
            	for (var i = 0; i < data["results"].length; i++) {
            		let docID = data["results"][i]["docId"];
            		$.post("getDocument/", { colID: colID, docID: docID, sid: sessionID }).done(
            			function(data) {
            				var docTitle = data["results"]["md"]["title"];
            				var pages = data["results"]["pageList"]["pages"];
	                		var url = pages[pages.length-1]["tsList"]["transcripts"][0]["url"]; // TODO: Could there be mutliple pages with dorsual notes?
	                		$.get(url).done( function(data) {
                                changeLog[docID] = {};
	                	var xmlText = new XMLSerializer().serializeToString(data);
				var relevantPages = data.getElementsByTagName("Page");
				var relevantPage = relevantPages[0];
				//console.log(relevantPage);
				var imageFileName = relevantPage.getAttribute("imageFilename");
				var textregions = relevantPage.getElementsByTagName("TextRegion");
                                var document_row = $("<div class='row border bg-secondary p-5'></div>");
                                var document_col = $("<div class='col bg-secondary'></div>");
                                $("#container").append(document_row);
                                document_row.append(document_col);
                                var docName_row = $("<div class='row m-2'><b>" + docTitle + "</b></div>");
                                document_col.append(docName_row);
                                var entries_row = $("<div class='row bg-secondary'></div>");
                                var entries_col = $("<div class='col bg-secondary'></div>");
                                document_col.append(entries_row);
                                entries_row.append(entries_col);
				//console.log(imageFileName);
				createRows(textregions, imageFileName, docTitle, type, colID, docID, filter, xmlText, entries_col);
				var do_change_btn_row = $("<div class='row m-2 float-right'></div>");
		    		var do_change_btn = $("<button type='button' class='btn btn-primary'>Änderungen übernehmen</button>");
                                do_change_btn_row.append(do_change_btn);
                                document_col.append(do_change_btn_row);

				do_change_btn.click( function() {
                                    
                                    console.log(changeLog);
                                    console.log(changeLog[docID]);
                                    
                                    $.post("changeDorsualType/", {
                                        changeLog: JSON.stringify(changeLog[docID]),
                                        xmlText: xmlText,
                                        collID: colID,
                                        docID: docID,
                                        sessionID: sessionID,
                                        pageNo: pages.length
                                    });
                                    
                                    do_change_btn.removeClass("btn-primary").addClass("btn-success");
                                });
	                		});
            			}
            		);
            	}
            }
        	);
    	}
    	
    	$("#goBtn").click( function() {
    		var colIDs = $("#coll_select").val();
    		var type = $("#dorsNote").val();
    		var filter = $("#alreadyProcessed").val();

			$("#container").empty();

			$("#loadingSpinner").addClass("spinner-border").addClass("spinner-border-sm");
            
            changeLog = {};

			for (c in colIDs) {
				getDocumentList(c, colIDs, type, filter);
			}
    	});

    	function get_coords (textregion) {
    		var coords = textregion.firstElementChild.getAttribute("points");
    		coords = coords.split(" ");
    		var highest_x = 0;
    		var highest_y = 0;
    		var lowest_x = 0;
    		var lowest_y = 0;
    		for (var i = 0; i < coords.length; i++) {
    			var xy = coords[i].split(",");
    			xy[0] = parseInt(xy[0]);
    			xy[1] = parseInt(xy[1]);
    			if (xy[0] > highest_x) {
    				highest_x = xy[0];
    			}
    			if (lowest_x == 0 || xy[0] < lowest_x) {
    				lowest_x = xy[0];
    			}
    			if (xy[1] > highest_y) {
    				highest_y = xy[1];
    			}
    			if (lowest_y == 0 || xy[1] < lowest_y) {
    				lowest_y = xy[1];
    			}
    		}
    		var width = highest_x - lowest_x;
    		var height = highest_y - lowest_y;

    		return [lowest_x.toString(), lowest_y.toString(), 
    			width.toString(), height.toString()].join(",");
    	}

    	function detect_type (textregion) {
    		var att = textregion.getAttribute("custom");
    		var re = /.*?structure \{type:(\S+);\}.*?$/
    		var type = "";
    		if (att.match(re)) {
    			type = att.replace(re, "$1");
    		} else {
    			type = "";
    		}
    		return type
    	}

    	function get_text (textregion) {
    		var textequiv = textregion.children[textregion.children.length-1];
    		var unicode = textequiv.children[0].innerHTML;

    		unicode = unicode.replace(/\n/g, "<br>");

    		return unicode
    	}

    	function passes_filter(filter, exists, judgement) {
    		if (filter == "not_checked_only" && exists)
				return false
			if (filter == "not_checked_only" && !exists)
				return true
			if (filter == "checked_only" && exists)
				return true
			if (filter == "checked_only" && !exists)
				return false
			if (filter == "correct_only" && exists && judgement)
				return true
			if (filter == "correct_only" && (!exists || !judgement))
				return false
			if (filter == "wrong_only" && exists && !judgement)
				return true
			if (filter == "wrong_only" && exists && judgement)
				return false
    	}

    	function create_row (textregion, imageName, docTitle, targetType, collID, docID, filter, xmlText, document_row) {
			$.post("checkFilter/", {
    			regionID: textregion.getAttribute("id"),
    			docID: docID
    		}).done( function (data) {
    			var exists_in_db = data["exists"]
    			var old_judgement = data["judgement"];

    			if (filter != "all" && !passes_filter(filter, exists_in_db, old_judgement)) {
    				return 
    			}

    			var type = detect_type(textregion);
	    		if (targetType == "All" || targetType == type) {
	    			$("#loadingSpinner").removeClass("spinner-border").removeClass("spinner-border-sm");

	    			var coords = get_coords(textregion);
	    			var text = get_text(textregion);

		    		// var src = root_url + docTitle + "/" + imageName.replace("jpg", "jp2") + "/" + coords + "/full/0/default.jpg"
				//iconsole.log(imageName);
				imagelinkname = imageName.replace(/(JPG|TIF|tiff|jpg)(\.jpg)?$/g, "jp2");
				var src = root_url + imagelinkname + "/" + coords + "/full/0/default.jpg"
				
		    		var new_row = $("<div class='row border bg-secondary'></div>");
		    		var image_col = $("<div class='col-6'></div>")
		    		var image_element = $("<img src='"+src+"' class='img-fluid mx-auto d-block' alt='" + src + "'>")


		    		var text_col = $("<div class='col p-2'></div>");
		    		var text_paragraph = $("<p>" + text + "</p>");

		    		var btn_col = $("<div class='col-3 p-2'></div>");
		    		// if (targetType == "All") {
		    		// 	var type_paragraph = $("<p><b>" + type + "</b></p>");
		    		// 	btn_col.append(type_paragraph);
		    		// }
		    		var type_row = $("<div class='row'></div>");
		    		// Input the type instead of dropdown to save RAM
		    		var type_input = $("<input class='col-6 m-2' type='text' name='type_input'>");
		    		type_input.val(type);
		    		var type_btn = $("<button type='button' class='btn btn-primary m-2'>Speichern</button>")
		    		var corr_row = $("<div class='row m-2'></div>");
		    		var corr_btn = $("<button type='button' class='btn btn-primary'>Korrekt</button>")
		    		var wrong_row = $("<div class='row m-2'></div>");
		    		var wrong_btn = $("<button type='button' class='btn btn-primary'>Fehler</button>")

		    		if (exists_in_db && old_judgement) {
    					corr_btn.removeClass("btn-primary").addClass("btn-success");
    				} else if (exists_in_db && !old_judgement) {
    					wrong_btn.removeClass("btn-primary").addClass("btn-danger");
    				}

    				type_btn.click( function () {
    					type_input_value = type_input.val();
                        
				changeLog[docID][textregion.getAttribute("id")] = [type_input_value, type];
				
				// console.log(changeLog);
				
				type_btn.removeClass("btn-primary").addClass("btn-success");
                        
/*    					$.post("changeDorsualType/", {
    						inputVal: type_input_value,
    						xmlText: xmlText,
    						collID: collID,
    						docID: docID,
    						sessionID: sessionID,
    						txtRegion: textregion.id
    					});*/
    				});

		    		corr_btn.click( function () {
		    			$.post("submitJudgement/", {
		    				collID: collID,
		    				docID: docID,
		    				regionID: textregion.getAttribute("id"),
		    				docTitle: docTitle,
		    				dorType: type,
		    				image: src,
		    				judgement: true
		    			});
		    			corr_btn.removeClass("btn-primary").addClass("btn-success");
		    			wrong_btn.removeClass("btn-danger").addClass("btn-primary");
		    		});
		    		wrong_btn.click( function () {
		    			$.post("submitJudgement/", {
		    				collID: collID,
		    				docID: docID,
		    				regionID: textregion.getAttribute("id"),
		    				docTitle: docTitle,
		    				dorType: type,
		    				image: src,
		    				judgement: false
		    			});
		    			wrong_btn.removeClass("btn-primary").addClass("btn-danger");
		    			corr_btn.removeClass("btn-success").addClass("btn-primary");
		    		});

		    		image_col.append(image_element);
		    		new_row.append(image_col);
		    		text_col.append(text_paragraph);
		    		new_row.append(text_col);
		    		btn_col.append(type_row);
		    		type_row.append(type_input);
		    		type_row.append(type_btn);
		    		btn_col.append(corr_row);
		    		corr_row.append(corr_btn);
		    		btn_col.append(wrong_row);
		    		wrong_row.append(wrong_btn);
		    		new_row.append(btn_col);

		    		document_row.append(new_row);
	    		}
    		});
    	}
    }
);
