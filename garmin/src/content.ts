import type { Color, Zone, Data, ActivityEntry, Zones } from './types';

const debug = true;

const polarColors: Color[] = [
  '#ecadc4',
  '#f4e3b1',
  '#c9e7b6',
  '#bee5f1',
  '#e3e5e5',
];
const strydColors: Color[] = [
  '#ee9e8a',
  '#ffb57f',
  '#ffdb7f',
  '#7fdcfe',
  '#7ffc89',
];
let heartZones: Zones | null = null;
let powerZones: Zones | null = null;

function log(...message: any[]) {
  if (debug) {
    console.log(...message);
  }
}

function normalizeZones(zones: Zones): Zone[] {
  return zones
    .map((e, i) => [e, zones[i + 1]] as [number, number])
    .slice(0, -1);
}

function chart(
  data: Data,
  zones: Zones,
  colors: Color[],
  scaleToData = true,
  graphName = '',
) {
  log('Generating graph...');
  const width = 1000;
  const height = 200;
  const margin = { top: 20, right: 5, bottom: 30, left: 35 };
  const yAverage = d3.mean(data, d => d[1]);

  const xExtent = d3.extent(data, d => d[0]);
  const x = d3
    .scaleLinear()
    .domain(xExtent)
    .range([margin.left, width - margin.right]);
  const xAxis = (g: d3.Selection<SVGGElement, undefined, null, undefined>) =>
    g.attr('transform', `translate(0,${height - margin.bottom})`).call(
      d3
        .axisBottom(x)
        .ticks(10)
        .tickSizeOuter(0)
        .tickFormat(n =>
          new Date(n * 1000).toISOString().substr(11, 8).replace(/^0+:/, ''),
        ),
    );
  const yExtent = scaleToData
    ? [
        // Trim downward spikes
        Math.max(
          0,
          d3.quantile(data.map(d => d[1]).sort(d3.ascending), 0.02) - 20,
        ),
        d3.max(data, d => d[1]) + 20,
      ]
    : [zones[5], zones[0]];
  const y = d3
    .scaleLinear()
    .domain(yExtent)
    .range([height - margin.bottom, margin.top]);
  const yAxis = (g: d3.Selection<SVGGElement, undefined, null, undefined>) =>
    g
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickValues([...zones].reverse()))
      .call(g =>
        g
          .append('text')
          .attr('x', 0)
          .attr('y', 10)
          .attr('fill', 'currentColor')
          .attr('text-anchor', 'start')
          .text(`${graphName} (AVG: ${Math.ceil(yAverage)})`),
      );
  const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]);

  normalizeZones(zones).forEach(([ceil, floor], i) => {
    if (floor < yExtent[0] && ceil < yExtent[0]) return;
    if (floor > yExtent[1] && ceil > yExtent[1]) return;
    const minimumY = Math.max(y(ceil), y(yExtent[1]));

    svg
      .append('rect')
      .attr('x', x(0))
      .attr('y', y(ceil))
      .attr('y', minimumY)
      .attr('width', x(xExtent[1]!) - x(0))
      .attr('height', Math.min(y(floor) - minimumY, y(yExtent[0]!) - minimumY))
      .attr('fill', colors[i]);
  });

  svg.append('g').call(xAxis);

  svg.append('g').call(yAxis);

  const line = d3
    .line()
    .curve(d3.curveStep)
    .x(d => x(d[0]))
    .y(d => y(d[1]));
  svg
    .append('line')
    .attr('x1', margin.left)
    .attr('x2', width - margin.right)
    .attr('y1', y(yAverage))
    .attr('y2', y(yAverage))
    .attr('fill', 'none')
    .attr('stroke', 'gray')
    .attr('stroke-dasharray', '10 10')
    .attr('stroke-width', 1);

  svg
    .append('path')
    .datum(data.map(([x, y]) => [x, Math.max(y, yExtent[0])]))
    .attr('fill', 'none')
    .attr('stroke', '#cc3f5e')
    .attr('stroke-width', 1.5)
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round')
    .attr('d', line);

  log('Graph generated!');
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

