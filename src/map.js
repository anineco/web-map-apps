// map.js
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

const init = [
// lat, lon, zoom, title
  [ 36.4967, 139.3318, 12 ], // 全山行記録
  [ 36.5439, 138.9261,  9 ], // 日本三百名山
  [ 36.5493, 138.9261, 10 ], // ぐんま百名山
  [ 36.7332, 139.7925, 10 ], // 栃木百名山
  [ 36.4967, 139.3318, 12 ], // 桐生地域百山
  [ 36.1019, 138.0629,  9 ], // 信州百名山
  [ 35.5747, 138.6364, 10 ], // 山梨百名山
  [ 37.4422, 140.1566,  9 ], // うつくしま百名山
  [ 36.0110, 139.0491, 11 ], // 埼玉百山
  [ 36.3690, 139.4490, 12 ], // 足利百名山
  [ 37.6869, 138.8786,  9 ], // 越後百山
  [ 36.5493, 138.9261, 10 ]  // 群馬300山
];
// カテゴリの表示順
const init_order = [ 0, 1, 2, 4, 10, 6, 7, 8, 5, 11, 9, 3 ];

const param = { lat: undefined, lon: undefined, zoom: undefined, cat: 1 };

for (const arg of location.search.slice(1).split('&')) {
  const s = arg.split('=');
  if (s[0] === 'cat') {
    param[s[0]] = Number(s[1]);
  }
}
if (param.cat < 0 || param.cat >= init.length) {
  param.cat = 1;
}
const category = init[param.cat];
const cat = localStorage.getItem('cat');
if ((param.cat >= 0 || param.cat <= 1) && param.cat === cat) {
  for (const key in param) {
    param[key] = localStorage.getItem(key);
  }
} else {
  param.lat = category[0];
  param.lon = category[1];
  param.zoom = category[2];
}

window.addEventListener('DOMContentLoaded', function () {
  document.getElementById('tb-category').selectedIndex = init_order[param.cat];
});

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

const image = new Icon({
  src: share + '952015.png',
  declutterMode: 'none'
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
    }),
    zIndex: feature.get('alt')
  });
}

const sanmei = new VectorLayer({
  source: new VectorSource({
    url: dburl + '?cat=' + param.cat + '&v=' + (param.cat > 0 ? 2 : 1),
    format: new GeoJSON()
  }),
  title: '山名',
  style: styleFunction,
  declutter: true
});

const map = new Map({
  target: 'map',
  layers: [std, pale, seamlessphoto, otm, sanmei],
  view: view,
  controls: defaults().extend([
    new ScaleLine(),
    new Control({ element: document.getElementById('toolbar') }),
    new Control({ element: document.getElementById('searchbar') }),
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

function fromDMS(dms) { // DMS -> DEG
  return (Number(dms[2]) / 60 + Number(dms[1])) / 60 + Number(dms[0]);
}

function fromDigitDMS(s) { // digit -> DMS
  return String(s).match(/^(\d+)(\d\d)(\d\d)$/).slice(1);
}

function fromDigit(s) { // digit -> DEG
  return fromDMS(fromDigitDMS(s));
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
      result.address = json.length ? json[0].name : 'unknown';
      resolve();
    })
  ));
/*****
  sources.push(new Promise((resolve) =>
    fetch(dburl + '?zu=1&lon=' + lon + '&lat=' + lat)
    .then(response => response.json())
    .then(function (json) {
      result.zumei = json.length ? json[0].name : 'unknown';
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
    tr.innerHTML = '<td>なし</td>';
    items.appendChild(tr);
    return;
  }
  for (const rec of recs) {
    const tr = document.createElement('tr'); // new row
    tr.innerHTML = '<td><a href="' + rec.link
      + '"><img src="' + (rec.image || 'image/no_image.png')
      + '" width="60" height="45"></a></td><td>' + rec.summit
      + '<br><a href="' + rec.link
      + '">' + rec.title
      + '</a>：' + rec.summary
      + '</td>';
    items.appendChild(tr);
  }
}

function openPopupId(id, centering) {
  fetch(dburl + '?rec=' + id + '&c=' + param.cat)
  .then(response => response.json())
  .then(function (json) {
    const geo = json.geo[0];
    const coordinate = fromLonLat([fromDigit(geo.lon), fromDigit(geo.lat)]);
    const html = '<h2>' + geo.name
      + '</h2><table><tbody><tr><td>よみ</td><td>' + geo.kana
      + (param.cat == 0 && geo.alias.length > 0 ?
          '</td></tr><tr><td>別名</td><td>' + geo.alias.map(
            alias => '<ruby>' + alias.name + '<rt>' + alias.kana + '</rt></ruby>'
          ).join('<br>') : '')
      + '</td></tr><tr><td>標高</td><td>' + geo.alt
      + 'm</td></tr><tr><td>緯度</td><td>' + formatDigit(geo.lat)
      + '</td></tr><tr><td>経度</td><td>' + formatDigit(geo.lon)
      + '</td></tr><tr><td>所在</td><td>' + geo.address.join('<br>')
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
    function (feature, _layer) {
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
    (feature, _layer) => feature.getGeometry().getType() === 'Point'
  );
  map.getTargetElement().style.cursor = found ? 'pointer' : '';
});

window.addEventListener('load', function (_event) {
  const img = document.createElement('img');
  img.setAttribute('src', 'lime/lime.cgi?map'); // access counter
  img.setAttribute('width', 1);
  img.setAttribute('height', 1);
  const node = document.querySelector('.navi');
  node.parentNode.insertBefore(img, node);
});

window.addEventListener('beforeunload', function (_event) {
  const lon_lat = toLonLat(view.getCenter());
  param.lon = lon_lat[0].toFixed(6);
  param.lat = lon_lat[1].toFixed(6);
  param.zoom = view.getZoom();
  for (const key in param) {
    localStorage.setItem(key, param[key]);
  }
});
// end of map.js
