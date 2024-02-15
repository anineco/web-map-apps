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
    new Control({ element: document.getElementById('centercross') })
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

const apiurl = 'https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php';

function openPopup(coordinate) {
  const lon_lat = toLonLat(coordinate);
  const lon = lon_lat[0].toFixed(6);
  const lat = lon_lat[1].toFixed(6);
  const result = {
    lon: lon_lat[0],
    lat: lon_lat[1]
  };
  const sources = [];
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
      result.address = json.length ? json.map(i => i.name) : 'unknown';
      resolve();
    })
  ));
  Promise.all(sources).then(() => {
    popup.show(coordinate,
      '<h2>現在地</h2><table><tbody><tr><td>標高</td><td>' + result.alt
      + 'm<tr><td>緯度</td><td>' + formatDEG(result.lat)
      + '</td></tr><tr><td>経度</td><td>' + formatDEG(result.lon)
      + '</td></tr><tr><td>所在</td><td>' + result.address.join('<br>')
      + '</td></tr></tbody></table>'
    );
  });
}

window.openPopupCenter = () => { openPopup(view.getCenter()); };
window.switchSanmei = (visible) => { sanmei.setVisible(visible); };

window.openPanel = () => {
  const dialog = document.getElementById('dialog');
  const menu = document.getElementById('menu3');
  if (dialog.style.display !== 'none') {
    // ログイン画面を閉じる
    dialog.style.display = 'none';
  } else if (menu.style.display !== 'none') {
    // ログアウト処理
    fetch(share + 'logout.php')
    .then(response => response.text())
    .then(function (text) {
      if (text === 'SUCCESS') {
        alert('ログアウトしました');
      }
      menu.style.display = 'none';
    });
  } else {
    // ログイン中か確認する
    fetch(share + 'login.php')
    .then(response => response.text())
    .then(function (text) {
      if (text === 'SUCCESS') {
        menu.style.display = 'block';
        dialog.style.display = 'none';
      } else {
        menu.style.display = 'none';
        dialog.style.display = 'block';
      }
    });
  }
};

const panel = document.forms['panel'];

window.readPos = (init) => {
  const lon_lat = toLonLat(view.getCenter());
  const lon = lon_lat[0].toFixed(6);
  const lat = lon_lat[1].toFixed(6);
  if (init) {
    panel.id.value =  0;
    panel.name.value = '';
    panel.kana.value = '';
  }
  panel.lat.value = lon_lat[1];
  panel.lon.value = lon_lat[0];
  panel.y.value = formatDEG(lon_lat[1]);
  panel.x.value = formatDEG(lon_lat[0]);
  fetch(apiurl + '?outtype=JSON&lon=' + lon + '&lat=' + lat)
  .then(response => response.json())
  .then(function (json) {
    panel.alt.value = parseInt(json.elevation + 0.5);
  });
};

window.confirmPos = () => {
  if (panel.lon.value && panel.lat.value) {
    const coordinate = fromLonLat([panel.lon.value, panel.lat.value]);
    popup.show(coordinate,
      '<h2>' + (panel.name.value || '未設定')
      + '</h2><table><tbody><tr><td>よみ</td><td>' + (panel.kana.value || '未設定')
      + '</td></tr><tr><td>標高</td><td>' + panel.alt.value
      + 'm</td></tr><tr><td>緯度</td><td>' + panel.y.value
      + '</td></tr><tr><td>経度</td><td>' + panel.x.value
      + '</td></tr><tr><td>ID</td><td>' + (panel.id.value || '新規')
      + '</td></tr></tbody></table>'
    );
  }
};

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
  fetch(dburl + '?q=' + encodeURIComponent(s))
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
    panel.id.value = geo.id;
    panel.alt.value = geo.alt;
    panel.y.value = formatDEG(geo.lat);
    panel.x.value = formatDEG(geo.lon);
    panel.lat.value = geo.lat;
    panel.lon.value = geo.lon;
    panel.name.value = geo.name;
    panel.kana.value = geo.kana;

    const coordinate = fromLonLat([geo.lon, geo.lat]);
    popup.show(coordinate,
      '<h2>' + geo.name
      + '</h2><table><tbody><tr><td>よみ</td><td>' + geo.kana
      + (geo.alias.length > 0 ?
          '</td></tr><tr><td>別名</td><td>' + geo.alias.map(
            alias => '<ruby>' + alias.name + '<rt>' + alias.kana + '</rt></ruby>'
          ).join('<br>') : '')
      + '</td></tr><tr><td>標高</td><td>' + geo.alt
      + 'm</td></tr><tr><td>緯度</td><td>' + panel.y.value
      + '</td></tr><tr><td>経度</td><td>' + panel.x.value
      + '</td></tr><tr><td>所在</td><td>' + geo.address.join('<br>')
      + '</td></tr><tr><td>ID</td><td>' + geo.id
      + '</td></tr></tbody></table>'
    );
    if (centering) {
      view.setCenter(coordinate);
    }
  });
}

document.forms['login'].addEventListener('submit', function (event) {
  // ログイン処理
  const form = event.target;
  fetch(share + 'login.php', {
    method: 'POST',
    body: new FormData(form)
  })
  .then(response => response.text())
  .then(function (text) {
    if (text === 'SUCCESS') {
      alert('ログインしました');
      document.getElementById('dialog').style.display = 'none';
      document.getElementById('menu3').style.display = 'block';
    } else {
      alert('ログインに失敗しました');
    }
  });
  event.preventDefault();
});

document.forms['panel'].addEventListener('submit', function (event) {
  const form = event.target;
  fetch(dburl, {
    method: 'POST',
    body: new FormData(form)
  })
  .then(response => response.text())
  .then(function (text) {
    alert(text);
    popup.hide();
    sanmei.getSource().refresh();
  });
  event.preventDefault();
});

document.forms['form1'].addEventListener('submit', function (event) {
  const form = event.target;
  const s = form.elements['query'].value;
  const lon_lat = fromStringYX(s);
  if (lon_lat) {
    view.setCenter(fromLonLat(lon_lat));
  } else {
    query(s);
  }
  event.preventDefault();
});

document.forms['form2'].addEventListener('submit', function (event) {
  const csv = 'ID,山名,よみ,標高,緯度,経度,備考\n' + result_json.geo.map(x => [
    x.id, x.name, x.kana, x.alt, x.lat, x.lon, ''
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

window.addEventListener('DOMContentLoaded', function (_event) {
  for (const element of document.querySelectorAll('#menu1 button:last-child')) {
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
