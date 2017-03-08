
// ======================================
// Load the datasets into a variables for each view
// ======================================
let dataset = [];
let airport = [];
let airline = [];

// ======================================
// set up actual charts and axis
// ======================================

// constants for reuse and speed
const win = $(window);
const winWidth = win.width() - 20;
const infoBox = $('#information');
infoBox.css('display', 'none');
const transDur = 500;

let leftMargin = {top: 20, right: 20, bottom: 40, left: 60}
let svgWidth, svgHeight, gWidth, gHeight;
let projection, path, legend;

let body = d3.select('body')
	.style('margin', '0px');

let masterWrapper = d3.select('#master-wrapper');

let svgLeft = masterWrapper.insert('div', ':first-child')
	.attr('class', 'svg-wrapper')
	.append('svg')
	.attr('class', 'svg-left');

let gLeft = svgLeft.append('g')
	.attr('transform', 'translate(' + leftMargin.left + ', ' + leftMargin.top + ')');

svgWidth = svgLeft.node().clientWidth;
svgHeight = svgLeft.node().clientHeight;
gWidth = svgWidth - leftMargin.left - leftMargin.right;
gHeight = svgHeight - leftMargin.top - leftMargin.bottom;

let svgRight = masterWrapper.append('div')
	.attr('class', 'svg-wrapper')
	.append('svg');


// ======================================
// Functions (doc hierarchy does not matter)
// ======================================

let makeBar = (dataset) => {
	let columnName = 'avgCloseAmount';
	let data = dataset || [{'key': 'none', 'value': {'avgCloseAmount': 0}}];
	let trans = d3.transition()
		.duration(500)
		.ease(d3.easeLinear);

	let x = d3.scaleBand()
		.domain(['Alaska Airlines', 'American Airlines', 'Delta Air Lines', 'Southwest Airlines', 'Virgin America'])
		.range([0, gWidth])
		.paddingInner(0.2)
		.paddingOuter(1);

	data = data.filter((d) => { return x(d.key) != undefined; });

	let y = d3.scaleLinear()
		.domain([0 /*d3.min(data, (d) => {return parseInt(d.value.closeAmount);})*/, d3.max(data, (d) => {return parseInt(d.value[columnName]);})])
		.range([gHeight, 0]);

	let xAxis = svgLeft.select('g.xAxis');
	if(xAxis.empty()) {
		xAxis = svgLeft
			.append('g')
			.attr('class', 'xAxis')
			.attr('transform', 'translate(' + leftMargin.left + ', ' + (svgHeight - leftMargin.bottom) + ')');
	}
	xAxis.call(d3.axisBottom(x));

	svgLeft.select('g.xAxis').selectAll('text')
		.attr('font-size', '11pt');

	let yAxis = svgLeft.select('g.yAxis');
	if(yAxis.empty()) {
		yAxis = svgLeft
			.append('g')
			.attr('class', 'yAxis')
			.attr('transform', 'translate(' + leftMargin.left + ', ' + leftMargin.top + ')');
			
		yAxis.append('text')
			.attr('transform', 'rotate(-90)')
			.attr('fill', '#000')
			.attr('font-size', '10pt')
			.attr('dy', '1.5em')
			.text('Average Cost to Close ($)');
	}
	yAxis
		.transition(trans)
		.call(d3.axisLeft(y));

	let rect = gLeft.selectAll('rect')
		.data(data);

	rect.enter()
		.append('rect')
		.attr('fill', '#ca0020')
		.attr('width', x.bandwidth())
		.attr('x', (d) => { return x(d.key); })
		.attr('height', 0)//(d) => { return gHeight - y(d.value[columnName]); })
		.attr('y', gHeight)//(d) => { return gHeight -(gHeight - y(d.value[columnName])); });
	.merge(rect)
		.on('mouseover', showBarInfo)
		.on('mouseout', hideInfo)
		.transition(trans)
		.attr('height', (d) => { return gHeight - y(d.value[columnName]); })
		.attr('y', (d) => { return gHeight -(gHeight - y(d.value[columnName])); });

	rect
		.exit()
		.transition(trans)
		.attr('height', 0)
		.attr('y', gHeight)
		.remove();
}

