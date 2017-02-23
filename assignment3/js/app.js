
// ======================================
// Load the datasets into a variables for each view
// ======================================
let dataset = [];
let airport = [];
let airline = [];
d3.csv('data/tsa-claims-2002-2015.csv', (data) => {
	dataset = data;
	
	aggregateData(data);
	initializeDropdowns(data);

	// make both views with all the data initially
	makeBar(airline);
	makeMap(airport);
});

// ======================================
// set up actual charts and axis
// ======================================

// constants for reuse and speed
const win = $(window);
const winWidth = win.width() - 20;
const infoBox = $('#information');

let leftMargin = {top: 20, right: 20, bottom: 40, left: 60}
let svgWidth, svgHeight, gWidth, gHeight;

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

// ratio is 360 / 620 for path
// width 835, scale 1070
// ^ magic numbers specific to the svg map
let projection = d3.geoAlbersUsa()
	.scale(svgWidth / 835 * 1070 - 2)
	.translate([svgWidth / 2, svgWidth * 360 / 620 / 2 + 30]);

let path = d3.geoPath()
	.projection(projection);

d3.json("data/us.json", function(error, us) {
	svgRight.append("path")
		.attr("class", "states")
		.datum(topojson.feature(us, us.objects.states))
		.attr("d", path);
});


// ======================================
// Once Document is ready
// ======================================
$(() => {
	$('select').on('change', () => {
		filter();
	});
});


// ======================================
// Functions (doc hierarchy does not matter)
// ======================================

let makeBar = (data) => {
	let columnName = 'avgCloseAmount';

	let x = d3.scaleBand()
		.domain(['Alaska Airlines', 'American Airlines', 'Delta Air Lines', 'Southwest Airlines', 'Virgin America'])
		.range([0, gWidth])
		.paddingInner(0.1)
		.paddingOuter(2);

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
		.transition()
		.duration(500)
		.ease(d3.easeLinear)
		.call(d3.axisLeft(y));

	let rect = gLeft.selectAll('rect')
		.data(data);

	rect.enter()
		.append('rect')
		.attr('fill', 'red')
		.attr('width', x.bandwidth())
		.attr('x', (d) => { return x(d.key); })
		.attr('height', 0)//(d) => { return gHeight - y(d.value[columnName]); })
		.attr('y', gHeight)//(d) => { return gHeight -(gHeight - y(d.value[columnName])); });
	.merge(rect)
		.transition()
		.duration(500)
		.ease(d3.easeLinear)
		.attr('height', (d) => { return gHeight - y(d.value[columnName]); })
		.attr('y', (d) => { return gHeight -(gHeight - y(d.value[columnName])); });

	rect
		.exit()
		.transition()
		.duration(500)
		.ease(d3.easeLinear)
		.attr('height', 0)
		.attr('y', gHeight)
		.remove();

	// console.log(data);
	// console.log(y(+data[0].value.closeAmount));
}

let makeMap = (data) => {
	// console.log(data);
	// console.log(data[0]);
	// console.log(projection([data[0].Longitude, data[0].Latitude]));
	svgRight.selectAll('circle')
		.data(data).enter()
		.append('circle')
		.attr('cx', (d) => { let proj = projection([d.value.longitude, d.value.latitude]); return proj != null ? proj[0] : null; })
		.attr('cy', (d) => { let proj = projection([d.value.longitude, d.value.latitude]); return proj != null ? proj[1] : null; })
		.attr('r', '5px')
		.attr('fill', 'red')
		.attr('opacity', '0.6')
		.on('mouseover', showInfo)
		.on('mouseout', hideInfo);
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
					})
			}
		})
		.entries(data);
}

let filter = () => {
	let localData = dataset;
	let claimFilter = $('#claimFilter').val();
	if (claimFilter != 'none')
		localData = localData.filter((d) => { return d.claimType == claimFilter; });
	let dispositionFilter = $('#dispositionFilter').val();
	if (dispositionFilter != 'all')
		localData = localData.filter((d) => { return d.disposition == dispositionFilter; });
	aggregateData(localData);
	console.log(airline);
	makeBar(airline);
	makeMap(airport);
}

let initializeDropdowns = (data) => {
	d3.select('#claimFilter').selectAll('option')
    	.data(d3.map(data, (d) => { return d.claimType != '' ? d.claimType : 'Unknown'; }).keys())
    	.enter()
    	.append('option')
    	.text((d) => { return d; })
    	.attr('value', (d) => { return d; })
    	.style('display', (d) => { return ['Bus Terminal', 'Unknown'].indexOf(d) != -1 ? 'none' : null; });

    d3.select('#dispositionFilter').selectAll('option')
    	.data(d3.map(data, (d) => { return d.disposition != '' ? d.disposition : 'Unknown'; }).keys())
    	.enter()
    	.append('option')
    	.text((d) => { return d; })
    	.attr('value', (d) => { return d; })
    	.style('display', (d) => { return ['Unknown', 'Pending response from claimant'].indexOf(d) != -1 ? 'none' : null; });
}

let showInfo = (datum) => {
	infoBox.find('.airportName').html(datum.key);
	infoBox.find('.airportAmount').html('$' + Math.round(+datum.value.avgCloseAmount));
	infoBox.find('.airportLocation').html(datum.value.longitude + '&deg; N, ' + datum.value.latitude + '&deg; E');

	infoBox.css('display', 'block');
}

let hideInfo = () => {
	infoBox.css('display', 'none');
}
