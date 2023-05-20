// routemap.js
import View from 'ol/View';
import {fromLonLat, toLonLat} from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import Icon from 'ol/style/Icon';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import Style from 'ol/style/Style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Map from 'ol/Map';
import {defaults} from 'ol/control';
import ScaleLine from 'ol/control/ScaleLine';
import Control from 'ol/control/Control';
import Popup from 'ol-popup';
import {install} from 'ga-gtag';

install(process.env.GTAG1);
const share = 'share/';
const dburl = share + 'db.php';

const param = {
  lon: 138.723345, lat: 35.931243, zoom: 13,
  url: share + 'routemap.geojson'
};

for (const arg of location.search.slice(1).split('&')) {
  const s = arg.split('=');
  if (s[0] === 'url') {
    param[s[0]] = decodeURIComponent(s[1]);
  } else if (s[0] in param) {
    param[s[0]] = Number(s[1]);
  }
}

const view = new View({
  center: fromLonLat([param.lon, param.lat]),
  maxZoom: 18,
  minZoom: 5,
  constrainResolution: true,
  zoom: param.zoom
});

const attributions = [
  '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
];

const std = new TileLayer({
  source: new XYZ({
    attributions: attributions,
    url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
  }),
  title: '標準',
  type: 'base'
});

const pale = new TileLayer({
  source: new XYZ({
    attributions: attributions,
    url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'
  }),
  title: '淡色',
  type: 'base',
  visible: false
});

const seamlessphoto = new TileLayer({
  source: new XYZ({
    attributions: attributions,
    url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'
  }),
  title: '写真',
  type: 'base',
  visible: false
});