let makeMapProjection = () => {
	// ratio is 360 / 620 for path
	// width 835, scale 1070
	// ^ magic numbers specific to the svg map
	projection = d3.geoAlbersUsa()
		.scale(svgWidth / 835 * 1070 - 2)
		.translate([svgWidth / 2, svgWidth * 360 / 620 / 2 + 30]);

	path = d3.geoPath()
		.projection(projection);

	d3.json("data/us.json", function(error, us) {
		svgRight.append("path")
			.attr("class", "states")
			.datum(topojson.feature(us, us.objects.states))
			.attr("d", path);
	});

	legend = svgRight.append('g')
		.attr('class', 'legend');
}

let makeMap = (data) => {
	// let mean = d3.mean(data, (d) => { return +d.value.avgCloseAmount; });
	// let std = d3.deviation(data, (d) => { return +d.value.avgCloseAmount; });

	// let minmax = [0, d3.max(data, (d) => { return +d.value.avgCloseAmount; })];

	// let domainArr = equalInterval(minmax[0], minmax[1], 5, 500);

	let quan = d3.scaleQuantile()
		.domain(data.map((d) => { return +d.value.avgCloseAmount; }))
		.range(['#0571b0', '#92c5de', '#f7f7f7', '#f4a582', '#ca0020']);

	let colorDomain = prettyDomain(quan.quantiles());
	for (let i = colorDomain.length - 1; i >= 0; i--) {
		if (colorDomain.indexOf(colorDomain[i]) !== i || colorDomain[i] === 0) {
			colorDomain.splice(i, 1);
		}
	}

	let colorRange = quan.range();
	if (colorRange.length - colorDomain.length > 1) {
		switch(colorRange.length - colorDomain.length) {
			case 2:
				colorRange.splice(0, 1);
				break;
			case 3:
				colorRange.splice(0, 1);
				colorRange.splice(colorRange.length - 1, 1);
				break;
			case 4:
				colorRange.splice(0, 2);
				colorRange.splice(colorRange.length - 1, 1);
				break;
			case 5:
				colorRange.splice(0, 2);
				colorRange.splice(colorRange.length - 2, 2);
				break;
		}
	}

	if (data.length == 0) {
		colorDomain = [];
		// colorRange = [quan.range()[Math.ceil(quan.range().length / 2 - 1)]];
		colorRange = [];
	}

	let color = d3.scaleThreshold()
		.domain(colorDomain)
		.range(colorRange);

	let circle = svgRight.selectAll('circle')
		.data(data);

	let duration = 250;

	let trans = d3.transition()
		.duration(duration)
		.ease(d3.easeLinear);

	circle.enter()
		.append('circle')
		.attr('opacity', '0.8')
	.merge(circle)
		.on('mouseover', showInfo)
		.on('mouseout', hideInfo)
		.transition(trans)
		.attr('r', 0)
		.transition()
		.duration(0)
		.attr('cx', (d) => { let proj = projection([d.value.longitude, d.value.latitude]); return proj != null ? proj[0] : null; })
		.attr('cy', (d) => { let proj = projection([d.value.longitude, d.value.latitude]); return proj != null ? proj[1] : null; })
		.attr('fill', (d) => { return color(+d.value.avgCloseAmount); })
		.transition()
		.duration(duration)
		.attr('r', 5);

	circle
		.exit()
		.transition(trans)
		.attr('r', 0)
		.remove();

	let colors = color.range();
	let threshes = color.domain();
	let rectInfo = { width: 30, height: 30 };

	if (data.length == 0)
		threshes = ['none'];

	let group = svgRight.select('g.legend')
		.attr('transform', 'translate(' + (svgWidth - (/*colors.length*/5 * rectInfo.width * 1.85)) + ', 0)');

	let desc = ['Average Amount to Close:'];

	let descText = group
		.selectAll('text')
		.data(desc);
	descText
		.enter()
		.append('text')
		.attr('class', 'descTitle')
		.merge(descText)
		.attr('x', 0)
		.attr('y', -20)
		.attr('dy', 14)
		.text((d, i) => { return desc[i]; });

	let legendRect = group
		.selectAll('rect')
		.data(colors);

	legendRect.exit().remove();

	legendRect
		.enter()
		.append('rect')
		.merge(legendRect)
		.attr('x', (d, i) => { return i * rectInfo.width + i * 10; })
		.attr('y', 	0)
		.attr('fill', (d, i) => { return colors[i]; })
		.attr('width', rectInfo.width)
		.attr('height', rectInfo.height);

	let legendText = group
		.selectAll('text.legendText')
		.data(threshes);

	legendText.exit().remove();

	legendText
		.enter()
		.append('text')
		.attr('class', 'legendText')
		.merge(legendText)
		.attr('x', (d, i) => { return (i + 1) * rectInfo.width - 10 + i * 10; })
		.attr('y', (d) => { return rectInfo.height; })
		.attr('dy', 14)
		.text((d, i) => { return threshes[i]; });
}

