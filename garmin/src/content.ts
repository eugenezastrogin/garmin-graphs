import { Color, Zone, Data, ActivityEntry, Zones } from './types';

const polarColors: Color[] = [
  '#ecadc4',
  '#f4e3b1',
  '#c9e7b6',
  '#bee5f1',
  '#e3e5e5',
];
const strydColors: Color[] = [
  '#dd3e17',
  '#ff6d00',
  '#ffb800',
  '#00bafd',
  '#00fa15',
];
let heartZones: Zones | null = null;
let powerZones: Zones | null = [400, 325, 282, 254, 226, 183];

function normalizeZones(zones: Zones): Zone[] {
  return zones
    .map((e, i) => [e, zones[i + 1]] as [number, number])
    .slice(0, -1);
}

function chart(data: Data, zones: Zones, colors: Color[], opacity = 1) {
  const width = 1000;
  const height = 200;
  const margin = { top: 20, right: 5, bottom: 30, left: 30 };

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
  const xAxis = (g: d3.Selection<SVGGElement, undefined, null, undefined>) =>
    g
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(10)
          .tickSizeOuter(0)
          .tickFormat(n =>
            new Date(n * 1000).toISOString().substr(11, 8).replace(/^0+:/, ''),
          ),
      )
      .call(g => g.select('.domain').remove());
  const yExtent = d3.extent(data, d => d[1]);
  const y = d3
    .scaleLinear()
    .domain(yExtent)
    .range([height - margin.bottom, margin.top]);
  const yAxis = (g: d3.Selection<SVGGElement, undefined, null, undefined>) =>
    g
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .call(g => g.select('.domain').remove());
  const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);

  normalizeZones(zones).forEach(([ceil, floor], i) => {
    svg
      .append('rect')
      .attr('x', x(0))
      .attr('y', y(ceil))
      .attr('width', x(xExtent[1]!) - x(0))
      .attr('height', y(floor) - y(ceil))
      .attr('fill', colors[i])
      .attr('opacity', opacity);
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

  return svg.node()!;
}

function getGraphRootNode(name: string): HTMLDivElement | undefined {
  const allCharts = document.querySelectorAll<HTMLDivElement>('.chart-title');
  const requestedChart = Array.from(allCharts).filter(
    el => el.innerText === name,
  );
  if (!requestedChart.length) return undefined;
  return requestedChart[0].parentElement?.parentElement?.parentElement
    ?.parentElement as HTMLDivElement;
}

function handleActivityData(message: ActivityEntry) {
  const chartsContainer = document.getElementById('charts-container');
  if (!chartsContainer) {
    console.log('No Chart Container!');
    return;
  }

  const oldHRGraph = getGraphRootNode('Heart Rate');
  if (!oldHRGraph) {
    console.log('No HR Graph!');
    return;
  }

  const newHRGraph = chart(message.heartRate, heartZones!, polarColors);
  chartsContainer.replaceChild(newHRGraph, oldHRGraph);

  if (!message.power) return;
  const oldPowerGraph = getGraphRootNode('Power');
  if (!oldPowerGraph) {
    console.log('No Power Graph!');
    return;
  }

  const newPowerGraph = chart(message.power, powerZones!, strydColors, 0.5);
  chartsContainer.replaceChild(newPowerGraph, oldPowerGraph);
}

function init() {
  browser.storage.sync
    .get({ hrZones: [190, 171, 152, 133, 114, 95] })
    .then(({ hrZones }) => {
      heartZones = hrZones as Zones;
    });

  const connection = browser.runtime.connect();
  connection.onMessage.addListener(message => {
    if (!('heartRate' in message)) return;
    handleActivityData(message as ActivityEntry);
  });
  window.addEventListener('beforeunload', () => {
    connection.postMessage({ unload: true });
  });
}

init();
