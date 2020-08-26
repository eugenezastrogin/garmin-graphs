import { h, render } from '../libs/preact.module.js';
import { useState, useEffect } from '../libs/hooks.module.js';
import htm from '../libs/htm.module.js';

// Initialize htm with Preact
const html = htm.bind(h);

function App() {
  const [useDefaultHRColors, setUseDefaultHRColors] = useState(true);
  const [useDefaultPowerColors, setUseDefaultPowerColors] = useState(true);

  const [showSuccess, setShowSuccess] = useState(null);
  const [showError, setShowError] = useState(null);

  const [overrideHR, setOverrideHR] = useState(null);
  const [overrideRunsOnly, setOverrideRunsOnly] = useState(null);
  const [overridePower, setOverridePower] = useState(null);
  const [criticalPower, setCriticalPower] = useState(null);

  const [powerZone1Color, setPowerZone1] = useState(null);
  const [powerZone2Color, setPowerZone2] = useState(null);
  const [powerZone3Color, setPowerZone3] = useState(null);
  const [powerZone4Color, setPowerZone4] = useState(null);
  const [powerZone5Color, setPowerZone5] = useState(null);

  const [hrZone1Color, setHrZone1] = useState(null);
  const [hrZone2Color, setHrZone2] = useState(null);
  const [hrZone3Color, setHrZone3] = useState(null);
  const [hrZone4Color, setHrZone4] = useState(null);
  const [hrZone5Color, setHrZone5] = useState(null);

  function handleSave() {
    browser.storage.sync
      .set({
        criticalPower,
        overrideHR,
        overridePower,
        overrideRunsOnly,
        useDefaultHRColors,
        useDefaultPowerColors,
        powerColors: [
          powerZone1Color,
          powerZone2Color,
          powerZone3Color,
          powerZone4Color,
          powerZone5Color,
        ],
        hrColors: [
          hrZone1Color,
          hrZone2Color,
          hrZone3Color,
          hrZone4Color,
          hrZone5Color,
        ],
      })
      .then(() => {
        setShowSuccess(true);
        setTimeout(function () {
          setShowSuccess(false);
        }, 1000);
      }),
      () => {
        setShowError(true);
        setTimeout(function () {
          setShowError(false);
        }, 1000);
      };
  }

  useEffect(() => {
    browser.storage.sync
      .get({
        overrideHR: true,

        overridePower: true,
        criticalPower: 260,

        overrideRunsOnly: false,

        useDefaultHRColors: true,
        hrColors: ['#e3e5e5', '#bee5f1', '#c9e7b6', '#f4e3b1', '#ecadc4'],

        useDefaultPowerColors: true,
        powerColors: ['#7ffc89', '#7fdcfe', '#ffdb7f', '#ffb57f', '#ee9e8a'],
      })
      .then(items => {
        const [pz1, pz2, pz3, pz4, pz5] = items.powerColors;
        const [hz1, hz2, hz3, hz4, hz5] = items.hrColors;
        setCriticalPower(items.criticalPower);
        setOverrideHR(items.overrideHR);
        setOverridePower(items.overridePower);
        setOverrideRunsOnly(items.overrideRunsOnly);
        setUseDefaultPowerColors(items.useDefaultPowerColors);
        setUseDefaultHRColors(items.useDefaultHRColors);

        setPowerZone1(pz1);
        setPowerZone2(pz2);
        setPowerZone3(pz3);
        setPowerZone4(pz4);
        setPowerZone5(pz5);

        setHrZone1(hz1);
        setHrZone2(hz2);
        setHrZone3(hz3);
        setHrZone4(hz4);
        setHrZone5(hz5);
      });
  }, []);

  const hrColorsBlock = html`<div
    id="hrColors"
    class="main-container colors-container"
  >
    <div>
      <label for="hrZone5">HR Zone 5 Color</label>
      <input
        type="color"
        id="hrZone5"
        name="hrZone5"
        value=${hrZone5Color}
        onChange=${e => setHrZone5(e.target.value)}
      />
    </div>

    <div>
      <label for="hrZone4">HR Zone 4 Color</label>
      <input
        type="color"
        id="hrZone4"
        name="hrZone4"
        value=${hrZone4Color}
        onChange=${e => setHrZone4(e.target.value)}
      />
    </div>

    <div>
      <label for="hrZone3">HR Zone 3 Color</label>
      <input
        type="color"
        id="hrZone3"
        name="hrZone3"
        value=${hrZone3Color}
        onChange=${e => setHrZone3(e.target.value)}
      />
    </div>

    <div>
      <label for="hrZone2">HR Zone 2 Color</label>
      <input
        type="color"
        id="hrZone2"
        name="hrZone2"
        value=${hrZone2Color}
        onChange=${e => setHrZone2(e.target.value)}
      />
    </div>

    <div>
      <label for="hrZone1">HR Zone 1 Color</label>
      <input
        type="color"
        id="hrZone1"
        name="hrZone1"
        value=${hrZone1Color}
        onChange=${e => setHrZone1(e.target.value)}
      />
    </div>
  </div> `;

  const powerColorsBlock = html`<div
    id="powerColors"
    class="main-container colors-container"
  >
    <div>
      <label for="powerZone5">Power Zone 5 Color</label>
      <input
        type="color"
        id="powerZone5"
        name="powerZone5"
        value=${powerZone5Color}
        onChange=${e => setPowerZone5(e.target.value)}
      />
    </div>

    <div>
      <label for="powerZone4">Power Zone 4 Color</label>
      <input
        type="color"
        id="powerZone4"
        name="powerZone4"
        value=${powerZone4Color}
        onChange=${e => setPowerZone4(e.target.value)}
      />
    </div>

    <div>
      <label for="powerZone3">Power Zone 3 Color</label>
      <input
        type="color"
        id="powerZone3"
        name="powerZone3"
        value=${powerZone3Color}
        onChange=${e => setPowerZone3(e.target.value)}
      />
    </div>

    <div>
      <label for="powerZone2">Power Zone 2 Color</label>
      <input
        type="color"
        id="powerZone2"
        name="powerZone2"
        value=${powerZone2Color}
        onChange=${e => setPowerZone2(e.target.value)}
      />
    </div>

    <div>
      <label for="powerZone1">Power Zone 1 Color</label>
      <input
        type="color"
        id="powerZone1"
        name="powerZone1"
        value=${powerZone1Color}
        onChange=${e => setPowerZone1(e.target.value)}
      />
    </div>
  </div>`;

  return html`<div>
    <h1>Options</h1>

    <div class="main-container">
      <div>
        <label for="overrideRunsOnly">Override non-running activities</label>
        <input
          type="checkbox"
          id="overrideRunsOnly"
          name="overrideRunsOnly"
          onChange=${e => setOverrideRunsOnly(!e.target.checked)}
          checked=${!overrideRunsOnly}
        />
      </div>

      <div class="gap"></div>

      <div>
        <label for="overrideHR">Override Heart Rate Graph</label>
        <input
          type="checkbox"
          id="overrideHR"
          name="overrideHR"
          onChange=${e => setOverrideHR(e.target.checked)}
          checked=${overrideHR}
        />
      </div>

      <div>
        <label for="useDefaultHRColors">
          Use default Heart Rate Zone Colors
        </label>
        <input
          type="checkbox"
          id="useDefaultHRColors"
          onChange=${e => setUseDefaultHRColors(e.target.checked)}
          checked=${useDefaultHRColors}
          name="useDefaultHRColors"
        />
      </div>

      ${!useDefaultHRColors && hrColorsBlock}

      <div class="gap"></div>

      <div>
        <label for="overridePower">Override Stryd Power Graph</label>
        <input
          type="checkbox"
          id="overridePower"
          name="overridePower"
          onChange=${e => setOverridePower(e.target.checked)}
          checked=${overridePower}
        />
      </div>

      <div>
        <label for="useDefaultPowerColors">Use default Power Zone Colors</label>
        <input
          type="checkbox"
          id="useDefaultPowerColors"
          name="useDefaultPowerColors"
          onChange=${e => setUseDefaultPowerColors(e.target.checked)}
          checked=${useDefaultPowerColors}
        />
      </div>

      ${!useDefaultPowerColors && powerColorsBlock}

      <div>
        <label for="criticalPower">Stryd Critical Power</label>
        <input
          type="number"
          value=${criticalPower}
          onChange=${e => setCriticalPower(e.target.value)}
        />
      </div>

      <div class="save-controls">
        <button id="save" onClick=${handleSave}>Save</button>
        ${showSuccess && html`<div id="status">Options saved!</div>`}
        ${showError &&
        html`<div id="status">Error when saving options :(</div>`}
      </div>
    </div>
  </div>`;
}

render(html`<${App} name="World" />`, document.body);
