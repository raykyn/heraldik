$(document).ready(
    function(){
        
        var canvas = document.getElementById("myCanvas");
	paper.setup(canvas);
        var maxSize = Math.min(canvas.style.width, canvas.style.height);
        var center = canvas.center;

	var finalDrawWidth = canvas.style.width.slice(0, -2) > 0 ? canvas.style.width.slice(0, -2) :  canvas.width;
	var finalDrawHeight = canvas.style.height.slice(0, -2) > 0 ? canvas.style.height.slice(0, -2) : canvas.height;
        
        function csx (s) {
            //~ scale an int to the relative size to the canvas width
            s = s * (finalDrawWidth / 100)
            return s
        }
        
        function csy (s) {
            //~ scale an int to the relative size to the canvas height
            s = s * (finalDrawHeight / 100)
            return s
        }
        
        function startDrawing ( data ) {
            paper.project.clear();
            parser = new DOMParser();
            xmlDoc = parser.parseFromString( data , "text/xml" );
            x = xmlDoc.documentElement.children;
            // We need to change dimensions depending on what exists
            // E.g. if there is a Schildhaupt, it takes up the upper quarter of the shield
            var header = false;
            var footer = false;
            var feldNode;
            for (var i = 0; i < x.length; i++) {
                if(x[i].nodeName == "Haupt") {
                    header = true;
                    drawFeld(x[i], [csx(0), csy(0)],  [csx(100), csy(33)]);
                }
                else if(x[i].nodeName == "Feld") {
                	feldNode = x[i];
                }
            }
            if(!header && !footer) {
            	drawFeld(feldNode, [csx(0), csy(0)],  [csx(100), csy(100)]);
            }
            else if(header && !footer) {
            	drawFeld(feldNode, [csx(0), csy(33)],  [csx(100), csy(100)]);
            }
            
        }
        
        function drawFeld ( node, x, y ) {
            var colors = getColors(node);
            var layout = node.getAttribute("layout");
            if(layout == "ledig") {
                //~ Colour all in one plain color
                var rect = new paper.Rectangle(new paper.Point(x[0], x[1]), new paper.Point(y[0], y[1]));
                var path = new paper.Path.Rectangle(rect);
                path.strokeColor = "black";
                path.fillColor = colors[0];
            }
            else if(layout == "geteilt") {
            	var count = 1;
            	var fields = [];
            	for (var i = 0; i < node.children.length; i++) {
            		if(node.children[i].nodeName == "Male") {
            			count = parseInt(node.children[i].getAttribute("value"));
            		}
            		else if (node.children[i].nodeName == "Feld") {
            			fields.push(node.children[i]);
            		}
            	}
            	//console.log(fields);
            	// Split the field into count fields
            	var step = (y[1]-x[1]) / (count+1);
            	for (var i = 0; i <= count; i++) {
            		var fieldNode = fields[i % 2]
            		drawFeld(fieldNode, [x[0], (x[1] + step * i)], [y[0], x[1] + step * (i+1)]);
            	}
            }
            else if(layout == "gespalten") {
            	var count = 1;
            	var fields = [];
            	for (var i = 0; i < node.children.length; i++) {
            		if(node.children[i].nodeName == "Male") {
            			count = parseInt(node.children[i].getAttribute("value"));
            		}
            		else if (node.children[i].nodeName == "Feld") {
            			fields.push(node.children[i]);
            		}
            	}
            	//console.log(fields);
            	// Split the field into count fields
            	var step = (y[0]-x[0]) / (count+1);
            	for (var i = 0; i <= count; i++) {
            		var fieldNode = fields[i % 2]
            		drawFeld(fieldNode, [(x[0] + step * i), x[1]], [x[0] + step * (i+1), y[1]]);
            	}
            }
            else if(layout == "geviert") {
            	var fields = [];
            	for (var i = 0; i < node.children.length; i++) {
            		if (node.children[i].nodeName == "Feld") {
            			fields.push(node.children[i]);
            		}
            	}
            	if(fields.length != 4) {
            		console.log("Geviert-layout always needs 4 fields!")
            	}
            	drawFeld(fields[0], [x[0], x[1]], [x[0] + ((y[0] - x[0]) / 2), x[1] + ((y[1] - x[1]) / 2)]); // upper left
            	drawFeld(fields[1], [x[0] + ((y[0] - x[0]) / 2), x[1]], [y[0], x[1] + ((y[1] - x[1]) / 2)]); // upper right
            	drawFeld(fields[2], [x[0] + ((y[0] - x[0]) / 2), x[1] + ((y[1] - x[1]) / 2)], [y[0], y[1]]); // lower left
				drawFeld(fields[3], [x[0], x[1] + ((y[1] - x[1]) / 2)], [x[0] + ((y[0] - x[0]) / 2), y[1]]); // lower right
            }
            var fgroups = [];
            var ueberdeckend = []
        	for (var i = 0; i < node.children.length; i++) {
        		if (node.children[i].nodeName == "FGruppe") {
        			fgroups.push(node.children[i]);
        		}
        		if (node.children[i].nodeName == "Ueberdeckt") {
        			ueberdeckend.push(node.children[i]);
        		}
        	}
            if(fgroups.length == 1) {
                // Exactly one group of figures
                //console.log("FGroup:");
                //console.log(x, y);
                drawFGroup(fgroups[0], x, y);
            }
            if(ueberdeckend.length == 1) {
                // Exactly one group of figures
                var fgroupcount = ueberdeckend[0].children.length;
                for (var i = 0; i < fgroupcount; i++) {
                	drawFGroup(ueberdeckend[0].children[i], x, y);
                }
            }
        };
        
        function drawFGroup( node, x, y ) {
            // Find out how many figures are part of that FGroup
            var figures = [];
            for (var i = 0; i < node.children.length; i++) {
        		if (node.children[i].nodeName == "Figur") {
        			figures.push(node.children[i]);
        		}
        	}
           	var figureName = figures[0].getAttribute("figure")
           	// Check for all special figures like [Pfahl, Balken, Schräg-, usw.]
           	if(figureName == "Pfahl" || figureName == "Pfähle") {
           		drawPfahl(figures, x, y);
           	}
           	else if(figureName == "Balken") {
           		drawBalken(figures, x, y);
           	}
           	else if(figureName == "Schrägbalken") {
           		drawSchraegbalken(figures, x, y);
           	}
           	else if(figureName == "Kreuz" && figures.length == 1) {
           		drawKreuz(figures, x, y);
           	}
           	else if(figureName == "Zwillingspfahl") {
           		drawZwillingspfahl(figures, x, y);
           	}
           	else if(figureName == "Zwillingsbalken") {
           		drawZwillingsbalken(figures, x, y);
           	}
           	else if(figureName == "Zwillingsschrägbalken") {
           		drawZwillingsschraegbalken(figures, x, y);
           	}
           	// all other figures
           	else {
           		drawFigur(figures, x, y, node.getAttribute("formation"));
           	}
        }

        function createBerg() {
        	var path = new paper.Path();
        	path.add(new paper.Point(-50, 0));
        	path.add(new paper.Point(0, 0));
        	path.add(new paper.Point(0, -20));
        	path.arcTo(new paper.Point(-25, -40), new paper.Point(-50, -20));
        	path.add(new paper.Point(-50, 0));

        	return path;
        }

        function createDreiberg() {
        	// Create a Dreiberg

        	var berg = createBerg();
        	berg.position = [-100, -100];
        	var berg2 = createBerg();
        	berg2.position = [-75, -80];
        	var berg3 = createBerg();
        	berg3.position = [-125, -80];

        	var group = new paper.Group([berg, berg2, berg3]);

        	return group;
        }

        function createSechsberg() {
        	// Create a Sechsberg

        	var berg = createBerg();
        	berg.position = [-100, -100];
        	var berg2 = createBerg();
        	berg2.position = [-75, -80];
        	var berg3 = createBerg();
        	berg3.position = [-125, -80];
        	var berg4 = createBerg();
        	berg4.position = [-150, -60];
        	var berg5 = createBerg();
        	berg5.position = [-100, -60];
        	var berg6 = createBerg();
        	berg6.position = [-50, -60];

        	var group = new paper.Group([berg, berg2, berg3, berg4, berg5, berg6]);

        	return group;
        }

        function createKreuz() {
        	var kreuz = new paper.Path();
        	kreuz.add(new paper.Point(-66, -100));
        	kreuz.add(new paper.Point(-33, -100));
        	kreuz.add(new paper.Point(-33, -66));
        	kreuz.add(new paper.Point(0, -66));
        	kreuz.add(new paper.Point(0, -33));
        	kreuz.add(new paper.Point(-33, -33));
        	kreuz.add(new paper.Point(-33, 0));
        	kreuz.add(new paper.Point(-66, 0));
        	kreuz.add(new paper.Point(-66, -33));
        	kreuz.add(new paper.Point(-100, -33));
        	kreuz.add(new paper.Point(-100, -66));
        	kreuz.add(new paper.Point(-66, -66));
        	kreuz.add(new paper.Point(-66, -100));

        	return kreuz;
        }

        function createHochkreuz() {
        	// Create Hochkreuz
        	var hochkreuz = new paper.Path();
        	hochkreuz.add(new paper.Point(-75, -100));
        	hochkreuz.add(new paper.Point(-65, -100));
        	hochkreuz.add(new paper.Point(-65, -70));
        	hochkreuz.add(new paper.Point(-40, -70));
        	hochkreuz.add(new paper.Point(-40, -60));
        	hochkreuz.add(new paper.Point(-65, -60));
        	hochkreuz.add(new paper.Point(-65, 0));
        	hochkreuz.add(new paper.Point(-75, 0));
        	hochkreuz.add(new paper.Point(-75, -60));
        	hochkreuz.add(new paper.Point(-100, -60));
        	hochkreuz.add(new paper.Point(-100, -70));
        	hochkreuz.add(new paper.Point(-75, -70));
        	hochkreuz.add(new paper.Point(-75, -100));

        	return hochkreuz;
        }

        function createSternAchtstrahlig() {
        	var star = new paper.Path.Star(new paper.Point(-100, -100), 8, 50, 30);

        	return star;
        }

        function createSternFuenfstrahlig() {
        	var star = new paper.Path.Star(new paper.Point(-100, -100), 5, 50, 20);

        	return star;
        }

        function createScheibe() {
        	var scheibe = new paper.Path.Circle({
					center: [-100, -100],
					radius: 50,
					fillColor: 'white'
				});
        	return scheibe;
        }

        function getFigur(figures) {
        	// check what kind of figure we want and return it as a Raster object
        	//var lionLink = "http://i.imgur.com/Ep8DBT8.png"
        	var figureName = figures.getAttribute("figure");
        	var to_rasterize = true;

        	//~ if(figureName == "Löwe" || figureName == "Löwen") {
        		//~ var raster = new paper.Raster(lionLink);
        		//~ to_rasterize = false;
        	//~ }
        	if (figureName == "Sechsberg" || figureName == "Sechsberge" || figureName == "Sechsbergen") {
        		var sechsberg = createSechsberg();
        		sechsberg.strokeColor = "black";
        		sechsberg.fillColor = colorsToCodes[figures.getAttribute("color")];
        		var raster = sechsberg;
        	}
        	else if (figureName == "Dreiberg" || figureName == "Dreiberge" || figureName == "Dreibergen") {
        		var sechsberg = createDreiberg();
        		sechsberg.strokeColor = "black";
        		sechsberg.fillColor = colorsToCodes[figures.getAttribute("color")];
        		var raster = sechsberg;
        	}
        	else if (figureName == "Kreuz" || figureName == "Kreuze" || figureName == "Kreuzen") {
        		var kreuz = createKreuz();
        		kreuz.strokeColor = "black";
        		kreuz.fillColor = colorsToCodes[figures.getAttribute("color")];
        		var raster = kreuz;
        	}
        	else if (figureName == "Hochkreuz" || figureName == "Hochkreuze" || figureName == "Hochkreuzen") {
        		var hochkreuz = createHochkreuz();
        		hochkreuz.strokeColor = "black";
        		hochkreuz.fillColor = colorsToCodes[figures.getAttribute("color")];
        		var raster = hochkreuz;
        	}
        	else if (figureName == "Stern" || figureName == "Sterne" || figureName == "Sternen") {
        		var special = figures.getAttribute("special");
        		if(special == "achtstrahlig" || special == "achtstrahlige" || special == "achtstrahligen") {
        			var star = createSternAchtstrahlig();
        			
        		}
        		else {
        			var star = createSternFuenfstrahlig();
        		}
        		star.strokeColor = "black";
    			star.fillColor = colorsToCodes[figures.getAttribute("color")];
    			var raster = star;
        	}
        	else if (figureName == "Scheibe" || figureName == "Scheiben") {
        		var scheibe = createScheibe();
        		scheibe.strokeColor = "black";
        		scheibe.fillColor = colorsToCodes[figures.getAttribute("color")];
        		var raster = scheibe;
        	}
        	else {
        		var circle = new paper.Path.Circle({
					center: [-100, -100],
					radius: 50,
					fillColor: 'white'
				});
        		circle.strokeColor = "black";
        		circle.fillColor = colorsToCodes[figures.getAttribute("color")];

        		var text = new paper.PointText({
        			point: [-150, -100],
        			content: "Platzhalter" + figureName
        		});
        		text.bounds.width = 100;
        		text.bounds.height = 20;

        		var group = new paper.Group([circle, text]);

        		var raster = group;
        	}

        	if (to_rasterize) {
        		// here we create a group of the main element and the elements which
	        	// "besetzt", "belegt" usw.
	        	var raster = drawBesetzt(raster, figures);
	        	var raster = drawBelegt(raster, figures);
        	}

        	return raster
        }

        function drawBelegt(main, figure) {
        	var belegtList = [];
        	for (var i = 0; i < figure.children.length; i++) {
        		if (figure.children[i].nodeName == "Belegt") {
        			belegtList.push(figure.children[i]);
        		}
        	}

        	if(belegtList.length < 1) {
        		return main;
        	}

        	var group = new paper.Group([main]);

        	for (var i = 0; i < belegtList.length; i++) {
        		var orientation = belegtList[i].getAttribute("orientation");
        		// We assume that all figures in this group are of the same type
        		var count = belegtList[i].children[0].children.length;
        		var belegtFGroup = belegtList[i].children[0];
        		// special orientations go here

        		// We basically simply lay the new figure over the old one
        		// We could even use the same bounds?
        		//var raster = getFigur(belegtFGroup.children[0]);
        		var raster = drawFigur(belegtFGroup.children, [0, 0], [100, 100]);
        		//raster.bounds = main.bounds;
        		raster.bounds.width = main.bounds.width*0.6;
        		raster.bounds.height = main.bounds.width*0.6;
        		raster.bounds.center = main.bounds.center;

        		group.addChild(raster);
        	}
        	return group
        }

        function drawBesetzt(main, figure) {
        	var besetztList = [];
        	for (var i = 0; i < figure.children.length; i++) {
        		if (figure.children[i].nodeName == "Besetzt") {
        			besetztList.push(figure.children[i]);
        		}
        	}

        	if(besetztList.length < 1) {
        		return main;
        	}

        	var group = new paper.Group([main]);
        	
        	for (var i = 0; i < besetztList.length; i++) {
        		var orientation = besetztList[i].getAttribute("orientation");
        		// Use the same formula like balken und pfähle to define
        		// the size of the figures
        		// We assume that all figures in this group are of the same type

        		var count = besetztList[i].children[0].children.length;
        		var besetztFigure = besetztList[i].children[0].children[0];

        		if(orientation == "unten") {
        			if(count == 1) {
        				var figureWidth = main.bounds.width/4;
        			}
        			else if(count < 5) {
        				var figureWidth = main.bounds.width/8;
        			}
        			else {
        				var figureWidth = main.bounds.width/(count*2);
        			}
        			var distance = main.bounds.width/(count+1);

        			for (var i = 1; i <= count; i++) {
        				// center position on the x axis is always i * distance
        				var raster = getFigur(besetztFigure);
        				var bottomCenter = i * distance;
        				raster.bounds.x = main.bounds.x + bottomCenter - (figureWidth/2);
        				raster.bounds.y = main.bounds.y + main.bounds.height;
        				raster.bounds.width = figureWidth;
        				raster.bounds.height = figureWidth;
        				raster.rotate(180);

        				group.addChild(raster);
        			}
        		}
        		else if(orientation == "links") {
        			if(count == 1) {
        				var figureWidth = main.bounds.height/4;
        			}
        			else if(count < 5) {
        				var figureWidth = main.bounds.height/8;
        			}
        			else {
        				var figureWidth = main.bounds.height/(count*2);
        			}
        			var distance = main.bounds.height/(count+1);

        			for (var i = 1; i <= count; i++) {
        				// center position on the x axis is always i * distance
        				var raster = getFigur(besetztFigure);
        				var innerCenter = i * distance;
        				raster.bounds.x = main.bounds.x - figureWidth;
        				raster.bounds.y = main.bounds.y + innerCenter - (figureWidth/2);
        				raster.bounds.width = figureWidth;
        				raster.bounds.height = figureWidth;
        				raster.rotate(270);

        				group.addChild(raster);
        			}
        		}
        		else if(orientation == "rechts") {
        			if(count == 1) {
        				var figureWidth = main.bounds.height/4;
        			}
        			else if(count < 5) {
        				var figureWidth = main.bounds.height/8;
        			}
        			else {
        				var figureWidth = main.bounds.height/(count*2);
        			}
        			var distance = main.bounds.height/(count+1);

        			for (var i = 1; i <= count; i++) {
        				// center position on the x axis is always i * distance
        				var raster = getFigur(besetztFigure);
        				var innerCenter = i * distance;
        				raster.bounds.x = main.bounds.x + main.bounds.width;
        				raster.bounds.y = main.bounds.y + innerCenter - (figureWidth/2);
        				raster.bounds.width = figureWidth;
        				raster.bounds.height = figureWidth;
        				raster.rotate(90);

        				group.addChild(raster);
        			}
        		}
        		else { // oben
        			if(count == 1) {
        				var figureWidth = main.bounds.width/4;
        			}
        			else if(count < 5) {
        				var figureWidth = main.bounds.width/8;
        			}
        			else {
        				var figureWidth = main.bounds.width/(count*2);
        			}
        			var distance = main.bounds.width/(count+1);

        			for (var i = 1; i <= count; i++) {
        				// center position on the x axis is always i * distance
        				var raster = getFigur(besetztFigure);
        				var bottomCenter = i * distance;
        				raster.bounds.x = main.bounds.x + bottomCenter - (figureWidth/2);
        				raster.bounds.y = main.bounds.y - figureWidth;
        				raster.bounds.width = figureWidth;
        				raster.bounds.height = figureWidth;

        				group.addChild(raster);
        			}
        		}
        	}

        	return group;
        }

        function drawFigur( figures, x, y, formation = "" ) {

        	var group = new paper.Group();

        	if(formation == "schrägbalkenweise" || formation == "schräglinksbalkenweise") {
        		if(formation == "schrägbalkenweise") {
        			var w = x;// replace x
        			var u = y;// replace y
        		}
        		else if(formation == "schräglinksbalkenweise") {
        			var w = [y[0], x[1]];
        			var u = [x[0], y[1]];
        		}
    			var a = u[0]-w[0];
        		var b = u[1]-w[1];
        		var dist = Math.sqrt(a*a + b*b);
        		// depending on the number of figures
        		var step = dist/(figures.length+1);
        		var sizeMod;
        		if(figures.length == 1) {
        			sizeMod = 0.6;
        		}
        		else if(figures.length < 3) {
        			sizeMod = 0.3;
        		}
        		else if(figures.length < 6) {
        			sizeMod = 0.2;
        		}
        		else {
        			sizeMod = 0.1;
        		}
        		for (var i = 1; i <= figures.length; i++) {
        			var raster = getFigur(figures[i-1]);
        			var new_x = u[0]-((step*i)*(u[0]-w[0]))/dist;
        			var new_y = u[1]-((step*i)*(u[1]-w[1]))/dist;
        			raster.bounds.x = x[0];
	        		raster.bounds.y = x[1];
	        		raster.bounds.width = (y[0] - x[0]) * sizeMod;
	        		raster.bounds.height = (y[1] - x[1]) * sizeMod;
	        		raster.position = new paper.Point(new_x, new_y);

	        		group.addChild(raster);
        		}
        	}
        	else {
        		if(figures.length == 1) {
	        		var raster = getFigur(figures[0]);
	        		raster.bounds.x = x[0];
	        		raster.bounds.y = x[1];
	        		raster.bounds.width = (y[0] - x[0]) * 0.6;
	        		raster.bounds.height = (y[1] - x[1]) * 0.6;
	        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/2), x[1]+(y[1]-x[1])/2);
	        	
	        		group.addChild(raster);
	        	}
	        	// for each number of figures, there is a special formation
	        	// For the instance, I will implement until 7 figures
	        	else if(figures.length == 2) {
	        		for (var i = 0; i < figures.length; i++) {
	        			var raster = getFigur(figures[i]);
		        		raster.bounds.x = x[0];
		        		raster.bounds.y = x[1];
		        		raster.bounds.width = (y[0] - x[0]) * 0.3;
		        		raster.bounds.height = (y[1] - x[1]) * 0.3;
		        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/3*(i+1)), x[1]+((y[1]-x[1])/2));
	        		
	        			group.addChild(raster);
	        		}
	        	}
	        	else if(figures.length == 3) {
	        		for (var i = 0; i < 2; i++) {
	        			var raster = getFigur(figures[i]);
		        		raster.bounds.x = x[0];
		        		raster.bounds.y = x[1];
		        		raster.bounds.width = (y[0] - x[0]) * 0.2;
		        		raster.bounds.height = (y[1] - x[1]) * 0.2;
		        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/3*(i+1)), x[1]+((y[1]-x[1])/3));
	        		
		        		group.addChild(raster);
	        		}
	        		var raster = getFigur(figures[2]);
	        		raster.bounds.x = x[0];
	        		raster.bounds.y = x[1];
	        		raster.bounds.width = (y[0] - x[0]) * 0.2;
	        		raster.bounds.height = (y[1] - x[1]) * 0.2;
	        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/2), x[1]+((y[1]-x[1])/3*2));
	        		
	        		group.addChild(raster);
	        	}
	        	else if(figures.length == 4) {
	        		for (var i = 0; i < 2; i++) {
	        			for (var j = 0; j < 2; j++) {
		        			var raster = getFigur(figures[(i*2)+j]);
			        		raster.bounds.x = x[0];
			        		raster.bounds.y = x[1];
			        		raster.bounds.width = (y[0] - x[0]) * 0.2;
			        		raster.bounds.height = (y[1] - x[1]) * 0.2;
			        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/3*(i+1)), x[1]+((y[1]-x[1])/3*(j+1)));
			        	
			        		group.addChild(raster);
			        	}
	        		}
	        	}
	        	else if(figures.length == 5) {
	        		for (var i = 0; i < 2; i++) {
	        			for (var j = 0; j < 2; j++) {
		        			var raster = getFigur(figures[(i*2)+j]);
			        		raster.bounds.x = x[0];
			        		raster.bounds.y = x[1];
			        		raster.bounds.width = (y[0] - x[0]) * 0.2;
			        		raster.bounds.height = (y[1] - x[1]) * 0.2;
			        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/3*(i+1)), x[1]+((y[1]-x[1])/4*(j+1)));
			        	
			        		group.addChild(raster);
			        	}
	        		}
	        		var raster = getFigur(figures[4]);
	        		raster.bounds.x = x[0];
	        		raster.bounds.y = x[1];
	        		raster.bounds.width = (y[0] - x[0]) * 0.2;
	        		raster.bounds.height = (y[1] - x[1]) * 0.2;
	        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/2), x[1]+((y[1]-x[1])/4*3));
	        	
	        		group.addChild(raster);
	        	}
	        	else if(figures.length == 6) {
	        		for (var i = 0; i < 3; i++) {
	        			var raster = getFigur(figures[i]);
		        		raster.bounds.x = x[0];
		        		raster.bounds.y = x[1];
		        		raster.bounds.width = (y[0] - x[0]) * 0.2;
		        		raster.bounds.height = (y[1] - x[1]) * 0.2;
		        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/4*(i+1)), x[1]+((y[1]-x[1])/4));
	        		
		        		group.addChild(raster);
	        		}
	        		for (var i = 0; i < 2; i++) {
	        			var raster = getFigur(figures[i+3]);
		        		raster.bounds.x = x[0];
		        		raster.bounds.y = x[1];
		        		raster.bounds.width = (y[0] - x[0]) * 0.2;
		        		raster.bounds.height = (y[1] - x[1]) * 0.2;
		        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/3*(i+1)), x[1]+((y[1]-x[1])/4*2));
	        		
		        		group.addChild(raster);
	        		}
	        		var raster = getFigur(figures[5]);
	        		raster.bounds.x = x[0];
	        		raster.bounds.y = x[1];
	        		raster.bounds.width = (y[0] - x[0]) * 0.2;
	        		raster.bounds.height = (y[1] - x[1]) * 0.2;
	        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/2), x[1]+((y[1]-x[1])/4*3));
	        	
	        		group.addChild(raster);
	        	}
	        	else if(figures.length == 7) {
	        		for (var i = 0; i < 3; i++) {
	        			var raster = getFigur(figures[i]);
		        		raster.bounds.x = x[0];
		        		raster.bounds.y = x[1];
		        		raster.bounds.width = (y[0] - x[0]) * 0.2;
		        		raster.bounds.height = (y[1] - x[1]) * 0.2;
		        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/4*(i+1)), x[1]+((y[1]-x[1])/4));
	        		
		        		group.addChild(raster);
	        		}
	        		for (var i = 0; i < 3; i++) {
	        			var raster = getFigur(figures[i+3]);
		        		raster.bounds.x = x[0];
		        		raster.bounds.y = x[1];
		        		raster.bounds.width = (y[0] - x[0]) * 0.2;
		        		raster.bounds.height = (y[1] - x[1]) * 0.2;
		        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/4*(i+1)), x[1]+((y[1]-x[1])/4*2));
	        		
		        		group.addChild(raster);
	        		}
	        		var raster = getFigur(figures[6]);
	        		raster.bounds.x = x[0];
	        		raster.bounds.y = x[1];
	        		raster.bounds.width = (y[0] - x[0]) * 0.2;
	        		raster.bounds.height = (y[1] - x[1]) * 0.2;
	        		raster.position = new paper.Point(x[0]+((y[0]-x[0])/2), x[1]+((y[1]-x[1])/4*3));
	        
	        		group.addChild(raster);
	        	}
        	}
        	return group;
        }
        
        function drawPfahl( figures, x, y ) {
        	// find out how many Pfähle exist
        	// 3 levels: single (Pfahl), 2-4 (schmaler Pfahl), more than 4 (Stäbe/Faden)
        	if(figures.length == 1) {
        		var pfahlLength = (y[0]-x[0])/6;
        		var rect = new paper.Rectangle(new paper.Point(((y[0]-x[0])/2)+x[0]-pfahlLength/2, x[1]), new paper.Point(((y[0]-x[0])/2)+x[0]+pfahlLength/2, y[1]));
        		var path = new paper.Path.Rectangle(rect);
        		path.strokeColor = "black";
        		path.fillColor = colorsToCodes[figures[0].getAttribute("color")];
        	}
        	else if(figures.length < 5) {
        		var pfahlLength = (y[0]-x[0])/8;
        		var pfahlSteps = (y[0]-x[0]+pfahlLength)/(figures.length+1);
        		for (var i = 0; i < figures.length; i++) {
        			var rect = new paper.Rectangle(new paper.Point((pfahlSteps * (i+1)) + x[0] - pfahlLength/2 - (pfahlLength / 2), x[1]), new paper.Point((pfahlSteps * (i+1)) + x[0] - pfahlLength/2 + (pfahlLength / 2), y[1]));
        			var path = new paper.Path.Rectangle(rect);
        			path.strokeColor = "black";
        			path.fillColor = colorsToCodes[figures[0].getAttribute("color")];
        		}
        	}
        	else {
        		var pfahlLength = (y[0]-x[0])/(figures.length*2);
        		var pfahlSteps = (y[0]-x[0]+pfahlLength)/(figures.length+1);
        		for (var i = 0; i < figures.length; i++) {
        			var rect = new paper.Rectangle(new paper.Point((pfahlSteps * (i+1)) + x[0] - pfahlLength/2 - (pfahlLength / 2), x[1]), new paper.Point((pfahlSteps * (i+1)) + x[0] - pfahlLength/2 + (pfahlLength / 2), y[1]));
        			var path = new paper.Path.Rectangle(rect);
        			path.strokeColor = "black";
        			path.fillColor = colorsToCodes[figures[0].getAttribute("color")];
        		}
        	}
        }

        function drawBalken( figures, x, y ) {
        	// Uses the same code as Pfahl only with different orientation
        	// find out how many Balken exist
        	// 3 levels: single (Balken), 2-4 (schmaler Balken), more than 4 (Balken)
        	if(figures.length == 1) {
        		var balkenLength = (y[1]-x[1])/6;
        		var rect = new paper.Rectangle(new paper.Point(x[0], ((y[1]-x[1])/2)+x[1]-balkenLength/2), new paper.Point(y[0], ((y[1]-x[1])/2)+x[1]+balkenLength/2));
        		var path = new paper.Path.Rectangle(rect);
        		path.strokeColor = "black";
        		path.fillColor = colorsToCodes[figures[0].getAttribute("color")];
        	}
        	else if(figures.length < 5) {
        		var balkenLength = (y[1]-x[1])/8;
        		var balkenSteps = (y[1]-x[1]+balkenLength)/(figures.length+1);
        		for (var i = 0; i < figures.length; i++) {
        			var rect = new paper.Rectangle(new paper.Point(x[0], (balkenSteps * (i+1)) + x[1] - balkenLength/2 - (balkenLength / 2)), new paper.Point(y[0], (balkenSteps * (i+1)) + x[1] - balkenLength/2 + (balkenLength / 2)));
        			var path = new paper.Path.Rectangle(rect);
        			path.strokeColor = "black";
        			path.fillColor = colorsToCodes[figures[0].getAttribute("color")];
        		}
        	}
        	else {
        		var balkenLength = (y[1]-x[1])/(figures.length*2);
        		var balkenSteps = (y[1]-x[1]+balkenLength)/(figures.length+1);
        		for (var i = 0; i < figures.length; i++) {
        			var rect = new paper.Rectangle(new paper.Point(x[0], (balkenSteps * (i+1)) + x[1] - balkenLength/2 - (balkenLength / 2)), new paper.Point(y[0], (balkenSteps * (i+1)) + x[1] - balkenLength/2 + (balkenLength / 2)));
        			var path = new paper.Path.Rectangle(rect);
        			path.strokeColor = "black";
        			path.fillColor = colorsToCodes[figures[0].getAttribute("color")];
        		}
        	}
        }

        function drawZwillingspfahl( figures, x, y ) {
        	// We never assume there to be more than one Zwillingspfahl in a shield
        	if(figures.length > 1) {
        		console.log("Not more than one Zwillingspfahl allowed.");
        		return;
        	}
        	var pfahlLength = (y[0]-x[0])/4;
        	var rect = new paper.Rectangle(new paper.Point(((y[0]-x[0])/2)+x[0]-pfahlLength/2, x[1]), new paper.Point(((y[0]-x[0])/2)+x[0]+pfahlLength/2, y[1]));
        	var rect1 = new paper.Rectangle(new paper.Point(rect.x, rect.y), new paper.Point(rect.x + rect.width/4, rect.y + rect.height));
        	var path = new paper.Path.Rectangle(rect1);
        	path.strokeColor = "black";
        	path.fillColor = colorsToCodes[figures[0].getAttribute("color")];
        	var rect2 = new paper.Rectangle(new paper.Point(rect.x + rect.width*0.75, rect.y), new paper.Point(rect.x + rect.width, rect.y + rect.height));
        	var path = new paper.Path.Rectangle(rect2);
        	path.strokeColor = "black";
        	path.fillColor = colorsToCodes[figures[0].getAttribute("color")];

        	drawUmschliesst(rect, figures[0], "pfahl");
        }

        function drawZwillingsbalken( figures, x, y ) {
        	// We never assume there to be more than one Zwillingspfahl in a shield
        	if(figures.length > 1) {
        		console.log("Not more than one Zwillingsbalken allowed.");
        		return;
        	}
        	var balkenLength = (y[1]-x[1])/4;
        	var rect = new paper.Rectangle(new paper.Point(x[0], ((y[1]-x[1])/2)+x[1]-balkenLength/2), new paper.Point(y[0], ((y[1]-x[1])/2)+x[1]+balkenLength/2));
        	var rect1 = new paper.Rectangle(new paper.Point(rect.x, rect.y), new paper.Point(rect.x + rect.width, rect.y + rect.height/4));
        	var path = new paper.Path.Rectangle(rect1);
        	path.strokeColor = "black";
        	path.fillColor = colorsToCodes[figures[0].getAttribute("color")];
        	var rect2 = new paper.Rectangle(new paper.Point(rect.x, rect.y + rect.height*0.75), new paper.Point(rect.x + rect.width, rect.y + rect.height));
        	var path = new paper.Path.Rectangle(rect2);
        	path.strokeColor = "black";
        	path.fillColor = colorsToCodes[figures[0].getAttribute("color")];

        	drawUmschliesst(rect, figures[0], "balken");
        }

        function drawZwillingsschraegbalken( figures, x, y ) {
        	if(figures.length > 1) {
        		console.log("Not more than one Zwillingsschraegbalken allowed.");
        		return;
        	}
        	var i = 0;
        	var div = 4;

        	var main = new paper.Path();
    		main.add(new paper.Point(x[0], x[1]));
    		main.add(new paper.Point(x[0]+(y[0]-x[0])/div, x[1]));
    		main.add(new paper.Point(y[0], x[1]+(y[1]-x[1])/div*(div-1)));
    		main.add(new paper.Point(y[0], y[1]));
    		main.add(new paper.Point(x[0]+(y[0]-x[0])/div*(div-1), y[1]));
    		main.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div));
    		main.add(new paper.Point(x[0], x[1]));

    		var balken = new paper.Path();
    		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div, x[1]));
    		balken.add(new paper.Point(y[0], x[1]+(y[1]-x[1])/div*(div-1)));
    		balken.add(new paper.Point(y[0], x[1]+(y[1]-x[1])/div*(div-0.5)));
    		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*0.5, x[1]));
    		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div, x[1]));
    		balken.strokeColor = "black";
    		balken.fillColor = colorsToCodes[figures[0].getAttribute("color")];

    		var balken = new paper.Path();
    		balken.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div));
    		balken.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div*0.5));
    		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*(div-0.5), y[1]));
    		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*(div-1), y[1]));
    		balken.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div));
    		balken.strokeColor = "black";
    		balken.fillColor = colorsToCodes[figures[0].getAttribute("color")];

        	drawUmschliesst(main, figures[0], "schraegbalken");
        }

        function drawUmschliesst( rect, figure, form ) {
        	var umschliesstList = [];
        	for (var i = 0; i < figure.children.length; i++) {
        		if (figure.children[i].nodeName == "Umschliesst") {
        			umschliesstList.push(figure.children[i]);
        		}
        	}

        	if(umschliesstList.length < 1) {
        		return;
        	}

        	for (var i = 0; i < umschliesstList.length; i++) {
        		var orientation = umschliesstList[i].getAttribute("orientation");
    			// Step 1: Get coordinates and distance of the center axis
    			var figs = umschliesstList[i].children[0].children;
    			var count = umschliesstList[i].children[0].children.length;

    			if(orientation == "in der Bruststelle" && form == "pfahl") {
    				// Only happens with Zwillingspfahl
    				drawFigur(figs, [rect.x+rect.width*0.25, rect.y+rect.height*0.25-rect.width*0.25], [rect.x+rect.width*0.75, rect.y+rect.height*0.25+rect.width*0.25]);
    			}
    			else {
    				// We have to assume multiple figures
	    			// The positioning for those is different depending if we have
	    			// a Pfahl or Balken (or Schrägbalken)
	    			if(form == "pfahl") {
	    				var a = [rect.x+rect.width/2, rect.y];
	    				var b = [rect.x+rect.width/2, rect.y+rect.height];
	    				var max = rect.width*0.4;
	    			}
	    			else if(form == "balken") {
	    				var a = [rect.x, rect.y+rect.height/2];
	    				var b = [rect.x+rect.width, rect.y+rect.height/2];
	    				var max = rect.height*0.4;
	    			}
	    			else if(form == "schraegbalken") {
	    				var a = [(rect.segments[5].point.x + rect.segments[1].point.x)/2, (rect.segments[5].point.y + rect.segments[1].point.y)/2]
        				var b = [(rect.segments[2].point.x + rect.segments[4].point.x)/2, (rect.segments[2].point.y + rect.segments[4].point.y)/2];
		        		var max = Math.sqrt(a[0]*a[0] + a[1]*a[1]) * 0.8;
	    			}
	    			else {
	    				console.log("No valid form for Umschliesst found.");
	    			}

	    			var x = a[0]-b[0];
	        		var y = a[1]-b[1];
	        		var dist = Math.sqrt(x*x + y*y);
	        		var fig = figs[0];
	        		// depending on the number of figures
	        		var step = dist/(count+1);
	        		for (var i = 1; i <= count; i++) {
	        			var new_x = a[0]-((step*i)*(a[0]-b[0]))/dist;
	        			var new_y = a[1]-((step*i)*(a[1]-b[1]))/dist;
	        			//var new_coord = [new_x, new_y];
	        			var raster = getFigur(fig);
	        			raster.bounds.x = 0;
		        		raster.bounds.y = 0;
		        		raster.bounds.width = max;
		        		raster.bounds.height = max;
		        		raster.position = new paper.Point(new_x, new_y);
        			}
    			}
    		}
        }

        function drawSchraegbalken(figures, x, y) {
        	// Create a Schrägbalken
        	// TODO: Schräglinksbalken can be achieved by grouping all elements created in this function and mirroring the whole group
        	if(figures.length % 2 == 1) {
        		if(figures.length > 4) {
        			var div = figures.length*2;
        		}
        		else {
        			var div = 6;
        		}
        		
        		// Create Mittelbalken
        		var balken = new paper.Path();
        		balken.add(new paper.Point(x[0], x[1]));
        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div, x[1]));
        		balken.add(new paper.Point(y[0], x[1]+(y[1]-x[1])/div*(div-1)));
        		balken.add(new paper.Point(y[0], y[1]));
        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*(div-1), y[1]));
        		balken.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div));
        		balken.add(new paper.Point(x[0], x[1]));
        		balken.strokeColor = "black";
        		balken.fillColor = colorsToCodes[figures[0].getAttribute("color")];

        		drawSchraegbalkenBelegung(balken, figures[0], true);
        		// Create obere Balken
        		for (var i = 0; i < (figures.length-1)/2; i++) {
        			var balken = new paper.Path();
	        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*((i+1)*3+i), x[1]));
	        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*((i+1)*3+i+2), x[1]));
	        		balken.add(new paper.Point(y[0], x[1]+(y[1]-x[1])/div*(div-((i+1)*3+i+2))));
	        		balken.add(new paper.Point(y[0], x[1]+(y[1]-x[1])/div*(div-((i+1)*3+i))));
	        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*((i+1)*3+i), x[1]));
	        		balken.strokeColor = "black";
	        		balken.fillColor = colorsToCodes[figures[0].getAttribute("color")];

	        		drawSchraegbalkenBelegung(balken, figures[0]);
        		}
        		// Create untere Balken
        		for (var i = 0; i < (figures.length-1)/2; i++) {
        			var balken = new paper.Path();
	        		balken.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div*((i+1)*3+i)));
	        		balken.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div*((i+1)*3+i+2)));
	        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*(div-((i+1)*3+i+2)), y[1]));
	        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*(div-((i+1)*3+i)), y[1]));
	        		balken.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div*((i+1)*3+i)));
	        		balken.strokeColor = "black";
	        		balken.fillColor = colorsToCodes[figures[0].getAttribute("color")];

	        		drawSchraegbalkenBelegung(balken, figures[0]);
        		}
        	}
        	else if(figures.length % 2 == 0) {
        		if(figures.length > 4) {
        			var div = figures.length*2;
        		}
        		else {
        			var div = 6;
        		}
        		// Obere Balken
        		for (var i = 0; i < figures.length/2; i++) {
        			var balken = new paper.Path();
	        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*((i+1)*3+i-2), x[1]));
	        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*((i+1)*3+i), x[1]));
	        		balken.add(new paper.Point(y[0], x[1]+(y[1]-x[1])/div*(div-((i+1)*3+i))));
	        		balken.add(new paper.Point(y[0], x[1]+(y[1]-x[1])/div*(div-((i+1)*3+i-2))));
	        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*((i+1)*3+i-2), x[1]));
	        		balken.strokeColor = "black";
	        		balken.fillColor = colorsToCodes[figures[0].getAttribute("color")];

	        		drawSchraegbalkenBelegung(balken, figures[0]);
        		}
        		// Untere Balken
        		for (var i = 0; i < figures.length/2; i++) {
        			var balken = new paper.Path();
	        		balken.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div*((i+1)*3+i-2)));
	        		balken.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div*((i+1)*3+i)));
	        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*(div-((i+1)*3+i)), y[1]));
	        		balken.add(new paper.Point(x[0]+(y[0]-x[0])/div*(div-((i+1)*3+i-2)), y[1]));
	        		balken.add(new paper.Point(x[0], x[1]+(y[1]-x[1])/div*((i+1)*3+i-2)));
	        		balken.strokeColor = "black";
	        		balken.fillColor = colorsToCodes[figures[0].getAttribute("color")];

	        		drawSchraegbalkenBelegung(balken, figures[0]);
        		}
        	}
        }

        function drawSchraegbalkenBelegung(main, figure, center = false) {
        	var belegtList = [];
        	for (var i = 0; i < figure.children.length; i++) {
        		if (figure.children[i].nodeName == "Belegt") {
        			belegtList.push(figure.children[i]);
        		}
        	}

        	if(belegtList.length < 1) {
        		return main;
        	}

        	var group = new paper.Group([main]);
        	
        	for (var i = 0; i < belegtList.length; i++) {
        		var orientation = belegtList[i].getAttribute("orientation");
    			// Step 1: Get coordinates and distance of the center axis
    			var fig = belegtList[i].children[0].children[0];
    			var count = belegtList[i].children[0].children.length;
    			//console.log(count);
    			//console.log(main.segments[0].point);
    			//console.log(main.segments[1].point);
    			if(!center) {
    				var a = [(main.segments[0].point.x + main.segments[1].point.x)/2, (main.segments[0].point.y + main.segments[1].point.y)/2]
        			//console.log(a);
        			var b = [(main.segments[2].point.x + main.segments[3].point.x)/2, (main.segments[2].point.y + main.segments[3].point.y)/2];
    			}
    			else {
    				var a = [(main.segments[5].point.x + main.segments[1].point.x)/2, (main.segments[5].point.y + main.segments[1].point.y)/2]
        			//console.log(a);
        			var b = [(main.segments[2].point.x + main.segments[4].point.x)/2, (main.segments[2].point.y + main.segments[4].point.y)/2];
    			}
        		
        		//console.log(b);
        		var x = a[0]-b[0];
        		var y = a[1]-b[1];
        		var dist = Math.sqrt(x*x + y*y);
        		// depending on the number of figures
        		var step = dist/(count+1);
        		for (var i = 1; i <= count; i++) {
        			var new_x = a[0]-((step*i)*(a[0]-b[0]))/dist;
        			var new_y = a[1]-((step*i)*(a[1]-b[1]))/dist;
        			var new_coord = [new_x, new_y];
        			var raster = getFigur(fig);
        			raster.bounds.x = 0;
	        		raster.bounds.y = 0;
        			var balkenwidth = main.segments[0].point.x - main.segments[1].point.x;
        			if(center) {
        				balkenwidth = balkenwidth * 2;
        			}
        			var balkenheight = main.segments[2].point.x - main.segments[3].point.x;
	        		balkenwidth = Math.sqrt(balkenwidth*balkenwidth);
	        		balkenheight = Math.sqrt(balkenheight*balkenheight);
	        		var max = Math.max(balkenwidth, balkenheight)
	        		raster.bounds.width = max/3;
	        		raster.bounds.height = max/3;
	        		raster.position = new paper.Point(new_x, new_y);
        		}
        	}
        	return group;
        }

        function drawKreuz(figures, x, y) {
        	// Draw a cross that spans over the whole area
        	// This is always a single cross
        	var pfahlWidth = (y[0]-x[0])/8;
        	var balkenHeight = (y[1]-x[1])/8;
        	// A cross has 12 Points, 13 Segments
        	// Point 0 is at the upper left corner!
        	var cross = new paper.Path();
        	cross.add(new paper.Point(x[0] + ((y[0]-x[0])-pfahlWidth)/2, x[1]));
        	cross.add(new paper.Point(x[0] + ((y[0]-x[0])-pfahlWidth)/2 + pfahlWidth, x[1]));
        	cross.add(new paper.Point(x[0] + ((y[0]-x[0])-pfahlWidth)/2 + pfahlWidth, x[1] + ((y[1]-x[1])-balkenHeight)/2));
        	cross.add(new paper.Point(y[0], x[1] + ((y[1]-x[1])-balkenHeight)/2));
        	cross.add(new paper.Point(y[0], x[1] + ((y[1]-x[1])-balkenHeight)/2 + balkenHeight));
        	cross.add(new paper.Point(x[0] + ((y[0]-x[0])-pfahlWidth)/2 + pfahlWidth, x[1] + ((y[1]-x[1])-balkenHeight)/2 + balkenHeight));
        	cross.add(new paper.Point(x[0] + ((y[0]-x[0])-pfahlWidth)/2 + pfahlWidth, y[1]));
        	cross.add(new paper.Point(x[0] + ((y[0]-x[0])-pfahlWidth)/2, y[1]));
        	cross.add(new paper.Point(x[0] + ((y[0]-x[0])-pfahlWidth)/2, x[1] + ((y[1]-x[1])-balkenHeight)/2 + balkenHeight));
        	cross.add(new paper.Point(x[0], x[1] + ((y[1]-x[1])-balkenHeight)/2 + balkenHeight));
        	cross.add(new paper.Point(x[0], x[1] + ((y[1]-x[1])-balkenHeight)/2));
        	cross.add(new paper.Point(x[0] + ((y[0]-x[0])-pfahlWidth)/2, x[1] + ((y[1]-x[1])-balkenHeight)/2));
        	cross.add(new paper.Point(x[0] + ((y[0]-x[0])-pfahlWidth)/2, x[1]));
        	cross.strokeColor = "black";
        	cross.fillColor = colorsToCodes[figures[0].getAttribute("color")];

        	// Draw Begleitung and Bewinklung
        	drawKreuzBewinklung(cross, figures);
        }

        function drawKreuzBewinklung(main, figures) {
        	// At the moment, we assume 4 Figure-Elements in this FGroup (Which may be not be identical) 
        	var bewinkelt = false;
        	var figure = figures[0];
        	for (var i = 0; i < figure.children.length; i++) {
        		if (figure.children[i].nodeName == "Bewinkelt") {
        			bewinkelt = figure.children[i];
        		}
        	}

        	if(bewinkelt != false) {
	        	var seg = main.segments;
	        	var upleftBounds = new paper.Rectangle(seg[0].point, seg[10].point);
	        	var uprightBounds = new paper.Rectangle(seg[1].point, seg[3].point);
	        	var downleftBounds = new paper.Rectangle(seg[7].point, seg[9].point);
	        	var downrightBounds = new paper.Rectangle(seg[4].point, seg[6].point);
	        	var boundaries = [upleftBounds, uprightBounds, downleftBounds, downrightBounds];

	        	var subfigures = bewinkelt.children[0].children;

	        	for (var i = 0; i < subfigures.length; i++) {
	        		drawFigur([subfigures[i]], [boundaries[i].topLeft.x, boundaries[i].topLeft.y], [boundaries[i].bottomRight.x, boundaries[i].bottomRight.y]);
	        	}
        	}
        }

        const colorsToCodes = {
            "silber": "white",
            "gold": "gold",
            "schwarz": "black",
            "blau": "blue",
            "rot": "red",
            "grün": "green",
            "natur": "beige",
            "verwechselt": "special"
        };
        
        function getColors ( node ) {
            // Returns an array of colorcodes
            var colors = node.getElementsByTagName("Farbe");
            var colorcodes = [];
            for (i = 0; i < colors.length; i++) {
                colorcodes.push(colorsToCodes[colors[i].getAttribute("value")])
            }
            return colorcodes
        }
        
        $("#updateBlaz").click( function()
            {
                var blaz = $("textarea#blasonierung").val();
                $.get("output", { input: blaz, }).done(
                    function(data) {
                        console.log(data);
                        startDrawing(data);
                });
            }
        );
    }
);
