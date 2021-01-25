// map.js
import 'ol/ol.css';
import 'ol-popup/src/ol-popup.css';
import './map.css';
import './ol-popup-custom.css';
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
import 'whatwg-fetch'; // IE11
import 'promise-polyfill/src/polyfill'; // IE11
import gtag, {install} from 'ga-gtag';

require('dotenv').config();
install(process.env.GTAG1);
const dburl = 'share/db.php';

const init = [
  { lat: 36.4967, lon: 139.3318, zoom: 12, title: '全山行記録' },
  { lat: 36.5439, lon: 138.9261, zoom:  9, title: '日本三百名山' },
  { lat: 36.5493, lon: 138.9261, zoom: 10, title: 'ぐんま百名山' },
  { lat: 36.7332, lon: 139.7925, zoom: 10, title: '栃木百名山' },
  { lat: 36.4967, lon: 139.3318, zoom: 12, title: '桐生地域百山' },
  { lat: 36.1019, lon: 138.0629, zoom:  9, title: '信州百名山' },
  { lat: 35.5747, lon: 138.6364, zoom: 10, title: '山梨百名山' },
  { lat: 37.4422, lon: 140.1566, zoom:  9, title: 'うつくしま百名山' },
  { lat: 36.0110, lon: 139.0491, zoom: 11, title: '埼玉百山' },
  { lat: 36.3690, lon: 139.4490, zoom: 12, title: '足利百名山' }
];
const param = { lat: undefined, lon: undefined, zoom: undefined, cat: 1 };

function parseParam(arg) {
  const s = arg.split('=');
  if (s[0] in param) {
    param[s[0]] = Number(s[1]);
  }
}

document.cookie.split(/;\s*/).forEach(arg => parseParam(arg));
location.search.slice(1).split('&').forEach(arg => parseParam(arg));

if (param.cat < 0 || param.cat >= init.length) {
  param.cat = 1;
}
const category = init[param.cat];
if (param.cat > 1 || !(param.lat && param.lon && param.zoom)) {
  param.lat = category.lat;
  param.lon = category.lon;
  param.zoom = category.zoom;
}

document.getElementById('tb-title').textContent = '地図から選択 - ' + category.title;

