export const initUpdateStatsDisplay = (rootEl) => {
  return ({ handle, inverted, wasInverted, start, xy, end, wh }) => {
    rootEl.innerHTML = `
      <div id="stats-top-row">
        <div class="stat-output" id="handle-label">
          <div id="stat-label">handle:</div>
          <div id="stat-value">${handle}</div>
        </div>
        <div class="stat-output" id="handle-inverted">
          <div id="stat-label">inverted:</div>
          <div id="stat-value">${inverted}</div>
        </div>
        <div class="stat-output" id="handle-inverted">
          <div id="stat-label">wasInverted:</div>
          <div id="stat-value">${wasInverted}</div>
        </div>
      </div>
      <div id="stats-bottom-row">
        <div class="stat-output" id="start-point">
          <div id="stat-label">start:</div>
          <div id="stat-value">${start.x}, ${start.y}</div>
        </div>
        <div class="stat-output" id="xy-point">
          <div id="stat-label">xy:</div>
          <div id="stat-value">${xy.x}, ${xy.y}</div>
        </div>
        <div class="stat-output" id="end-point">
          <div id="stat-label">end:</div>
          <div id="stat-value">${end.x}, ${end.y}</div>
        </div>
        <div class="stat-output" id="width-height-point">
          <div id="stat-label">wh:</div>
          <div id="stat-value">${wh.x}, ${wh.y}</div>
        </div>
      </div>`;
    
    return rootEl;
  }
}