function save_options() {
  const criticalPower = Number(
    (document.getElementById('criticalPower') as HTMLInputElement).value,
  );
  const overrideHR = (document.getElementById('overrideHR') as HTMLInputElement)
    .checked;
  const overridePower = (document.getElementById(
    'overridePower',
  ) as HTMLInputElement).checked;
  browser.storage.sync
    .set({
      criticalPower,
      overrideHR,
      overridePower,
    })
    .then(() => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status') as HTMLDivElement;
      status.textContent = 'Options saved.';
      setTimeout(function () {
        status.textContent = '';
      }, 1000);
    }),
    e => {
      const status = document.getElementById('status') as HTMLDivElement;
      status.textContent = `Error: ${e} when saving options`;
      setTimeout(function () {
        status.textContent = '';
      }, 1000);
    };
}

function restore_options() {
  browser.storage.sync
    .get({
      overrideHR: true,
      overridePower: true,
      criticalPower: 260,
    })
    .then(items => {
      (document.getElementById(
        'criticalPower',
      ) as HTMLInputElement).value = String(items.criticalPower);
      (document.getElementById('overrideHR') as HTMLInputElement).checked =
        items.overrideHR;
      (document.getElementById('overridePower') as HTMLInputElement).checked =
        items.overrideHR;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
(document.getElementById('save') as HTMLButtonElement).addEventListener(
  'click',
  save_options,
);