const view = new View({
  center: fromLonLat([param.lon, param.lat]),
  maxZoom: 18,
  minZoom: 5,
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

const image = new Icon({
  src: 'share/952015.png'
});
const fill = [
  new Fill({ color: 'yellow' }),
  new Fill({ color: 'blue'   })
];
const stroke = [
  new Stroke({ width: 2, color: 'gray'  }),
  new Stroke({ width: 2, color: 'white' })
];
const font = '14px sans-serif';

function styleFunction(feature) {
  const i = feature.get('c') > 0 ? 1 : 0;
  return new Style({
    image: image,
    text: new Text({
      text: feature.get('name'),
      font: font,
      fill: fill[i],
      stroke: stroke[i],
      textAlign: 'left',
      offsetX: 12,
      offsetY: 3
    })
  });
};

const sanmei = new VectorLayer({
  source: new VectorSource({
    url: dburl + '?cat=' + param.cat + '&v=' + (param.cat > 0 ? 2 : 1),
    format: new GeoJSON()
  }),
  title: '山名',
  style: styleFunction
});

const map = new Map({
  target: 'map',
  layers: [std, pale, seamlessphoto, otm, sanmei],
  view: view,
  controls: defaults().extend([
    new ScaleLine(),
    new Control({ element: document.getElementById('toolbar') }),
    new Control({ element: document.getElementById('crosshair') }),
    new Control({ element: document.getElementById('searchbar') })
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
  element.addEventListener('change', function () {
    view.setZoom(this.options[this.selectedIndex].value);
  });
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
  layers.forEach(function (layer) {
    const opt = document.createElement('option');
    opt.selected = layer.getVisible();
    opt.textContent = layer.get('title');
    element.appendChild(opt);
  });
  element.addEventListener('change', function () {
    layers.forEach((layer, index) => layer.setVisible(index == this.selectedIndex));
  });
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

function fromDMS(dms) { // DMS -> DEG
  return (Number(dms[2]) / 60 + Number(dms[1])) / 60 + Number(dms[0]);
}

function fromDigitDMS(s) { // digit -> DMS
  return String(s).match(/^(\d+)(\d\d)(\d\d)$/).slice(1);
}

function toDigitDMS(dms) { // DMS -> Digit
  return Number(dms[0]) * 10000 + Number(dms[1]) * 10 + Number(dms[2]);
}

function fromDigit(s) { // digit -> DEG
  return fromDMS(fromDigitDMS(s));
}

function toDigit(deg) { // DEG -> digit
  return toDigitDMS(toDMS(deg));
}

function formatDMS(dms) {
  const m = ('0' + dms[1]).slice(-2);
  const s = ('0' + dms[2]).slice(-2);
  return dms[0] + '°' + m + '′' + s + '″';
}

function formatDEG(deg) {
  return formatDMS(toDMS(deg));
}

function formatDigit(s) {
  return formatDMS(fromDigitDMS(s));
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
      result.address = json.name;
      resolve();
    })
  ));
/*****
  sources.push(new Promise((resolve) =>
    fetch(dburl + '?zu=1&lon=' + lon + '&lat=' + lat)
    .then(response => response.json())
    .then(function (json) {
      result.zumei = json.maps[2].name;
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
window.switchSanmei = (visible) => { sanmei.setVisible(visible); };

const result = document.getElementById('result');
const items = document.getElementById('items');

function showRecords(recs) {
  while (items.firstChild) {
    items.removeChild(items.firstChild);
  }
  result.style.display = 'block';
  if (recs.length == 0) {
    const tr = document.createElement('tr'); // new row
    const td = document.createElement('td'); // 1st column
    td.textContent = 'なし';
    items.appendChild(tr).appendChild(td);
    return;
  }
  recs.forEach(function (rec) {
    const tr = document.createElement('tr'); // new row
    tr.addEventListener('click', () => { location.href = rec.link; });
    let td = document.createElement('td'); // 1st column
    const img = document.createElement('img');
    img.setAttribute('src', rec.image || 'image/no_image.png');
    img.setAttribute('width', 60);
    img.setAttribute('height', 45);
    tr.appendChild(td).appendChild(img);

    td = document.createElement('td'); // 2nd column
    td.innerHTML = '<span>' + rec.summit + '</span><br>' + rec.title + '：' + rec.summary;
    items.appendChild(tr).appendChild(td);
  });
}

function openPopupId(id, centering) {
  fetch(dburl + '?rec=' + id + '&c=' + param.cat)
  .then(response => response.json())
  .then(function (json) {
    const geo = json.geo[0];
    const coordinate = fromLonLat([fromDigit(geo.lon), fromDigit(geo.lat)]);
    let html = '<h2>' + geo.name
      + '</h2><table><tbody><tr><td>よみ</td><td>' + geo.kana
      + '</td></tr><tr><td>標高</td><td>' + geo.alt
      + 'm</td></tr><tr><td>緯度</td><td>' + formatDigit(geo.lat)
      + '</td></tr><tr><td>経度</td><td>' + formatDigit(geo.lon)
      + '</td></tr><tr><td>所在</td><td>' + geo.address
      + '</td></tr></tbody></table>';
    popup.show(coordinate, html);
    if (centering) {
      view.setCenter(coordinate);
    }
    showRecords(json.rec);
  });
}

map.on('click', function (evt) {
  map.forEachFeatureAtPixel(
    evt.pixel,
    function (feature, layer) {
      const geometry = feature.getGeometry();
      if (geometry.getType() !== 'Point') {
        return false;
      }
      openPopupId(feature.getId(), false);
      return true;
    }
  );
});

map.on('pointermove', function (evt) {
  if (evt.dragging) { return; }
  const found = map.forEachFeatureAtPixel(
    map.getEventPixel(evt.originalEvent),
    function (feature, layer) {
      return feature.getGeometry().getType() === 'Point';
    }
  );
  map.getTargetElement().style.cursor = found ? 'pointer' : '';
});

window.addEventListener('load', function (event) {
  const img = document.createElement('img');
  img.setAttribute('src', 'lime/lime.cgi?map'); // access counter
  img.setAttribute('width', 1);
  img.setAttribute('height', 1);
  img.style.display = 'none';
  document.body.appendChild(img);
});

window.addEventListener('beforeunload', function (event) {
  const lon_lat = toLonLat(view.getCenter());
  param.lon = lon_lat[0].toFixed(6);
  param.lat = lon_lat[1].toFixed(6);
  param.zoom = view.getZoom();
  for (let key in param) {
    document.cookie = key + '=' + param[key] + ';max-age=2592000';
  }
});
// end of map.js
