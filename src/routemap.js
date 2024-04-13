// routemap.js
import View from 'ol/View';
import {fromLonLat} from 'ol/proj';
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
import {install} from 'ga-gtag';

install(process.env.VITE_GTAG1);
const share = process.env.VITE_SHARE;

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
    attributions,
    url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
  }),
  title: '標準',
  type: 'base',
  visible: false
});

const pale = new TileLayer({
  source: new XYZ({
    attributions,
    url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'
  }),
  title: '淡色',
  type: 'base'
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

const fill = new Fill({ color: 'blue' });
const stroke = new Stroke({ color: 'white', width: 2 });
const font = '14px sans-serif';

function styleFunction(feature) {
  let style;
  const type = feature.getGeometry().getType();
  if (type === 'LineString') {
    const color = feature.get('_color').match(/^#(..)(..)(..)$/).slice(1).map(h => parseInt(h, 16));
    color[3] = feature.get('_opacity');
    style = {
      stroke: new Stroke({
        color,
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
        font,
        fill,
        stroke,
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

const centercross = new CenterCross({ element: document.getElementById('centercross') });
const toolbar = new Toolbar({ element: document.getElementById('toolbar') });
// FIXME: If autoPan is enabled, popup.show immediately after setCenter causes uncertain center position.
const popup = new Popup({ autoPan: false });

const map = new Map({
  target: 'map',
  layers: [std, pale, seamlessphoto, otm, track],
  view: view,
  controls: defaults().extend([ new ScaleLine(), centercross, toolbar ]),
  overlays: [ popup ]
});

const passive = { passive: true };

const menu2 = document.getElementById('menu2');
toolbar.setToggleButton('tb_menu2', menu2);

toolbar.setPopup(popup);
toolbar.setCenterButton('tb_center');
toolbar.setBaseSelect('tb_base');
toolbar.setZoomSelect('tb_zoom', (zoom) => view.setZoom(zoom));
toolbar.setLayerCheckbox('tb_track', track);
toolbar.setControlCheckbox('tb_cross', centercross);

map.on('click', function (event) {
  map.forEachFeatureAtPixel(
    event.pixel,
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

window.addEventListener('load', function (_event) {
  const img = document.createElement('img');
  img.setAttribute('src', 'lime/lime.cgi?routemap'); // access counter
  img.setAttribute('width', 1);
  img.setAttribute('height', 1);
  tb_exit.parentNode.insertBefore(img, tb_exit);
}, passive);
// __END__
