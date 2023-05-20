// mountain.js
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

install(process.env.GTAG2);
const share = 'share/';
const dburl = share + 'db.php';

const param = { lon: 138.727412, lat: 35.360601, zoom: 12 };

for (const key in param) {
  param[key] = localStorage.getItem(key) ?? param[key];
}
for (const arg of location.search.slice(1).split('&')) {
  const s = arg.split('=');
  if (s[0] in param) {
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

const image = new Icon({
  src: share + '952015.png',
  declutterMode: 'none'
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
  return new Style({
    image: image,
    text: new Text({
      text: feature.get('name'),
      font: font,
      fill: fill,
      stroke: stroke,
      textAlign: 'left',
      offsetX: 12,
      offsetY: 3
    }),
    zIndex: feature.get('alt')
  });
}

const sanmei = new VectorLayer({
  source: new VectorSource({
    url: dburl + '?cat=0&v=0',
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

function fromStringYX(s) {
  let ma = s.match(/^(\d+)[,\s]\s*(\d+)$/);
  if (ma) {
    return [fromDigit(ma[2]), fromDigit(ma[1])];
  }
  ma = s.match(/^(\d+\.\d*)[,\s]\s*(\d+\.\d*)$/);
  if (ma) {
    return [Number(ma[2]), Number(ma[1])];
  }
  ma = s.match(/^(\d+)°(\d+)′(\d+(\.\d*)?)″[,\s]\s*(\d+)°(\d+)′(\d+(\.\d*)?)″$/)
    || s.match(/^(\d+)度(\d+)分(\d+(\.\d*)?)秒[,\s]\s*(\d+)度(\d+)分(\d+(\.\d*)?)秒$/);
  if (ma) {
    return [fromDMS(ma.slice(5, 8)), fromDMS(ma.slice(1, 4))];
  }
  return null;
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
const count = document.getElementById('count');
const items = document.getElementById('items');
let result_json;

function query(s) {
  while (items.firstChild) {
    items.removeChild(items.firstChild);
  }
  count.textContent = '検索中';
  result.style.display = 'block';
  fetch(dburl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'q=' + encodeURIComponent(s)
  })
  .then(response => response.json())
  .then(function (json) {
    result_json = json;
    count.textContent = json.geo.length + '件';
    for (const geo of json.geo) {
      const tr = document.createElement('tr'); // new row
      let td = document.createElement('td'); // 1st column
      td.addEventListener('click', () => { openPopupId(geo.id, true); });
      tr.appendChild(td).textContent = geo.id;

      td = document.createElement('td'); // 2nd column
      const ruby = document.createElement('ruby');
      const rt = document.createElement('rt');
      ruby.textContent = geo.name;
      tr.appendChild(td).appendChild(ruby).appendChild(rt).textContent = geo.kana;

      td = document.createElement('td'); // 3rd column
      items.appendChild(tr).appendChild(td).textContent = geo.alt;
    }
  });
}

function openPopupId(id, centering) {
  fetch(dburl + '?id=' + id)
  .then(response => response.json())
  .then(function (json) {
    const geo = json.geo[0];
    const coordinate = fromLonLat([fromDigit(geo.lon), fromDigit(geo.lat)]);
    popup.show(coordinate,
      '<h2>' + geo.name
      + '</h2><table><tbody><tr><td>よみ</td><td>' + geo.kana
      + (geo.alias.length > 0 ?
          '</td></tr><tr><td>別名</td><td>' + geo.alias.map(
            alias => '<ruby>' + alias.name + '<rt>' + alias.kana + '</rt></ruby>'
          ).join('<br>') : '')
      + '</td></tr><tr><td>標高</td><td>' + geo.alt
      + 'm</td></tr><tr><td>緯度</td><td>' + formatDigit(geo.lat)
      + '</td></tr><tr><td>経度</td><td>' + formatDigit(geo.lon)
      + '</td></tr><tr><td>所在</td><td>' + geo.address.join('<br>')
      + '</td></tr><tr><td>ID</td><td>'
      + '<span data-auth="' + geo.auth + '">' + geo.id + '</span>'
      + '</td></tr></tbody></table>'
    );
    if (centering) {
      view.setCenter(coordinate);
    }
  });
}

document.forms['form1'].addEventListener('submit', function (event) {
  const s = event.target.elements['query'].value;
  const lon_lat = fromStringYX(s);
  if (lon_lat) {
    view.setCenter(fromLonLat(lon_lat));
  } else {
    query(s);
  }
  event.preventDefault();
}, false);

document.forms['form2'].addEventListener('submit', function (event) {
  /*
  const geo = '{"type":"FeatureCollection","features":['
    + result_json.geo.map(x =>
      '{"type":"Feature","geometry":{"type":"Point","coordinates":['
      + fromDigit(x.lon).toFixed(6) + ',' + fromDigit(x.lat).toFixed(6)
      + ']},"properties":{"name":"' + x.name
      + '","よみ":"' + x.kana
      + '","標高":' + x.alt
      + ',"ID":' + x.id
      + ',"_iconUrl":"https://map.jpn.org/icon/952015.png","_iconSize":[24,24],"_iconAnchor":[12,12]}}'
    ).join() + ']}';
    */
  const csv = 'ID,山名,よみ,標高,緯度,経度,備考\n' + result_json.geo.map(x => [
    x.id, x.name, x.kana, x.alt, fromDigit(x.lat).toFixed(6), fromDigit(x.lon).toFixed(6), ''
  ].join()).join('\n') + '\n';
  const b = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'result.csv';
  a.click();
  event.preventDefault();
});

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

window.addEventListener('DOMContentLoaded', function () {
  for (const element of document.querySelectorAll('button.navi')) {
    if (window.opener) {
      element.innerHTML = '<span class="one">✖︎</span>';
      element.addEventListener('click', () => window.close());
    } else if (history.length > 1) {
      element.innerText = '戻る';
      element.addEventListener('click', () => history.back());
    } else {
      element.innerText = 'TOP';
      element.addEventListener('click', () => location.assign('.'));
    }
  }
});

window.addEventListener('load', function (_event) {
  const img = document.createElement('img');
  img.setAttribute('src', 'lime/lime.cgi?mountain'); // access counter
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
// end of mountain.js
