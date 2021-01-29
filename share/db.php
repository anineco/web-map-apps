<?php
require_once './init.php';
$cf = set_init();

function dms2deg($s) {
  preg_match('/^(\d+)(\d\d)(\d\d)$/', $s, $m);
  return sprintf('%.6f', ($m[3] / 60 + $m[2]) / 60 + $m[1]);
}

$dsn = "mysql:dbname=$cf[database];host=$cf[host];port=$cf[port];charset=utf8mb4";
$dbh = new PDO($dsn, $cf['user'], $cf['password'], array( PDO::ATTR_PERSISTENT => true ));

$type = !empty($_POST) ? INPUT_POST : INPUT_GET;
$mode = 'end';
$val = null;
foreach (array('cat', 'id', 'rec', 'rgc', 'zu', 'q') as $i) {
  $val = filter_input($type, $i);
  if (isset($val)) {
    $mode = $i;
    break;
  }
}

#
# 総称名
#
$g_kana = array();
$g_name = array();
$sth = $dbh->prepare('SELECT id,kana,name FROM sanmei WHERE type=0');
$sth->execute();
while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
  $g_kana[$row->id] = $row->kana;
  $g_name[$row->id] = $row->name;
}
$sth = null;

if ($mode === 'cat') {
#
# GeoJSON出力
#
  $v = filter_input($type, 'v');
  if ($val == 0) {
    if ($v == 0) {
      $sql = <<<'EOS'
SELECT id,name,lat,lon,1 AS c
FROM geo
WHERE act>0
EOS;
    } else if ($v == 1) {
#
# 山行記録のある山を抽出
#
      $sql = <<<'EOS'
SELECT id,name,lat,lon,1 AS c
FROM geo
JOIN (
 SELECT DISTINCT id
 FROM explored
 JOIN (
  SELECT * 
  FROM record
  WHERE link IS NOT NULL
 ) AS r USING (rec)
) AS e USING (id)
EOS;
    } else if ($v == 2) {
#
# 山+山行記録数を抽出 ※0ではなくNULLが返る
#
      $sql = <<<'EOS'
SELECT id,name,lat,lon,c
FROM geo
LEFT JOIN (
 SELECT id,COUNT(rec) AS c
 FROM explored
 JOIN (
  SELECT *
  FROM record
  WHERE link IS NOT NULL
 ) AS r USING (rec) GROUP BY id
) AS e USING (id)
WHERE act>0
EOS;
    }
  } else {
    if ($v == 0) {
#
# 名山カテゴリを指定して抽出
#
      $sql = <<<'EOS'
SELECT id,m.name,lat,lon,1 AS c
FROM geo
JOIN (
 SELECT *
 FROM meizan
 WHERE cat=?
) AS m USING (id)
EOS;
    } else if ($v == 1) {
#
# 名山カテゴリを指定して山行記録のある山を抽出
#
      $sql = <<<'EOS'
SELECT id,m.name,lat,lon,1 AS c
FROM geo
JOIN (
 SELECT *
 FROM meizan
 WHERE cat=?
) AS m USING (id)
JOIN (
 SELECT DISTINCT id
 FROM explored
 JOIN (
  SELECT *
  FROM record
  WHERE link IS NOT NULL
 ) AS r USING (rec)
) AS e USING (id)
EOS;
    } else if ($v == 2) {
#
# 名山カテゴリを指定して山＋山行記録数を抽出 ※0ではなくNULLが返る
#
      $sql = <<<'EOS'
SELECT id,m.name,lat,lon,c
FROM geo
JOIN (
 SELECT *
 FROM meizan
 WHERE cat=?
) AS m USING (id)
LEFT JOIN (
 SELECT id,COUNT(rec) AS c
 FROM explored
 JOIN (
  SELECT *
  FROM record
  WHERE link IS NOT NULL
 ) AS r USING (rec) GROUP BY id
) AS e USING (id)
EOS;
    }
  }
  $sth = $dbh->prepare($sql);
  if ($val != 0) {
    $sth->bindValue(1, $val, PDO::PARAM_INT);
  }
  $sth->execute();
  header('Content-type: application/geo+json; charset=UTF-8');
  header('Cache-Control: max-age=604800');
  echo '{"type":"FeatureCollection","features":[', PHP_EOL;
  $count = 0;
  while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
    if ($count > 0) {
      echo ',', PHP_EOL;
    }
    $id = $row->id;
    $name = $row->name;
    if ($val == 0 && isset($g_name[$id])) {
      $name = $g_name[$id] . '・' . $name;
    }
    $lat = dms2deg($row->lat);
    $lon = dms2deg($row->lon);
    $c = $row->c ? 1 : 0;
    echo <<<EOS
{"id":$id,"type":"Feature","properties":{"name":"$name","c":$c},
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
  if ($cf['version'] >= 8) {
    $sql = <<<'EOS'
SET @pt=ST_SRID(Point(?,?),4326)
EOS;
  } else {
    $sql = <<<'EOS'
SET @pt=ST_GeomFromText(CONCAT('POINT(',?,' ',?,')'),4326)
EOS;
  }
  $sth = $dbh->prepare($sql);
  $sth->bindValue(1, $lon, PDO::PARAM_STR);
  $sth->bindValue(2, $lat, PDO::PARAM_STR);
  $sth->execute();
  $sth = null;
  if ($mode === 'rgc') {
    $sql = <<<'EOS'
SELECT code,name
FROM gyosei
LEFT JOIN city USING (code)
WHERE ST_Contains(area,@pt)
LIMIT 1
EOS;
    $sth = $dbh->prepare($sql);
    $sth->execute();
    $code = 0;
    $name = 'unknown';
    while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
      $code = $row->code;
      $name = $row->name;
    }
    $sth = null;
    $output = array( 'code' => $code, 'name' => $name );
  } else {
    $sql = <<<'EOS'
SELECT type,mapno,name
FROM zumei
WHERE ST_Contains(area,@pt)
ORDER BY type
EOS;
    $sth = $dbh->prepare($sql);
    $sth->execute();
    $maps = array();
    while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
      $maps[] = array(
        'type' => $row->type,
        'mapno' => $row->mapno,
        'name' => $row->name
      );
    }
    $sth = null;
    $output = array( 'maps' => $maps );
  }
  header('Content-type: application/json; charset=UTF-8');
  header('Cache-Control: max-age=604800');
  echo json_encode($output, JSON_UNESCAPED_UNICODE), PHP_EOL;
} elseif ($mode != 'end') {
#
# JSON出力
#
  $c = filter_input($type, 'c');
  $geo = array();
  $rec = array();
  if ($mode === 'rec' && $c > 0) {
    $sql = <<<'EOS'
SELECT id,m.kana,m.name,alt,lat,lon,city.name AS address,auth,note
FROM geo
JOIN (
 SELECT *
 FROM meizan
 WHERE cat=?
) AS m USING(id)
JOIN city USING (code)
WHERE id=?
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $c, PDO::PARAM_INT);
    $sth->bindValue(2, $val, PDO::PARAM_INT);
  } elseif ($mode === 'id' || $mode === 'rec' || preg_match('/^[0-9]+$/', $val)) {
    if ($val > 0) {
      $sql = <<<'EOS'
SELECT id,kana,geo.name,alt,lat,lon,city.name AS address,auth,note
FROM geo
JOIN city USING (code)
WHERE id=?
EOS;
      $sth = $dbh->prepare($sql);
      $sth->bindValue(1, $val, PDO::PARAM_INT);
    } else {
      $sql = <<<'EOS'
SELECT id,kana,geo.name,alt,lat,lon,city.name AS address,auth,note
FROM geo
JOIN city USING (code)
WHERE act>0
ORDER BY id DESC
LIMIT 20
EOS;
      $sth = $dbh->prepare($sql);
    }
  } else {
    $loc = '';
    if (($m = mb_strpos($val, '@', 0, 'UTF-8')) > 0) {
      $loc = mb_substr($val, $m + 1);
      $val = mb_substr($val, 0, $m);
    }
    if (substr($val, 0, 1) === '%' || substr($val, -1, 1) === '%') {
      $eq = ' LIKE ';
    } else {
      $eq = '=';
    }
    if ($loc) {
      $sql = <<<EOS
SELECT id,geo.kana,geo.name,alt,lat,lon,city.name AS address,auth,note
FROM geo
JOIN (
 SELECT DISTINCT id
 FROM sanmei
 WHERE name$eq?
) AS s USING(id)
JOIN city USING (code)
WHERE act>0 AND city.name LIKE ?
ORDER BY alt DESC
LIMIT 400
EOS;
      $sth = $dbh->prepare($sql);
      $sth->bindValue(1, $val, PDO::PARAM_STR);
      $sth->bindValue(2, $loc . '%', PDO::PARAM_STR);
    } else {
      $sql = <<<EOS
SELECT id,geo.kana,geo.name,alt,lat,lon,city.name AS address,auth,note
FROM geo
JOIN (
 SELECT DISTINCT id
 FROM sanmei
 WHERE name$eq?
) AS s USING(id)
JOIN city USING (code)
WHERE act>0
ORDER BY alt DESC
LIMIT 400
EOS;
      $sth = $dbh->prepare($sql);
      $sth->bindValue(1, $val, PDO::PARAM_STR);
    }
  }
  $sth->execute();
  while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
    $id = $row->id;
    $name = $row->name;
    $kana = $row->kana;
    if (!($mode === 'rec' && $c > 0) && isset($g_name[$id])) {
      $name = $g_name[$id] . '・' . $name;
      $kana = $g_kana[$id] . '・' . $kana;
    }
    $geo[] = array(
      'id' => $id,
      'kana' => $kana,
      'name' => $name,
      'alt' => $row->alt,
      'lat' => $row->lat,
      'lon' => $row->lon,
      'address' => $row->address,
      'auth' => $row->auth,
      'note' => $row->note
    );
  }
  $sth = null;

  if ($mode === 'id') {
    $alias = array();
    $sql = <<<'EOS'
SELECT kana,name
FROM sanmei
WHERE id=? AND type>1
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $val, PDO::PARAM_INT);
    $sth->execute();
    while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
      $alias[] = array('kana' => $row->kana, 'name' => $row->name);
    }
    $sth = null;
    $geo[0]['alias'] = $alias;
  } elseif ($mode === 'rec') {
    $sql = <<<'EOS'
SELECT summit,link,record.start,end,title,summary,image
FROM record
JOIN (
 SELECT *
 FROM explored
 WHERE id=?
) AS e USING (rec)
WHERE link IS NOT NULL
ORDER BY summit DESC
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $val, PDO::PARAM_INT);
    $sth->execute();
    while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
      $rec[] = array(
        'summit' => $row->summit,
        'link' => $row->link,
        'start' => $row->start,
        'end' => $row->end,
        'title' => $row->title,
        'summary' => $row->summary,
        'image' => $row->image
      );
    }
    $sth = null;
  }
  $output = array('geo' => $geo, 'rec' => $rec);
  header('Content-type: application/json; charset=UTF-8');
  header('Cache-Control: max-age=604800');
  echo json_encode($output, JSON_UNESCAPED_UNICODE), PHP_EOL;
}
$dbh = null;