const otm = new TileLayer({
  source: new XYZ({
    attributions: [
      '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors, ',
      '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> ',
      '(<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    ],
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png'
  }),
  title: 'OTM',
  type: 'base',
  visible: false
});

const fill = new Fill({
  color: 'blue'
});
const stroke = new Stroke({
  color: 'white',
  width: 2
});
const font = '14px sans-serif';

function styleFunction(feature) {
  let style;
  const type = feature.getGeometry().getType();
  if (type === 'LineString') {
    const color = feature.get('_color').match(/^#(..)(..)(..)$/).slice(1).map(h => parseInt(h, 16));
    color[3] = feature.get('_opacity');
    style = {
      stroke: new Stroke({
        color: color,
        width: feature.get('_weight'),
        lineDash: feature.get('_dashArray')?.split(',')
      })
    };
  } else if (type === 'Point') {
    style = {
      image: new Icon({
        src: feature.get('_iconUrl'),
        size: feature.get('_iconSize'),
        anchor: feature.get('_iconAnchor'),
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels'
      }),
      text: new Text({
        text: feature.get('name'),
        font: font,
        fill: fill,
        stroke: stroke,
        textAlign: 'left',
        offsetX: 12,
        offsetY: 3
      })
    };
  }
  return new Style(style);
}

const track = new VectorLayer({
  source: new VectorSource({
    url: param.url,
    format: new GeoJSON()
  }),
  title: 'GPSデータ',
  style: styleFunction
});

const map = new Map({
  target: 'map',
  layers: [std, pale, seamlessphoto, otm, track],
  view: view,
  controls: defaults().extend([
    new ScaleLine(),
    new Control({ element: document.getElementById('toolbar') }),
    new Control({ element: document.getElementById('crosshair') })
  ])
});

function toolbarCreateZoom(target) {
  const element = document.getElementById(target);
  const zmax = view.getMaxZoom();
  const zmin = view.getMinZoom();
  for (let i = 0; i <= zmax - zmin; i++) {
    const opt = document.createElement('option');
    element.appendChild(opt).textContent = zmax - i;
  }
  element.selectedIndex = zmax - view.getZoom();
  element.addEventListener('change',
    function () {
      view.setZoom(this.options[this.selectedIndex].value);
    },
    { passive: true }
  );
  map.on('moveend', function () {
    const i = zmax - view.getZoom();
    if (element.selectedIndex != i) {
      element.selectedIndex = i;
    }
  });
}

function toolbarCreateSelector(target) {
  const element = document.getElementById(target);
  const layers = map.getLayers().getArray().filter(layer => layer.get('type') == 'base');
  for (const layer of layers) {
    const opt = document.createElement('option');
    opt.selected = layer.getVisible();
    opt.textContent = layer.get('title');
    element.appendChild(opt);
  }
  element.addEventListener('change',
    function () {
      layers.forEach((layer, index) => layer.setVisible(index == this.selectedIndex));
    },
    { passive: true }
  );
}

toolbarCreateZoom('tb-zoom');
toolbarCreateSelector('tb-base');

window.toggle = function (target) {
  const element = document.getElementById(target);
  if (element.style.display != 'none') {
    element.style.display = 'none';
  } else {
    element.style.display = 'block';
  }
};

window.switchElement = function (target, checked) {
  const element = document.getElementById(target);
  element.style.display = checked ? 'block' : 'none';
};

function toDMS(deg) { // DEG -> DMS
  const sec = parseInt(deg * 3600 + 0.5);
  return [ parseInt(sec / 3600), parseInt((sec % 3600) / 60), sec % 60 ];
}

function formatDMS(dms) {
  const m = ('0' + dms[1]).slice(-2);
  const s = ('0' + dms[2]).slice(-2);
  return dms[0] + '°' + m + '′' + s + '″';
}

function formatDEG(deg) {
  return formatDMS(toDMS(deg));
}

const popup = new Popup();
map.addOverlay(popup);

function openPopup(coordinate) {
  const lon_lat = toLonLat(coordinate);
  const lon = lon_lat[0].toFixed(6);
  const lat = lon_lat[1].toFixed(6);
  const result = {
    lon: formatDEG(lon_lat[0]),
    lat: formatDEG(lon_lat[1])
  };
  const sources = [];
  const apiurl = 'https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php';
  sources.push(new Promise((resolve) =>
    fetch(apiurl + '?outtype=JSON&lon=' + lon + '&lat=' + lat)
    .then(response => response.json())
    .then(function (json) {
      result.alt = parseInt(json.elevation + 0.5);
      resolve();
    })
  ));
  sources.push(new Promise((resolve) =>
    fetch(dburl + '?rgc=1&lon=' + lon + '&lat=' + lat)
    .then(response => response.json())
    .then(function (json) {
      result.address = json.length ? json[0].name : 'unknown';
      resolve();
    })
  ));
/*****
  sources.push(new Promise((resolve) =>
    fetch(dburl + '?zu=1&lon=' + lon + '&lat=' + lat)
    .then(response => response.json())
    .then(function (json) {
      result.zumei = json.length ? json[0].name : 'unknwon';
      resolve();
    })
  ));
*****/
  Promise.all(sources).then(() => {
    popup.show(coordinate,
      '<h2>現在地</h2><table><tbody><tr><td>標高</td><td>' + result.alt
      + 'm<tr><td>緯度</td><td>' + result.lat
      + '</td></tr><tr><td>経度</td><td>' + result.lon
      + '</td></tr><tr><td>所在</td><td>' + result.address
//    + '</td></tr><tr><td>図名</td><td>' + result.zumei
      + '</td></tr></tbody></table>'
    );
  });
}

window.openPopupCenter = () => { openPopup(view.getCenter()); };
window.switchTrack = (visible) => { track.setVisible(visible); };

map.on('click', function (evt) {
  map.forEachFeatureAtPixel(
    evt.pixel,
    function (feature, _layer) {
      const geometry = feature.getGeometry();
      if (geometry.getType() !== 'Point') {
        return false;
      }
      let html = '<h2>' + feature.get('name') + '</h2>';
      const keys = feature.getKeys().filter(
        key => key !== 'geometry' && key !== 'name' && key.charAt(0) !== '_'
      );
      if (keys.length > 0) {
        html += '<table><tbody><tr><td>' + keys.map(
          key => key + '</td><td>' + feature.get(key)
        ).join('</td></tr><tr><td>') + '</td></tr></tbody></table>';
      }
      popup.show(geometry.getCoordinates(), html);
      return true;
    }
  );
});

map.on('pointermove', function (evt) {
  if (evt.dragging) { return; }
  const found = map.forEachFeatureAtPixel(
    map.getEventPixel(evt.originalEvent),
    (feature, _layer) => feature.getGeometry().getType() === 'Point'
  );
  map.getTargetElement().style.cursor = found ? 'pointer' : '';
});

window.addEventListener('load', function (_event) {
  const img = document.createElement('img');
  img.setAttribute('src', 'lime/lime.cgi?routemap'); // access counter
  img.setAttribute('width', 1);
  img.setAttribute('height', 1);
  const node = document.querySelector('.navi');
  node.parentNode.insertBefore(img, node);
});
// end of routemap.js
