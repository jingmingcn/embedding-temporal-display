/**
Use d3 v3 version
**/



$(function(){

	console.log(document.implementation.hasFeature("http://www.w3.org/TR/SVG2/feature#GraphicsAttribute", 2.0));

	var data;
	const url = "IEEE VIS papers 1990-2014 - Main dataset.csv";

	var	preferences = {
		'link_distance': 100,
		'node_radius': 10,
		'node_edge_size': 2,
		'many_body_strength': -1,
		'toggle_label': true,
		'year_from':Number.MAX_VALUE,
		'year_to':Number.MIN_VALUE,
		'seq_min':Number.MAX_VALUE,
		'seq_max':Number.MIN_VALUE,
		'seq_size':0,
		'seq_threshold':10,
		'width':$(window).width(),
		'height':$(window).height()
	};

	var svg;
	var nodes;
	var labels;
	var links;
	var circleCenters;
	var path,path2;
	var paths;
	var area_x_scale;
	var area,area2;
	var simulation;
	var forceLink;
	var forceCenter;
	var forceManyBody;
	var templateNodes = [];
	var gravityToFoci = 0.1;
    var gravityOverall = 0.01;
	var foci = [];
	var template = "treemap";

	var rScale = d3.scale.linear().range([2, 20]);
	var yScale = d3.scale.linear().range([preferences['height']-20, 20]);
	var xScale = d3.scale.linear().domain(["a".charCodeAt(0), "z".charCodeAt(0)]).range([0, preferences['width']]);
	//var colScale = d3.schemeCategory20();
	var lOpacity = d3.scale.linear().range([0.1, 0.9]);

	var w = +preferences['width'],
		h = +preferences['height'];
	var force  = d3.layout.forceInABox()
				    .size([w, h])
				    .treemapSize([w-300, h-300])
				    .enableGrouping(true)
				    .linkDistance(preferences['link_distance'])
				    .gravityOverall(0.001)
				    .linkStrengthInsideCluster(0.3)
				    .linkStrengthInterCluster(0.05)
				    .gravityToFoci(0.35)
				    .charge(-350);

	d3.csv(url,function(error,mdata){
		if(error) throw error;

		var nodeArray = [], edges = [];
	    var nodesMap = d3.map();
	    var edgesCount = d3.map();

	    function getNodeOrCreate(t) {
	        var node;
	        if (!nodesMap.has(t)) {
	            nodesMap.set(t, {"id":t,"name":t, "value":0});
	        }
	        return nodesMap.get(t);

	    }

	    function addCount(t) {
	        var node = getNodeOrCreate(t);
	        node.value+=1;
	        nodesMap.set(t, node);
	        return node;
	    }

	    mdata.forEach(function(d){
	    	var year = d['Year'];
	    	if(year){
	    		if(preferences['year_from']>year){
	    			preferences['year_from'] = year;
	    		}
	    		if(preferences['year_to']<year){
	    			preferences['year_to'] = year;
	    		}
	    	}
	    });

	    preferences['seq_size'] = preferences['year_to'] - preferences['year_from'] + 1;

	    mdata.forEach(function(d){
	    	var author = d["Deduped author names"].split(";");
	    	var year = new Number(d['Year']);
	        author.forEach(function (t1) {
	            author.forEach(function (t2) {
	                if (t1===t2) {
	                    return;
	                }
	                addCount(t1);
	                addCount(t2);

	                var key = t1<t2 ? t1 + "|" + t2 : t2 + "|" + t1;

	                if (edgesCount.has(key)){
	                	var seq_array = edgesCount.get(key);
	                	seq_array[year - preferences['year_from']] += 1;
	                } else {
	                    edgesCount.set(key, new Array(preferences['seq_size']).fill(0));
	                }

	            });
	        });
	    });

	    edgesCount.entries().map(function(d){
	    	d.value.forEach(function(i){
	    		if(preferences['seq_min'] > i){
	    			preferences['seq_min'] = i;
	    		}
	    		if(preferences['seq_max'] < i){
	    			preferences['seq_max'] = i;
	    		}
	    	});
	    });

	    edges = edgesCount.entries().filter(function(element,index,array){
	    	var sum = 0;
	    	element.value.forEach(function(d){
	    		sum += d;
	    	});
	    	element.sum = sum;

	    	return sum >= preferences['seq_threshold'];
	    }).map(function (d)  {
	        var t1,t2;
	        t1 = d.key.split("|")[0];
	        t2 = d.key.split("|")[1];
	        var node1 = getNodeOrCreate(t1);
	        var node2 = getNodeOrCreate(t2);
	        if (nodeArray.indexOf(node1)===-1) { nodeArray.push(node1); }
	        if (nodeArray.indexOf(node2)===-1) { nodeArray.push(node2); }

	        return {
	            source:node1.value<node2.value?node1:node2,
	            target:node1.value<node2.value?node2:node1,
	            value:d.sum,
	            seq:d.value
	        };
	    });

	    data =  {"nodes":nodeArray, "links":edges};

		$.each(data.nodes,function(index_node,item_node){
			item_node.size = 0;
			$.each(data.links,function(index_link,item_link){
				if(item_link.source === index_node){
					$.each(item_link.seq,function(index,item){
						item_node.size+= item/1;
					});
				}
			});
		});

		rScale.domain([0, d3.max(data.nodes, function (d) { return d.value; } )]);
		yScale.domain([0, d3.max(data.nodes, function (d) { return d.value; } )]);
		lOpacity.domain(d3.extent(data.links, function (d) { return d.value; } ));

		app();
	});

	var app = function(){
		
		var edge = preferences['node_edge_size'];

		svg = d3.select("body").append("svg").attr("width",preferences['width']).attr("height",preferences['height']);
		
		var x = d3.scale.ordinal().rangeBands([0, preferences['link_distance']-preferences['node_radius']*2],0.01);
		x.domain(new Array(preferences['seq_size']).fill(0).map(function(currentValue,index,array){return index;}));
		var color = d3.scale.ordinal().range(colorbrewer.Reds[9]).domain([0,preferences['seq_max']]);

		path = svg.selectAll(".area").data(data.links).enter().append('g').attr("class","area")
			.each(function(d,i){
				d3.select(this).selectAll('.rect').data(d.seq).enter().insert('rect').attr('class','rect')
					.attr('x',function(d,i){return x(i);})
					.attr('y',function(d,i){return 5;})
					.attr("width", x.rangeBand())
					.attr("height", function(d) { return 5; })
					.attr('fill',function(d,i){return color(d/preferences['seq_max']);})
					.attr('stroke',function(d,i){return color(d/preferences['seq_max']);});
			});

		links = svg.selectAll(".link").data(data.links).enter().insert("path").attr("class","link");

		nodes = svg.selectAll(".node").data(data.nodes).enter().append("circle","svg").attr("class","node").attr("r",preferences['node_radius']).style('stroke-width',edge/1)
			.on('mouseover',function(d,i){
				d3.select(this).style('stroke',"blue");
			}).on('mouseout',function(d,i){
				d3.select(this).style('stroke',"white");
			});

		
		circleCenters = svg.selectAll('.circleCenter').data(data.links).enter().insert('circle').attr('class','circleCenter').attr('r',0).style('stroke-width','0px');

		

		labels = svg.selectAll('.label').data(data.nodes).enter().append('text').text(function(d,i){return d.id;}).attr('class','label').style('z-index',1);

		netClustering.cluster(data.nodes, data.links);

		force.stop();
		force
		    .nodes(data.nodes)
		    .links(data.links)
		    .enableGrouping(true)
		    .on("tick", ticked)
		    .start();

		//force.drawTreemap(svg);

		var gui = new dat.GUI();
		var layout_folder = gui.addFolder('Layout Preferences');
		layout_folder.add(preferences,'link_distance',50,200).step(10).name('Link Distance').onFinishChange(function(value){

		});
		layout_folder.add(preferences,'many_body_strength',-100,-10).step(10).name('ManyBodyStrength').onFinishChange(function(value){
			simulation.alpha(0.5).restart();
		});
		layout_folder.add(preferences,'node_radius',2,20).step(1).name('Node Radius').onFinishChange(function(value){
		
		});
		layout_folder.add(preferences,'node_edge_size',0,4).step(1).name('Stroke').onFinishChange(function(value){
		
		});

		var dataset_folder = gui.addFolder('Dataset Statistics');
		dataset_folder.add(preferences,'year_from').name('(Year) From').listen();
		dataset_folder.add(preferences,'year_to').name('(Year) To').listen();
		//dataset_folder.add(preferences,'seq_size').name('(Seq) Size').listen();
		dataset_folder.add(preferences,'seq_max').name('(Seq) Maximum').listen();
		dataset_folder.add(preferences,'seq_min').name('(Seq) Minimum').listen();
		dataset_folder.add(preferences,'seq_threshold').name('(Seq) Threshold').listen();

		layout_folder.open();
		dataset_folder.open();

	}

	
	var innerLinePostion = function(d){
		var x1 = d.source.x,
			y1 = d.source.y,
			x2 = d.target.x,
			y2 = d.target.y,
			l  = Math.sqrt(Math.pow(y2-y1,2)+Math.pow(x2-x1,2));
			l_  = preferences['node_radius']/1 + preferences['edge_size']/1;
		var x1_ = x1 + l_*(x2-x1)/l,
			y1_ = y1 + l_*(y2-y1)/l,
			x2_ = x2 + l_*(x1-x2)/l,
			y2_ = y2 + l_*(y1-y2)/l;
		return [x1_,y1_,x2_,y2_];
	};

	var ticked = function(e){

			force.onTick(e);
		

			//Collision detection
			var q = d3.geom.quadtree(data.nodes),
			  k = e.alpha * 0.1,
			  i = 0,
			  n = data.nodes.length,
			  o;

			while (++i < n) {
				o = data.nodes[i];
				// if (o.fixed) continue;
				// c = nodes[o.type];
				// o.x += (c.x - o.x) * k;
				// o.x += (xScale(o.name.charCodeAt(0)) - o.x) * k;
				// o.y += (yScale(o.value) - o.y) * k;
				q.visit(collide(o));
			}

			nodes.attr("cx", function(d) { return d.x ;})
				.attr("cy", function(d) { return d.y ;});
			labels.attr('dx',function(d){return d.x-5;}).attr('dy',function(d){return d.y+6;})
			
			links.each(function(d){
				d.center = circleCenter(d.source.x,d.source.y,d.target.x,d.target.y,60);
			});

		    links.attr("d", function(d) {
		    	var x1 = innerLinePostion(d)[0],
		    		y1 = innerLinePostion(d)[1],
		    		x2 = innerLinePostion(d)[2],
		    		y2 = innerLinePostion(d)[3];
			    var dx = d.target.x - d.source.x,
			        dy = d.target.y - d.source.y,
			        dr = Math.sqrt(dx * dx + dy * dy);
			    		    
			    return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
			  });

		    circleCenters.attr('cx',function(d){return d.center.x;})
		    	.attr('cy',function(d){return d.center.y});
		    
		    path.each(function(d,i){
		    	var dx = d.target.x - d.source.x,
			        dy = d.target.y - d.source.y,
			        dr = Math.sqrt(dx * dx + dy * dy);
			    var source = d.source;
		      	var target = d.target;
		      	var center = d.center;

		      	var radians = Math.atan2(-(source.y-center.y),(source.x-center.x));
		      	var degrees = radians * 180/Math.PI;
		    	d3.select(this).selectAll('.rect').each(function(s,i){
		    		d3.select(this).attr('x',center.x).attr('y',center.y)
		    			.attr('transform',function(){
			    			degree = -degrees+90+(60/preferences['seq_size'])*(i+1);
			    			return 'rotate('+degree+' '+center.x+' '+center.y+') translate(0,'+-(dr+7)+')';
			    		});
		    	});
		    });

	};



	$(window).resize(function(){
		var width = $(window).width();
		var height = $(window).height();
		svg.attr("width",width).attr("height",height);
		forceCenter.x(width/2);
		forceCenter.y(height/2);
		simulation.restart();
	});

	$('#nodeEdge').change(function(){
		edge = $('#nodeEdge').val();
		nodes.transition().style('stroke-width',edge);

		d3.selectAll('.path').remove();
		area_x_scale = d3.scaleLinear().range([0,linkDistance-radius*2-edge*2]).domain([0,seq_size-1]);
		area = d3.area().x(function(d,i){return area_x_scale(i);}).y0(seq_max).y1(function(d,i){return d;});
		path.insert("path").attr('class','path').datum(function(d){return d.seq;}).attr("d",area);

		ticked();
	});
	
	$('#linkDistance').change(function(){
		linkDistance = $('#linkDistance').val();
		forceLink.distance(linkDistance);

		d3.selectAll('.path').remove();
		area_x_scale = d3.scaleLinear().range([0,linkDistance-radius*2-edge*2]).domain([0,seq_size-1]);
		area = d3.area().x(function(d,i){return area_x_scale(i);}).y0(seq_max).y1(function(d,i){return d;});
		path.insert("path").attr('class','path').datum(function(d){return d.seq;}).attr("d",area);

		simulation.alpha(1).restart();
	});


	// theta is degree
	var circleCenter = function(x1,y1,x2,y2,theta){
		var radians = theta*Math.PI/180;
		//var d1 = (x2-Math.cos(radians)*x1+Math.sin(radians)*y1)/2,
		//	d2 = (y2-Math.sin(radians)*x1-Math.cos(radians)*y1)/2;

		var d1 = x2-Math.cos(radians)*x1+Math.sin(radians)*y1,
			d2 = y2-Math.sin(radians)*x1-Math.cos(radians)*y1;

		var x = (d1*(1-Math.cos(radians))-d2*Math.sin(radians))/(1-Math.cos(radians))/2,
			y = (d1-x*(1-Math.cos(radians)))/Math.sin(radians);

		return {'x':x,'y':y};
	};


	function collide(node) {
	  var r = rScale(node.value) + 16,
	      nx1 = node.x - r,
	      nx2 = node.x + r,
	      ny1 = node.y - r,
	      ny2 = node.y + r;
	  return function(quad, x1, y1, x2, y2) {
	    if (quad.point && (quad.point !== node)) {
	      var x = node.x - quad.point.x,
	          y = node.y - quad.point.y,
	          l = Math.sqrt(x * x + y * y),
	          r = rScale(node.value) + rScale(quad.point.value);
	      if (l < r) {
	        l = (l - r) / l * .5;
	        node.px += x * l;
	        node.py += y * l;
	      }
	    }
	    return x1 > nx2
	        || x2 < nx1
	        || y1 > ny2
	        || y2 < ny1;
	  };
}
	
});