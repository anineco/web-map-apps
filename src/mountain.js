// mountain.js
import View from 'ol/View';
import {fromLonLat,toLonLat} from 'ol/proj';
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
import Popup from 'ol-popup';
import CenterCross from './centercross.js';
import Toolbar from './toolbar.js';
import Searchbar from './searchbar.js';
import {formatDEG,fromStringYX} from './transangle.js';
import {install} from 'ga-gtag';

install(process.env.VITE_GTAG2);
const share = process.env.VITE_SHARE;

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

// min_zoom_list[grade]: minimal displayable zoom for grade
const min_zoom_list = [
  13, // 0: contour line
  13, // 1: other source
  12, // 2: elevation point
  11, // 3: 4th-order triangulation point
  10, // 4: 3rd-order triangulation point
  9,  // 5: 2nd-order triangulation point
  8,  // 6: 1st-order triangulation point
  8   // 7: GPS-based control station
];

// minimal displayable grade for zoom
function minGradeForZoom(zoom) {
  return zoom >= 13 ? 0 : (zoom <= 8 ? 6 : 14 - zoom);
}

// minimun displayable level (=grade<<3) for current zoom
let min_level = minGradeForZoom(param.zoom) << 3;

const view = new View({
  center: fromLonLat([ Number(param.lon), Number(param.lat) ]),
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
    attributions,
    url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
  }),
  title: '標準',
  type: 'base'
});

const pale = new TileLayer({
  source: new XYZ({
    attributions,
    url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'
  }),
  title: '淡色',
  type: 'base',
  visible: false
});

