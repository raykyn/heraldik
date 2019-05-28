$(document).ready(
	    function(){
	    	console.log("hello world");
		var viewer = OpenSeadragon({
			        id: "openseadragon1",
			    });
		viewer.open(["http://104.248.136.9:5004/U-17_0061_01_r.jp2/info.json"]);
	    }
);
