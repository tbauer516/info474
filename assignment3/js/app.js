
// Load the dataset into a variable
let dataset;
d3.csv('../data/tsa-claims-2002-2015.csv', (data) => {
	dataset = data;
});

// set up actual charts and axis
const win = $(window);
const winWidth = win.width() - 20;

let body = d3.select('body')
	.style('margin', '0px');

let svgLeft = body.append('svg')
	.attr('class', 'svg-left');
let svgRight = body.append('svg')
	.attr('class', 'svg-right');