function getGraphRootNodeByCircleColor(
  color: string,
): HTMLDivElement | undefined {
  const allCharts = document.querySelectorAll<HTMLDivElement>(
    '.chart-color-circle',
  );
  const requestedChart = Array.from(allCharts).filter(
    el => el.style.backgroundColor === color,
  );
  if (!requestedChart.length) return undefined;
  return requestedChart[0].parentElement?.parentElement?.parentElement
    ?.parentElement as HTMLDivElement;
}

function wrapChart(
  chartsContainer: HTMLDivElement,
  oldChart: HTMLDivElement,
  newChart: SVGSVGElement,
) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.paddingTop = '20px';

  const switcher = document.createElement('button');
  switcher.style.position = 'absolute';
  switcher.style.right = '0';
  switcher.style.top = '0';
  switcher.innerText = 'Switch graph';
  switcher.style.border = '1px solid black';
  switcher.style.borderRadius = '3px';
  switcher.style.backgroundColor = 'lightgray';
  switcher.style.padding = '3px';
  switcher.style.lineHeight = '1';
  switcher.onclick = () => {
    if (oldChart.style.display === 'none') {
      oldChart.style.display = 'block';
      newChart.style.display = 'none';
    } else {
      oldChart.style.display = 'none';
      newChart.style.display = 'block';
    }
  };

  wrapper.appendChild(switcher);
  wrapper.appendChild(newChart);
  chartsContainer.replaceChild(wrapper, oldChart);
  wrapper.appendChild(oldChart);
  oldChart.style.display = 'none';
}

function handleActivityData(message: ActivityEntry) {
  function main(chartsContainer: HTMLDivElement) {
    browser.storage.sync
      .get({ overrideHR: true })
      .then(({ overrideHR }) => {
        if (!overrideHR) return;
        const oldHRGraph = getGraphRootNodeByCircleColor('rgb(255, 0, 53)');
        if (!oldHRGraph) {
          log('No HR Graph!');
          return;
        }

        const newHRGraph = chart(
          message.heartRate,
          heartZones!,
          polarColors,
          false,
          'Heart Rate',
        );
        wrapChart(chartsContainer, oldHRGraph, newHRGraph);
      })
      .catch(e => log(`Error when getting overrideHR state: ${e}`));

    browser.storage.sync
      .get({ overridePower: true })
      .then(({ overridePower }) => {
        if (!overridePower) return;
        if (!message.power) return;
        const oldPowerGraph = getGraphRootNode('Power');
        if (!oldPowerGraph) {
          log('No Power Graph!');
          return;
        }

        const newPowerGraph = chart(
          message.power,
          powerZones!,
          strydColors,
          true,
          'Power',
        );
        wrapChart(chartsContainer, oldPowerGraph, newPowerGraph);
      })
      .catch(e => log(`Error when getting overridePower state: ${e}`));
  }

  let tries = 15;
  const retryInteval = setInterval(() => {
    const chartsContainer = document.getElementById('charts-container');
    if (tries === 0) {
      clearInterval(retryInteval);
    }
    tries -= 1;

    if (chartsContainer) {
      log('Container found!');
      clearInterval(retryInteval);
      main(chartsContainer);
    } else {
      log(`No Chart Container! Retrying ${tries + 1} more times...`);
    }
  }, 1000);
}

function init() {
  browser.storage.sync
    .get({ hrZones: [190, 171, 152, 133, 114, 95] })
    .then(({ hrZones }) => {
      heartZones = hrZones as Zones;
    });
  browser.storage.sync.get('criticalPower').then(({ criticalPower }) => {
    powerZones = [
      3 * criticalPower,
      1.15 * criticalPower,
      criticalPower,
      0.9 * criticalPower,
      0.8 * criticalPower,
      0.65 * criticalPower,
    ];
  });

  const connection = browser.runtime.connect();
  connection.onMessage.addListener(message => {
    if (!('heartRate' in message)) {
      log(`Missing heartRate in message: ${message}`);
      return;
    }
    log('Message processing...');
    handleActivityData(message as ActivityEntry);
  });
  window.addEventListener('beforeunload', () => {
    connection.postMessage({ unload: true });
  });
}

init();
