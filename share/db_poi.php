<?php
$id = posix_getuid(); # user id
$home = posix_getpwuid($id)['dir']; # home directory
$cf = parse_ini_file($home . '/.my.cnf'); # 🔖 設定ファイル
$dsn = "mysql:host=$cf[host];dbname=$cf[database];charset=utf8mb4";
$dbh = new PDO($dsn, $cf['user'], $cf['password']);

$type = !empty($_POST) ? INPUT_POST : INPUT_GET;
$mode = 'end';
$val = null;
foreach (array('cat', 'id', 'rgc', 'zu', 'q') as $i) {
  $val = filter_input($type, $i);
  if (isset($val)) {
    $mode = $i;
    break;
  }
}

# カテゴリ
# +----+----+--------+--------+
# |位置|山名|ヤマレコ|山名一覧|
# +----+----+--------+--------+
# |  x |  x |    0   |    4   |
# |  x |  o |    1   |    5   |
# |  o |  x |    2   |    6   |
# |  o |  o |    3   |    7   |
# +----+----+--------+--------+

if ($mode === 'cat') {
#
# GeoJSON出力
#
  header('Content-type: application/geo+json; charset=UTF-8');
  header('Cache-Control: no-store, max-age=0');
  echo '{"type":"FeatureCollection","features":[', PHP_EOL;
  if ($val < 4) {
    # ヤマレコ
    $sql = <<<'EOS'
SELECT ptid AS id,name,lat,lon FROM poi
WHERE act>0 AND c=?
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $val, PDO::PARAM_INT);
  } elseif ($val == 4) {
    # 山名一覧 \ ヤマレコ
    $sql = <<<'EOS'
SELECT g.id,g.name,g.lat,g.lon FROM geom AS g
LEFT JOIN poi AS p USING (id)
WHERE p.id IS NULL
EOS;
    $sth = $dbh->prepare($sql);
  } else {
    # 山名一覧 ∩ ヤマレコ
    $sql = <<<'EOS'
SELECT id,name,lat,lon FROM geom
JOIN (SELECT id,MAX(c) AS m FROM poi GROUP BY id) AS p
USING (id)
WHERE m=?
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $val & 3, PDO::PARAM_INT);
  }
  $sth->execute();
  $count = 0;
  while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
    if ($count > 0) {
      echo ',', PHP_EOL;
    }
    $id = $row->id;
    $name = $row->name;
    $lat = $row->lat;
    $lon = $row->lon;
    echo <<<EOS
{"id":$id,"type":"Feature","properties":{"name":"$name","c":$val},
"geometry":{"type":"Point","coordinates":[$lon,$lat]}}
EOS;
    $count++;
  }
  $sth = null;
  echo PHP_EOL, ']}', PHP_EOL;
} elseif ($mode === 'rgc' || $mode === 'zu') {
#
# JSON出力（逆ジオコーディング）
#
  $lon = filter_input($type, 'lon');
  $lat = filter_input($type, 'lat');
  $wkt = "POINT($lon $lat)";
  $sql = <<<'EOS'
SET @pt=ST_GeomFromText(?,4326/*!80003 ,'axis-order=long-lat'*/)
EOS;
  $sth = $dbh->prepare($sql);
  $sth->bindValue(1, $wkt, PDO::PARAM_STR);
  $sth->execute();
  $sth = null;
  $sql = <<<'EOS'
SELECT code,name FROM gyosei
LEFT JOIN city USING (code)
WHERE ST_Contains(area,@pt)>0
LIMIT 1
EOS;
  $sth = $dbh->prepare($sql);
  $sth->execute();
  $output = array();
  while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
    $output[] = array(
      'code' => $row->code,
      'name' => $row->name
    );
  }
  $sth = null;
  header('Content-type: application/json; charset=UTF-8');
  header('Cache-Control: no-store, max-age=0');
  echo json_encode($output, JSON_UNESCAPED_UNICODE), PHP_EOL;
} else {
#
# JSON出力
#
  $output = array();
  if ($mode === 'id' || ($mode === 'q' && preg_match('/^[0-9]+$/', $val))) {
    if ($val == 0) {
      $sql = <<<'EOS'
SELECT ptid AS id,kana,name,alt,lat,lon FROM poi
WHERE act>0 AND c>=0
ORDER BY ptid DESC
LIMIT 20
EOS;
      $sth = $dbh->prepare($sql);
    } else {
      $c = 0;
      if ($mode === 'id') {
        $c = filter_input($type, 'c');
      }
      if ($c < 4) { # ヤマレコ
        $sql = <<<'EOS'
SELECT ptid AS id,kana,name,alt,lat,lon FROM poi
WHERE act>0 AND c>=0 AND ptid=?
EOS;
      } else { # 山名一覧
        $sql = <<<'EOS'
SELECT id,kana,name,alt,lat,lon FROM geom
WHERE id=?
EOS;
      }
      $sth = $dbh->prepare($sql);
      $sth->bindValue(1, $val, PDO::PARAM_INT);
    }
    $sth->execute();
    $geo = array();
    while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
      $geo[] = array(
        'id' => $row->id,
        'kana' => $row->kana,
        'name' => $row->name,
        'alt' => $row->alt,
        'lat' => $row->lat,
        'lon' => $row->lon
      );
    }
    $sth = null;
#
# 追加情報
#
    if ($mode === 'id') {
#
# 所在地
#
      $address = array();
      if ($c < 4) { # ヤマレコ
        $sql = <<<'EOS'
SELECT name FROM city
JOIN poi_location USING (code)
WHERE ptid=?
EOS;
      } else { # 山名一覧
        $sql = <<<'EOS'
SELECT name FROM city
JOIN location USING (code)
WHERE id=?
EOS;
      }
      $sth = $dbh->prepare($sql);
      $sth->bindValue(1, $val, PDO::PARAM_INT);
      $sth->execute();
      while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
        $address[] = $row->name;
      }
      $sth = null;
      $geo[0]['address'] = $address;
    }
    $output = array('geo' => $geo);
  } elseif ($mode === 'q') {
    if (mb_substr($val, 0, 1) == '%' || mb_substr($val, -1, 1) == '%') {
      $sql = <<<'EOS'
SELECT ptid AS id,kana,name,alt,lat,lon FROM poi
WHERE act>0 AND c>=0 AND name LIKE ?
ORDER BY alt DESC
LIMIT 400
EOS;
    } else {
      $sql = <<<'EOS'
SELECT ptid AS id,kana,name,alt,lat,lon FROM poi
WHERE act>0 AND c>=0 AND name=?
ORDER BY alt DESC
LIMIT 400
EOS;
    }
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $val, PDO::PARAM_STR);
    $sth->execute();
    $geo = array();
    while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
      $geo[] = array(
        'id' => $row->id,
        'kana' => $row->kana,
        'name' => $row->name,
        'alt' => $row->alt,
        'lat' => $row->lat,
        'lon' => $row->lon
      );
    }
    $sth = null;
    $output = array('geo' => $geo);
  }
  header('Content-type: application/json; charset=UTF-8');
  header('Cache-Control: no-store, max-age=0');
  echo json_encode($output, JSON_UNESCAPED_UNICODE), PHP_EOL;
}
$dbh = null;