const seamlessphoto = new TileLayer({
  source: new XYZ({
    attributions,
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

const img_w = new Icon({ src: './icon/902029.png', declutterMode: 'none' });
const img_r = new Icon({ src: './icon/902030.png', declutterMode: 'none' });
const img_y = new Icon({ src: './icon/902031.png', declutterMode: 'none' });
const img = [ img_w, img_w, img_y, img_r, img_r, img_r, img_r, img_r ];

const font = '14px sans-serif';
const fill = new Fill({ color: 'blue' });
const stroke = new Stroke({ color: 'white', width: 2 });
const textAlign = 'left';
const offsetX = -4;
const offsetY = 16;
const declutterMode = 'declutter';

function styleFunction(feature) {
  const level = feature.get('p');
  if (level < min_level) {
    return null;
  }
  const image = img[level & 7];
  const text = new Text({ font, fill, stroke, textAlign, offsetX, offsetY, declutterMode, text: feature.get('name') });
  return new Style({ image, text, zIndex: level & ~7 });
}

const sanmei = new VectorLayer({
  source: new VectorSource({
    url: share + 'db.php?cat=0&v=0',
    format: new GeoJSON()
  }),
  title: '山名',
  style: styleFunction,
  declutter: true
});

const centercross = new CenterCross({ element: document.getElementById('centercross') });
const toolbar = new Toolbar({ element: document.getElementById('toolbar') });
const searchbar = new Searchbar({ element: document.getElementById('searchbar') });
// FIXME: If autoPan is enabled, popup.show immediately after setCenter causes uncertain center position.
const popup = new Popup({ autoPan: false });

const map = new Map({
  target: 'map',
  layers: [ std, pale, seamlessphoto, otm, sanmei ],
  view,
  controls: defaults().extend([ new ScaleLine(), centercross, toolbar, searchbar ]),
  overlays: [ popup ]
});

const passive = { passive: true };

const menu2 = document.getElementById('menu2');
toolbar.setToggleButton('tb_menu2', menu2);

toolbar.setPopup(popup);
toolbar.setCenterButton('tb_center');
toolbar.setGSIMapButton('tb_gsimap');
toolbar.setYamapButton('tb_yamap');
toolbar.setBaseSelect('tb_base');
toolbar.setZoomSelect('tb_zoom', (zoom) => {
  view.setZoom(zoom);
  min_level = minGradeForZoom(zoom) << 3;
  sanmei.getSource().changed();
});
toolbar.setCreditButton('tb_help', 'mountain/help.html');
toolbar.setLayerCheckbox('tb_sanmei', sanmei);
toolbar.setControlCheckbox('tb_cross', centercross);

const panel = document.forms.panel.elements;
const currId = document.getElementById('tb_curr');
currId.value = 0;

function setPanel(geo) {
  currId.value = geo.id;
  panel.name.value = geo.name;
  panel.kana.value = geo.kana;
  panel.alt.value = geo.alt;
  panel.auth.value = geo.auth;
  panel.y.value = geo.y;
  panel.x.value = geo.x;
  panel.lat.value = geo.lat;
  panel.lon.value = geo.lon;
  for (let i = 0; i < 3; i++) {
    if (i < geo.alias.length) {
      panel[`name${i}`].value = geo.alias[i].name;
      panel[`kana${i}`].value = geo.alias[i].kana;
    } else {
      panel[`name${i}`].value = '';
      panel[`kana${i}`].value = '';
    }
  }
}

function getPanel() {
  const geo = {
    id: currId.value,
    name: panel.name.value || '未設定',
    kana: panel.kana.value,
    alt: panel.alt.value,
    auth: panel.auth.value,
    y: panel.y.value,
    x: panel.x.value,
    lat: panel.lat.value,
    lon: panel.lon.value
  };
  const alias = Array(3);
  for (let i = 0; i < 3; i++) {
    alias[i] = {
      name: panel[`name${i}`].value,
      kana: panel[`kana${i}`].value
    };
  }
  geo.alias = alias.filter(i => i.name && i.kana);
  return geo;
}

function openPopupId(id, center, pop) {
  fetch(share + 'db.php?id=' + id)
  .then(response => response.json())
  .then(function (json) {
    const geo = json.geo[0];
    const lon = Number(geo.lon);
    const lat = Number(geo.lat);
    geo.x = formatDEG(lon);
    geo.y = formatDEG(lat);
    setPanel(geo);
    const coordinate = fromLonLat([ lon, lat ]);
    if (center) {
      view.setCenter(coordinate);
    }
    if (pop) {
      toolbar.openPopupName(coordinate, geo);
    }
    const level = geo.level & ~7;
    if (min_level > level) {
      min_level = level;
      view.setZoom(min_zoom_list[level >> 3]);
      sanmei.getSource().changed();
    }
  });
}

function seekId(direc) {
  const id = currId.value;
  fetch(share + 'db.php?id=' + id + '&n=' + direc)
  .then(response => response.json())
  .then(function (json) {
    const geo = json.geo[0];
    if (geo.id != id) {
      const lon = Number(geo.lon);
      const lat = Number(geo.lat);
      geo.x = formatDEG(lon);
      geo.y = formatDEG(lat);
      setPanel(geo);
      const coordinate = fromLonLat([ lon, lat ]);
      view.setCenter(coordinate);
      const level = geo.level & ~7;
      if (min_level > level) {
        view.setZoom(min_zoom_list[level >> 3]);
        min_level = level;
        sanmei.getSource().changed();
      }
      if (div2.style.display == 'none') {
        toolbar.openPopupName(coordinate, geo);
      }
    }
  });
}

// ◀︎ボタン
document.getElementById('tb_prev').addEventListener('click', function (event) {
  seekId(event.shiftKey ? -2 : -1);
}, passive);

// ▶︎ボタン
document.getElementById('tb_next').addEventListener('click', function (event) {
  seekId(event.shiftKey ? 2 : 1);
}, passive);

const div1 = document.getElementById('menu3'); // ログイン画面
const div2 = document.getElementById('menu4'); // 編集パネル

// 管理ボタン
document.getElementById('tb_login').addEventListener('click', function (_event) {
  if (div1.style.display !== 'none') {
    // ログイン画面を閉じる
    div1.style.display = 'none';
    return;
  }
  if (div2.style.display !== 'none') {
    // ログアウト処理
    fetch(share + 'logout.php')
    .then(response => response.text())
    .then(function (text) {
      if (text === 'SUCCESS') {
        panel.token.value = '';
        alert('ログアウトしました');
      }
      div2.style.display = 'none';
    });
    return;
  }
  // ログイン画面を開く
  div1.style.display = 'block';
}, passive);

// ログイン処理
document.forms.login.addEventListener('submit', function (event) {
  fetch(share + 'login.php', {
    method: 'POST',
    body: new FormData(event.target)
  })
  .then(response => response.json())
  .then(function (json) {
    if (json.status === 'SUCCESS') {
      panel.token.value = json.token;
      alert('ログイン成功');
      div1.style.display = 'none';
      div2.style.display = 'block';
      toolbar.closePopup();
    } else {
      panel.token.value = '';
      alert('ログイン失敗');
    }
  });
  event.preventDefault();
});

function readCenter() {
  const lon_lat = toLonLat(view.getCenter());
  panel.lat.value = lon_lat[1];
  panel.lon.value = lon_lat[0];
  panel.y.value = formatDEG(lon_lat[1]);
  panel.x.value = formatDEG(lon_lat[0]);

  const lon = lon_lat[0].toFixed(6);
  const lat = lon_lat[1].toFixed(6);
  fetch('https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?outtype=JSON&lon=' + lon + '&lat=' + lat)
  .then(response => response.json())
  .then(function (json) {
    panel.alt.value = typeof (json.elevation) === 'number' ? Math.round(json.elevation + 0.5) : -9999;
  });
}

// 新規ボタン
document.getElementById('tb_new').addEventListener('click', function (_event) {
  currId.value =  0;
  panel.name.value = '';
  panel.kana.value = '';
  for (let i = 0; i < 3; i++) {
    panel[`name${i}`].value = '';
    panel[`kana${i}`].value = '';
  }
  readCenter();
}, passive);

// 読取ボタン
document.getElementById('tb_read').addEventListener('click', readCenter, passive);

// 表示ボタン
document.getElementById('tb_disp').addEventListener('click', function (_event) {
  if (panel.lon.value && panel.lat.value) {
    const coordinate = fromLonLat([ Number(panel.lon.value), Number(panel.lat.value) ]);
    const geo = getPanel();
    geo.address = [];
    toolbar.openPopupName(coordinate, geo);
  } else {
    alert('位置が未指定');
  }
}, passive);

// 登録ボタン
document.forms.panel.addEventListener('submit', function (event) {
  const data = new FormData(event.target);
  data.set('id', currId.value);
  fetch(share + 'db.php', {
    method: 'POST',
    body: data
  })
  .then(response => response.json())
  .then(function (json) {
    alert('登録完了');
    const geo = json.geo[0];
    geo.y = formatDEG(geo.lat);
    geo.x = formatDEG(geo.lon);
    setPanel(geo);
    toolbar.closePopup();
    sanmei.getSource().refresh();
  });
  event.preventDefault();
});

const result = document.getElementById('result');
document.getElementById('tb_result').addEventListener('click', function (_event) {
  result.style.display = result.style.display != 'none' ? 'none' : 'block';
});

const count = document.getElementById('count');
const items = document.getElementById('items');
let result_json;

function query(s) {
  while (items.firstChild) {
    items.removeChild(items.firstChild);
  }
  count.textContent = '検索中';
  result.style.display = 'block';
  fetch(share + 'db.php?q=' + encodeURIComponent(s))
  .then(response => response.json())
  .then(function (json) {
    result_json = json;
    count.textContent = json.geo.length + '件';
    for (const geo of json.geo) {
      const tr = document.createElement('tr'); // new row
      let td = document.createElement('td'); // 1st column
      td.textContent = geo.id;
      td.addEventListener('click', function (_event) {
        openPopupId(this.textContent, true, div2.style.display == 'none');
      }, passive);
      tr.appendChild(td);

      td = document.createElement('td'); // 2nd column
      const ruby = document.createElement('ruby');
      ruby.textContent = geo.name;
      const rt = document.createElement('rt');
      rt.textContent = geo.kana;
      tr.appendChild(td).appendChild(ruby).appendChild(rt);

      td = document.createElement('td'); // 3rd column
      td.textContent = geo.alt;
      items.appendChild(tr).appendChild(td);
    }
  });
}

document.forms.form1.addEventListener('submit', function (event) {
  const s = event.target.elements.query.value;
  const lon_lat = fromStringYX(s);
  if (lon_lat) {
    view.setCenter(fromLonLat(lon_lat));
  } else {
    query(s);
  }
  event.preventDefault();
});

document.forms.form2.addEventListener('submit', function (event) {
  const csv = (event.target.elements.bom.checked ? '\uFEFF' : '')
    + 'ID,山名,よみ,標高,緯度,経度,備考\n'
    + result_json.geo.map(x => [ x.id, x.name, x.kana, x.alt, x.lat, x.lon, '' ].join()).join('\n')
    + '\n';
  const b = new Blob([ csv ], { type: 'text/csv;charset=UTF-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'result.csv';
  a.click();
  event.preventDefault();
});

map.on('click', function (event) {
  map.forEachFeatureAtPixel(
    event.pixel,
    function (feature, _layer) {
      const geometry = feature.getGeometry();
      if (geometry.getType() !== 'Point') {
        return false;
      }
      openPopupId(feature.getId(), false, div2.style.display == 'none');
      return true;
    }
  );
}, passive);

map.on('pointermove', function (event) {
  if (event.dragging) { return; }
  const found = map.forEachFeatureAtPixel(
    map.getEventPixel(event.originalEvent),
    (feature, _layer) => feature.getGeometry().getType() === 'Point'
  );
  map.getTargetElement().style.cursor = found ? 'pointer' : '';
}, passive);

const tb_exit = document.getElementById('tb_exit');

window.addEventListener('DOMContentLoaded', function (_event) {
  let text, handler;
  if (window.opener) {
    text = '✖︎';
    handler = () => window.close();
  } else if (history.length > 1) {
    text = '戻る';
    handler = () => history.back();
  } else {
    text = 'TOP';
    handler = () => location.assign('.');
  }
  tb_exit.innerText = text;
  tb_exit.addEventListener('click', handler, passive);
}, passive);

window.addEventListener('load', function (_event) {
  const img = new Image();
  img.src = 'lime/lime.cgi?mountain'; // access counter
  img.width = 1;
  img.height = 1;
  tb_exit.parentNode.insertBefore(img, tb_exit);
}, passive);

window.addEventListener('beforeunload', function (_event) {
  const lon_lat = toLonLat(view.getCenter());
  param.lon = lon_lat[0].toFixed(6);
  param.lat = lon_lat[1].toFixed(6);
  param.zoom = view.getZoom();
  for (const key in param) {
    localStorage.setItem(key, param[key]);
  }
}, passive);
// __END__