let aggregateData = (data) => {
	// aggregate data by airport
	airport = d3.nest()
		.key((d) => { return d.airportName; })
		.rollup((leaves) => {
			return {
				'closeAmount': d3.sum(leaves, (d) => {
						return +d.closeAmount;
					}),
				'avgCloseAmount': d3.mean(leaves, (d) => {
						return +d.closeAmount;
					}),
				'longitude': leaves[0].longitude,
				'latitude': leaves[0].latitude
			}
		})
		.entries(data);

	// aggregate data by airline
	airline = d3.nest()
		.key((d) => { return d.airlineName; })
		.rollup((leaves) => {
			return {
				'closeAmount': d3.sum(leaves, (d) => {
						return +d.closeAmount;
					}),
				'avgCloseAmount': d3.mean(leaves, (d) => {
						return +d.closeAmount;
					}),
				'maxAmount': d3.max(leaves, (d) => {
						return +d.closeAmount;
					}),
				'minAmount': d3.min(leaves, (d) => {
						return +d.closeAmount;
					})
			}
		})
		.entries(data);
}

let filter = () => {

	let localData = dataset;

	let claimFilter = $('#claimFilter').val();
	if (claimFilter != 'all')
		localData = localData.filter((d) => { return d.claimType == claimFilter; });
	let dispositionFilter = $('#dispositionFilter').val();
	if (dispositionFilter != 'all')
		localData = localData.filter((d) => { return d.disposition == dispositionFilter; });
	let itemFilter = $('#itemFilter').val();
	if (itemFilter != 'all')
		localData = localData.filter((d) => { return d.itemCategory.indexOf(itemFilter) != -1; });
	let dateFilter = [$('#yearSlider').slider( "values", 0), $('#yearSlider').slider( "values", 1)];
	localData = localData.filter((d) => { let date = new Date(d.incidentDate).getTime(); return date >= dateFilter[0] && date <= dateFilter[1] });

	aggregateData(localData);
	makeBar(airline);
	makeMap(airport);
}

