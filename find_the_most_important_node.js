


$(function(){

	var width = $(window).width(),
		height = $(window).height(),
		link_distance = 200,
		node_radius = 8,
		edge_size = 8,
		seriesSize = 10,
		seriesMin = 0,
		seriesMax = 10,
		colorRange = 10;

	//var data = genRandomData(10,0.3,seriesSize,0,10);
	//var data = sample1;
	var data = sample3;
	netClustering.cluster(data.nodes, data.links);

	var rScale = d3.scale.linear().range([2, 20]);
	rScale.domain([0, d3.max(data.nodes, function (d) { return d.value; } )]);


		//var color10 = ['#fff'].concat(colorbrewer.Reds[9]);
		var color = colorbrewer.Reds[9];
		var colorIndex = d3.scale.ordinal().rangePoints([0,8]).domain(d3.range(0,seriesMax+1));
		console.log(colorIndex);
		var svg = d3.select("body").append("svg").attr("width",width).attr("height",height);

		var force  = d3.layout.forceInABox()
					    .size([width, height])
					    .treemapSize([width-300, height-300])
					    .enableGrouping(true)
					    .linkDistance(link_distance)
					    .gravityOverall(0.001)
					    .linkStrengthInsideCluster(0.3)
					    .linkStrengthInterCluster(0.05)
					    .gravityToFoci(0.35)
					    .charge(-350);

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

			
		    
		    

		};

		var end = function(e){
			var path = svg.selectAll(".area").data(data.links).enter().append('g').attr("class","area").attr('z-index',-999)
				.each(function(d,i){

					
					var distance = Math.hypot(d.source.x-d.target.x,d.source.y-d.target.y);

					var x = d3.scale.ordinal().rangeBands([0, distance-node_radius*2-edge_size*2],0.1);
					x.domain(new Array(seriesSize).fill(0).map(function(currentValue,index,array){return index;}));

					d3.select(this).selectAll('.rect').data(d.sequence).enter().insert('rect').attr('class','rect')
						.attr('x',function(d,i){return x(i);})
						.attr('y',function(d,i){return 5;})
						.attr("width", x.rangeBand())
						.attr("height", function(d) { return 5; })
						.attr('fill',function(d,i){return color[Math.round(colorIndex(d))];})
						.attr('stroke',function(d,i){return color[Math.round(colorIndex(d))];});
				});

			
			

			var links = svg.selectAll(".link").data(data.links).enter().insert("path").attr("class","link");

			var nodes = svg.selectAll(".node").data(data.nodes).enter().append("circle","svg").attr("class","node").attr("r",node_radius).style('stroke-width',edge_size/1)
					.on('mouseover',function(d,i){
						d3.select(this).style('stroke-opacity',"0.8");
					}).on('mouseout',function(d,i){
						d3.select(this).style('stroke-opacity',"0.5");
					});

				
			var circleCenters = svg.selectAll('.circleCenter').data(data.links).enter().insert('circle').attr('class','circleCenter').attr('r',0).style('stroke-width','0px');

			var labels = svg.selectAll('.label').data(data.nodes).enter().append('text').text(function(d,i){return d.id;}).attr('class','label').style('z-index',1);
			
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

				      	var radianPadding = Math.atan2(node_radius+edge_size,dr);
				      	var degreePadding = radianPadding * 180/Math.PI;

				      	var degreeSlice = (60-degreePadding*2)/seriesSize;

				    	d3.select(this).selectAll('.rect').each(function(s,i){
				    		var w = d3.select(this).attr('width');
				    		d3.select(this).attr('x',center.x-w/2).attr('y',center.y)
				    			.attr('transform',function(){
					    			degree = -degrees+90+degreeSlice*i+degreeSlice/2+degreePadding;
					    			return 'rotate('+degree+' '+center.x+' '+center.y+') translate(0,'+-(dr+7)+')';
					    		});
				    	});
				    });

		}    

		force.stop();
		force.nodes(data.nodes)
			 .links(data.links)
			 .enableGrouping(true)
			 .on("tick", ticked)
			 .on("end",end);

		force.start();

		


	var collide = function(node) {
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
	};

	var innerLinePostion = function(d){
		var x1 = d.source.x,
			y1 = d.source.y,
			x2 = d.target.x,
			y2 = d.target.y,
			l  = Math.sqrt(Math.pow(y2-y1,2)+Math.pow(x2-x1,2));
			l_  = node_radius/1 + edge_size/1;
		var x1_ = x1 + l_*(x2-x1)/l,
			y1_ = y1 + l_*(y2-y1)/l,
			x2_ = x2 + l_*(x1-x2)/l,
			y2_ = y2 + l_*(y1-y2)/l;
		return [x1_,y1_,x2_,y2_];
	};
	
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

var genRandomData = function(nodeNum,linkChance,seriesSize,seriesMin,seriesMax){
		var data = {nodes:[],links:[]};
		for(var i=0;i<nodeNum;i++){
			data.nodes.push({id:i});
		}
		for(var i=0;i<nodeNum;i++){
			for(var j=0;j<nodeNum;j++){
				if(i<j && Math.random()<=linkChance){
					var link = {source:i,target:j,sequence:[]};
					for(var k=0;k<seriesSize;k++){
						link.sequence.push(getRandomInt(seriesMin,seriesMax));
					}
					link.value = d3.sum(link.sequence);
					data.links.push(link);
				}
			}
		}
		return data;
	};


/**
	 * Returns a random number between min (inclusive) and max (exclusive)
	 */
	var getRandomArbitrary = function(min, max) {
	    return Math.random() * (max - min) + min;
	};

	/**
	 * Returns a random integer between min (inclusive) and max (inclusive)
	 * Using Math.round() will give you a non-uniform distribution!
	 */
	var getRandomInt = function(min, max) {
	    return Math.floor(Math.random() * (max - min + 1)) + min;
	};