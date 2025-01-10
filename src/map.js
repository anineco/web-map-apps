// map.js
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
import {formatDEG} from './transangle.js';
import {install} from 'ga-gtag';

install(process.env.VITE_GTAG1);
const share = process.env.VITE_SHARE;

const category = [
//      lat,      lon, zoom, cat, title
  [ 36.4967, 139.3318,   12,   0, '全山行記録'         ],
  [ 36.5439, 138.9261,    9,  14, '日本の主な山岳'     ],
  [ 36.5439, 138.9261,    9,   1, '日本三百名山'       ],
  [ 36.5493, 138.9261,   10,   2, 'ぐんま百名山'       ],
  [ 36.5493, 138.9261,   10,  11, '群馬300山'          ],
  [ 36.7332, 139.7925,   10,   3, '栃木百名山'         ],
  [ 36.0110, 139.0491,   11,   8, '埼玉百山'           ],
  [ 35.7532, 139.3463,   11,  15, '東京百名山'         ],
  [ 35.4036, 139.3492,   11,  13, 'かながわ百名山'     ],
  [ 36.1019, 138.0629,    9,   5, '信州百名山'         ],
  [ 35.5747, 138.6364,   10,   6, '山梨百名山'         ],
  [ 37.4422, 140.1566,    9,   7, 'うつくしま百名山'   ],
  [ 37.4422, 140.1566,    9,  12, '新うつくしま百名山' ],
  [ 37.6869, 138.8786,    9,  10, '越後百山'           ],
  [ 36.4967, 139.3318,   12,   4, '桐生地域百山'       ],
  [ 36.3690, 139.4490,   12,   9, '足利百名山'         ]
];
const param = { idx: 1, lat: undefined, lon: undefined, zoom: undefined, cat: undefined };

for (const arg of location.search.slice(1).split('&')) {
  const s = arg.split('=');
  if (s[0] in param) {
    param[s[0]] = Number(s[1]);
  }
}
if (param.idx < 0 || param.idx >= category.length) {
  param.idx = 1;
}

const idx = localStorage.getItem('idx');
if (param.idx == idx) {
  for (const key in param) {
    param[key] = localStorage.getItem(key);
  }
} else {
  const c = category[param.idx];
  param.lat = c[0];
  param.lon = c[1];
  param.zoom = c[2];
  param.cat = c[3];
}

window.addEventListener('DOMContentLoaded', function () {
  const element = document.getElementById('tb_category');
  for (const c of category) {
    element.appendChild(new Option(c[4]));
  }
  element.selectedIndex = param.idx;
  element.addEventListener('change', _event => {
    location.replace('map.html?idx=' + element.selectedIndex);
  });
});

// minimal displayable grade for zoom
function minGradeForZoom(zoom) {
//return zoom >= 13 ? 0 : (zoom <= 8 ? 6 : 14 - zoom);
  return zoom >= 11 ? 0 : (zoom <= 6 ? 6 : 12 - zoom);
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

const image_fill_stroke = [
  [
    new Icon({ src: './icon/902030.png', declutterMode: 'none' }),
    new Fill({ color: 'blue'   }),
    new Stroke({ color: 'white', width: 2 })
  ],
  [
    new Icon({ src: './icon/902031.png', declutterMode: 'none' }),
    new Fill({ color: 'yellow' }),
    new Stroke({ color: 'gray', width: 2, })
  ]
];

const font = '14px sans-serif';
const textAlign = 'left';
const offsetX = 12;
const offsetY = 3;

function styleFunction(feature) {
  const level = feature.get('p');
  if (level < min_level) {
    return null;
  }
  const i = feature.get('c') > 0 ? 0 : 1;
  const [image, fill, stroke] = image_fill_stroke[i];
  const text = new Text({ text: feature.get('name'), font, fill, stroke, textAlign, offsetX, offsetY });
  return new Style({ image, text, zIndex: level & ~7 });
}

const sanmei = new VectorLayer({
  source: new VectorSource({
    url: share + 'db.php?cat=' + param.cat + '&v=' + (param.cat > 0 ? 2 : 1),
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

const menu2 = document.getElementById('menu2');
toolbar.setToggleButton('tb_menu2', menu2);

toolbar.setPopup(popup);
toolbar.setCenterButton('tb_center');
toolbar.setBaseSelect('tb_base');
toolbar.setZoomSelect('tb_zoom', (zoom) => {
  view.setZoom(zoom);
  min_level = minGradeForZoom(zoom) << 3;
  sanmei.getSource().changed();
});
toolbar.setCreditButton('tb_help', 'map/help.html');
toolbar.setLayerCheckbox('tb_sanmei', sanmei);
toolbar.setControlCheckbox('tb_cross', centercross);

function interval(start, end) {
  const s = start.split('-');
  const e = end.split('-');
  if (e[0] != s[0]) {
    return start + '/' + end;
  } else if (e[1] != s[1]) {
    return start + '/' + e[1] + '-' + e[2];
  } else if (e[2] != s[2]) {
    return start + '/' + e[2];
  }
  return start;
}

const result = document.getElementById('result');
toolbar.setToggleButton('tb_result', result);

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
      + '" width="60" height="45"></a></td><td>' + interval(rec.start, rec.end)
      + '<br><a href="' + rec.link
      + '">' + rec.title
      + '</a>：' + rec.summary
      + '</td>';
    items.appendChild(tr);
  }
}

function openPopupId(id, center, pop) {
  fetch(share + 'db.php?rec=' + id + '&c=' + param.cat)
  .then(response => response.json())
  .then(function (json) {
    const geo = json.geo[0];
    const lon = Number(geo.lon);
    const lat = Number(geo.lat);
    geo.x = formatDEG(lon);
    geo.y = formatDEG(lat);
    const coordinate = fromLonLat([ lon, lat ]);
    if (center) {
      view.setCenter(coordinate);
    }
    if (pop) {
      geo.gcpname = null; // 点名は表示しない
      toolbar.openPopupName(coordinate, geo);
    }
    showRecords(json.rec);
  });
}

map.on('click', function (event) {
  map.forEachFeatureAtPixel(
    event.pixel,
    function (feature, _layer) {
      const geometry = feature.getGeometry();
      if (geometry.getType() !== 'Point') {
        return false;
      }
      openPopupId(feature.getId(), false, true);
      return true;
    }
  );
});

const passive = { passive: true };

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
  img.src = 'lime/lime.cgi?map'; // access counter
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
