function chart(data) {
  const width = 1000;
  const height = 200;
  const margin = { top: 20, right: 5, bottom: 30, left: 30 };
  const colors = ['#ecadc4', '#f4e3b1', '#c9e7b6', '#bee5f1', '#e3e5e5'];

  const zones = [
    [190, 171],
    [171, 152],
    [152, 133],
    [133, 114],
    [114, 95],
  ];

  const line = d3
    .line()
    .curve(d3.curveStep)
    .defined(d => !isNaN(d[1]))
    .x(d => x(d[0]))
    .y(d => y(d[1]));
  const xExtent = d3.extent(data, d => d[0]);
  const x = d3
    .scaleLinear()
    .domain(xExtent)
    .range([margin.left, width - margin.right]);
  const xAxis = g =>
    g
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(width / 80)
          .tickSizeOuter(0),
      )
      .call(g => g.select('.domain').remove());
  const yExtent = d3.extent(data, d => d[1]);
  const y = d3
    .scaleLinear()
    .domain(yExtent)
    .range([height - margin.bottom, margin.top]);
  const yAxis = g =>
    g
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .call(g => g.select('.domain').remove())
      .call(g =>
        g
          .select('.tick:last-of-type text')
          .clone()
          .attr('x', 3)
          .attr('text-anchor', 'start')
          .attr('font-weight', 'bold')
          .text(data.y),
      );
  const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);

  zones.forEach(([ceil, floor], i) => {
    svg
      .append('rect')
      .attr('x', x(0))
      .attr('y', y(ceil))
      .attr('width', x(xExtent[1]) - x(0))
      .attr('height', y(floor) - y(ceil))
      .attr('fill', colors[i])
      .attr('opacity', 1);
  });

  svg.append('g').call(xAxis);

  svg.append('g').call(yAxis);

  svg
    .append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#cc3f5e')
    .attr('stroke-width', 1.5)
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round')
    .attr('d', line);

  return svg.node();
}

function handleResponse(message) {
  // console.log(`Message from the background script:  ${message.data}`);
  const span = document.createElement('span');
  span.innerText = message.data;

  const oldDiv = [...document.querySelectorAll('.chart-title')].filter(
    el => el.innerText === 'Heart Rate',
  )[0].parentElement.parentElement.parentElement.parentElement;
  const root = oldDiv.parentElement;
  const graph = chart(message.data);
  root.replaceChild(graph, oldDiv);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

function notifyBackgroundPage() {
  var sending = browser.runtime.sendMessage({
    greeting: 'Greeting from the content script',
  });
  sending.then(handleResponse, handleError);
}

window.addEventListener('load', notifyBackgroundPage);
