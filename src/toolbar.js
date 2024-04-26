// toolbar.js
import Control from 'ol/control/Control';
import {toLonLat} from 'ol/proj';
import {formatDEG} from './transangle.js';

const share = process.env.VITE_SHARE;
const passive = { passive: true };

export default class Toolbar extends Control {
  constructor(options = {}) {
    const element = options.element;
    super({ element });
    this.container = element;
    this.container.className = 'ol-toolbar ol-unselectable';
  }

  setMap(map) {
    super.setMap(map);
    this.map = map;
  }

  setPopup(popup) {
    this.popup = popup;
  }

  // 中心座標
  openPopup(coordinate) {
    const lon_lat = toLonLat(coordinate);
    const lon = lon_lat[0].toFixed(6);
    const lat = lon_lat[1].toFixed(6);
    const geo = {
      x: formatDEG(lon_lat[0]),
      y: formatDEG(lon_lat[1])
    };
    const sources = [];
    sources.push(new Promise(resolve =>
      fetch('https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?outtype=JSON&lon=' + lon + '&lat=' + lat)
      .then(response => response.json())
      .then(json => {
        geo.alt = typeof json.elevation === 'number' ? Math.round(json.elevation + 0.5) : -9999;
        resolve();
      })
    ));
    sources.push(new Promise(resolve =>
      fetch(share + 'db.php?rgc=1&lon=' + lon + '&lat=' + lat)
      .then(response => response.json())
      .then(json => {
        geo.address = json.length > 0 ? json.map(a => a.name) : ['-----'];
        resolve();
      })
    ));
    Promise.all(sources).then(() => {
      this.popup.show(coordinate,
        '<h2>現在地</h2><table><tbody><tr><td>標高</td><td>' + geo.alt
        + 'm<tr><td>緯度</td><td>' + geo.y
        + '</td></tr><tr><td>経度</td><td>' + geo.x
        + '</td></tr><tr><td>所在</td><td>' + geo.address.join('<br>')
        + '</td></tr></tbody></table>'
      );
    });
  }

  openPopupName(coordinate, geo) {
    this.popup.show(coordinate,
      '<h2>' + geo.name
      + '</h2><table><tbody><tr><td>よみ</td><td>' + geo.kana
      + (geo.alias.length > 0 ?
          '</td></tr><tr><td>別名</td><td>' + geo.alias.map(
            alias => '<ruby>' + alias.name + '<rt>' + alias.kana + '</rt></ruby>'
          ).join('<br>') : '')
      + '</td></tr><tr><td>標高</td><td>' + geo.alt
      + 'm</td></tr><tr><td>緯度</td><td>' + geo.y
      + '</td></tr><tr><td>経度</td><td>' + geo.x
      + (geo.address.length > 0 ?
        '</td></tr><tr><td>所在</td><td>' + geo.address.join('<br>') : '')
      + '</td></tr><tr><td>ID</td><td>' + geo.id
      + '</td></tr></tbody></table>'
    );
  }

  closePopup() {
    this.popup.hide();
  }

  setToggleButton(id, target) {
    const element = document.getElementById(id);
    element.addEventListener('click', _event => {
      target.style.display = target.style.display == 'none' ? 'block' : 'none';
    }, passive);
  }

  setCenterButton(id) {
    const element = document.getElementById(id);
    element.addEventListener('click', _event => {
      this.openPopup(this.map.getView().getCenter());
    }, passive);
  }

  setBaseSelect(id) {
    const element = document.getElementById(id);
    const layers = this.map.getLayers().getArray().filter(layer => layer.get('type') == 'base');
    let index = 0;
    layers.forEach((layer, i) => {
      const v = layer.getVisible();
      if (v) { index = i; }
      element.appendChild(new Option(layer.get('title'), v, v));
    });
    element.selectedIndex = index;
    element.addEventListener('change', _event => {
      layers.forEach((layer, i) => layer.setVisible(i == element.selectedIndex));
    }, passive);
  }

  setZoomSelect(id, handler) {
    const element = document.getElementById(id);
    const view = this.map.getView();
    const zmax = view.getMaxZoom();
    const zmin = view.getMinZoom();

    for (let z = zmax; z >= zmin; z--) {
      element.appendChild(new Option(z));
    }
    element.selectedIndex = zmax - view.getZoom();

    element.addEventListener('change', _event => {
      const zoom = element.options[element.selectedIndex].value;
      handler(zoom);
    }, passive);

    this.map.on('moveend', _event => {
      const zoom = view.getZoom();
      const i = zmax - zoom;
      if (element.selectedIndex != i) {
        element.selectedIndex = i;
        element.dispatchEvent(new Event('change'));
      }
    }, passive);
  }

  setCreditButton(id, url) {
    const element = document.getElementById(id);
    element.addEventListener('click', _event => {
      window.open(url);
    }, passive);
  }

  setLayerCheckbox(id, layer) {
    const element = document.getElementById(id);
    element.addEventListener('change', _event => {
      layer.setVisible(element.checked);
    }, passive);
  }

  setControlCheckbox(id, control) {
    const element = document.getElementById(id);
    element.addEventListener('change', _event => {
      element.checked ? control.show() : control.hide();
    }, passive);
  }
}
// __END__