let initializeDropdowns = (data) => {
	d3.select('#claimFilter').selectAll('option')
    	.data(d3.map(data, (d) => { return d.claimType; }).keys())
    	.enter()
    	.append('option')
    	.text((d) => { return d; })
    	.attr('value', (d) => { return d; })
    	.style('display', (d) => { return ['', 'Bus Terminal'].indexOf(d) != -1 ? 'none' : null; });

    d3.select('#dispositionFilter').selectAll('option')
    	.data(d3.map(data, (d) => { return d.disposition; }).keys())
    	.enter()
    	.append('option')
    	.text((d) => { return d; })
    	.attr('value', (d) => { return d; })
    	.style('display', (d) => { return ['', 'Pending response from claimant'].indexOf(d) != -1 ? 'none' : null; });

    let itemTags = d3.map(data, (d) => { return d.itemCategory; });//.keys();
    let itemSet = new Set();
    for (let tags in itemTags) {
    	let tag = tags.substring(tags.indexOf('$') == -1 ? tags.indexOf(' ') : tags.indexOf('$') + 1, tags.indexOf(' '));
    	itemSet.add(tag.trim());
    }
    let itemArray = [];
    itemSet.forEach((tag) => {
    	if (tag.indexOf(';') == -1 && tag.indexOf(',') == -1 && tag.indexOf('$') == -1 && tag != '')
    		itemArray.push(tag);
    });

    d3.select('#itemFilter').selectAll('option')
    	.data(itemArray)
    	.enter()
    	.append('option')
    	.text((d) => { return d; })
    	.attr('value', (d) => { return d; });
}

let showBarInfo = (datum) => {
	let divs = infoBox.find('div');
	console.log(datum);
	divs.eq(0).html('Avg: $' + Math.round(datum.value.avgCloseAmount));
	divs.eq(1).html('Sum: $' + Math.round(datum.value.closeAmount));
	divs.eq(2).html('Max: $' + Math.round(datum.value.maxAmount));
	divs.eq(3).html('Min: $' + Math.round(datum.value.minAmount));

	infoBox.css('display', 'block');
}

let showInfo = (datum) => {
	let divs = infoBox.find('div');
	divs.eq(0).html(datum.key);
	divs.eq(1).html('Avg: $' + Math.round(+datum.value.avgCloseAmount));
	divs.eq(2).html('Lat: ' + datum.value.latitude + '&deg; E');
	divs.eq(3).html('Lng: ' + datum.value.longitude + '&deg; N');

	infoBox.css('display', 'block');
}

let hideInfo = (datum) => {
	infoBox.css('display', 'none');
}

let loadData = () => {
	d3.csv('data/tsa-claims-2002-2015.csv', (data) => {
		dataset = data;

		initializeDropdowns(data);

		let min = d3.min(data, (d) => { return new Date(d.incidentDate).getTime(); });
		min = new Date('1/8/2002').getTime();
		let max = d3.max(data, (d) => { return new Date(d.incidentDate).getTime(); });

		$('#yearSlider').slider({
			range: true,
			min: min,
			max: max,
			values: [ min, max ],
			slide: function( event, ui ) {
				$( "#amount" ).val( new Date(ui.values[ 0 ]).toISOString().split('T')[0] +
				 " —— " + new Date(ui.values[ 1 ]).toISOString().split('T')[0] );
			},
			stop: (event, ui) => {
				filter();
			}
		});
		$( "#amount" ).val( new Date(min).toISOString().split('T')[0] + " —— " + new Date(max).toISOString().split('T')[0] );

		filter();
	});
}

let prettyDomain = (dom) => {
	for (let i = 0; i < dom.length; i++) {
		dom[i] = Math.round(dom[i]) + '';
	}

	let magDiff = dom[dom.length - 1].length - dom[0].length;

	for (let i = 0; i < dom.length; i++) {
		let moveDiff = magDiff - (dom[dom.length - 1].length - dom[i].length);
		let tempStr = dom[i].split('');
		tempStr.splice(moveDiff, 0, '.');
		tempStr = tempStr.join('');
		let left = parseInt(tempStr.substring(0, tempStr.indexOf('.'))) || 0;
		let right = parseFloat(tempStr.substring(tempStr.indexOf('.'), tempStr.length));
		if (right < 0.25)
			right = 0;
		else if (right > 0.75) {
			right = 0;
			left++;
		} else
			right = 0.5;

		dom[i] =  (left + right) * Math.pow(10, tempStr.length - 1 - moveDiff);
	}
	return dom;
}

// ======================================
// Once Document is ready
// ======================================
$(() => {
	$('select').on('change', () => {
		filter();
	});
	makeMapProjection();
	makeBar();
	loadData();
});