<?php
$cf = parse_ini_file('/home/anineco/.my.cnf'); # 🔖 設定ファイル
$dsn = "mysql:host=$cf[host];dbname=$cf[database];charset=utf8mb4";
$dbh = new PDO($dsn, $cf['user'], $cf['password']);

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

$g_kana = array();
$g_name = array();
if ($mode !== 'rgc' && $mode !== 'zu') {
#
# 総称
#
  $sql = <<<'EOS'
SELECT id,kana,name FROM sanmei
WHERE type=0
EOS;
  $sth = $dbh->prepare($sql);
  $sth->execute();
  while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
    $g_kana[$row->id] = $row->kana;
    $g_name[$row->id] = $row->name;
  }
  $sth = null;
}

if ($mode === 'cat') {
#
# GeoJSON出力
#
  $v = filter_input($type, 'v');
  if ($val == 0) {
    if ($v == 0) {
#
# 全国
#
      $sql = <<<'EOS'
SELECT id,name,lat,lon,1 AS c FROM geom
WHERE act>0
EOS;
    } else if ($v == 1) {
#
# 山行記録のある山を抽出
#
      $sql = <<<'EOS'
SELECT id,name,lat,lon,1 AS c FROM geom
JOIN (
 SELECT DISTINCT id FROM explored
 JOIN (
  SELECT * FROM record
  WHERE link IS NOT NULL
 ) AS r USING (rec)
) AS e USING (id)
EOS;
    } else if ($v == 2) {
#
# 山+山行記録数を抽出 ※0ではなくNULLが返る
#
      $sql = <<<'EOS'
SELECT id,name,lat,lon,c FROM geom
LEFT JOIN (
 SELECT id,COUNT(rec) AS c FROM explored
 JOIN (
  SELECT * FROM record
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
SELECT id,m.name,lat,lon,1 AS c FROM geom
JOIN (
 SELECT * FROM meizan
 WHERE cat=?
) AS m USING (id)
EOS;
    } else if ($v == 1) {
#
# 名山カテゴリを指定して山行記録のある山を抽出
#
      $sql = <<<'EOS'
SELECT id,m.name,lat,lon,1 AS c FROM geom
JOIN (
 SELECT * FROM meizan
 WHERE cat=?
) AS m USING (id)
JOIN (
 SELECT DISTINCT id FROM explored
 JOIN (
  SELECT * FROM record
  WHERE link IS NOT NULL
 ) AS r USING (rec)
) AS e USING (id)
EOS;
    } else if ($v == 2) {
#
# 名山カテゴリを指定して山＋山行記録数を抽出 ※0ではなくNULLが返る
#
      $sql = <<<'EOS'
SELECT id,m.name,lat,lon,c FROM geom
JOIN (
 SELECT * FROM meizan
 WHERE cat=?
) AS m USING (id)
LEFT JOIN (
 SELECT id,COUNT(rec) AS c FROM explored
 JOIN (
  SELECT * FROM record
  WHERE link IS NOT NULL
 ) AS r USING (rec) GROUP BY id
) AS e USING (id)
EOS;
    }
  }
  $sth = $dbh->prepare($sql);
  if ($val > 0) {
    $sth->bindValue(1, $val, PDO::PARAM_INT); # 名山カテゴリ
  }
  $sth->execute();
  header('Content-type: application/geo+json; charset=UTF-8');
  header('Cache-Control: no-store, max-age=0');
  echo '{"type":"FeatureCollection","features":[', PHP_EOL;
  $count = 0;
  while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
    if ($count > 0) {
      echo ',', PHP_EOL;
    }
    $id = $row->id;
    $name = $row->name;
    # cat=0 の場合、総称があれば付加
    if ($val == 0 && isset($g_name[$id])) {
      $name = $g_name[$id] . '・' . $name;
    }
    $c = $row->c ? 1 : 0;
    $lat = $row->lat;
    $lon = $row->lon;
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
# 逆ジオコーディング
#
  $lon = filter_input($type, 'lon');
  $lat = filter_input($type, 'lat');
  $wkt = "POINT($lon $lat)";
  $sql = <<<'EOS'
SET @pt=ST_GeomFromText(?,4326/*!80003 ,'axis-order=long-lat' */)
EOS;
  $sth = $dbh->prepare($sql);
  $sth->bindValue(1, $wkt, PDO::PARAM_STR);
  $sth->execute();
  $sth = null;
  if ($mode === 'rgc') {
#
# 都道府県＋市区町村
#
    $sql = <<<'EOS'
SELECT code,name FROM gyosei
LEFT JOIN city USING (code)
WHERE ST_Contains(area,@pt)
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
  } else {
#
# 地形図名
#
    $sql = <<<'EOS'
SELECT type,mapno,name FROM zumei
WHERE ST_Contains(area,@pt)
ORDER BY type DESC
EOS;
    $sth = $dbh->prepare($sql);
    $sth->execute();
    $output = array();
    while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
      $output[] = array(
        'type' => $row->type,
        'mapno' => $row->mapno,
        'name' => $row->name
      );
    }
    $sth = null;
  }
  header('Content-type: application/json; charset=UTF-8');
  header('Cache-Control: no-store, max-age=0');
  echo json_encode($output, JSON_UNESCAPED_UNICODE), PHP_EOL;
} elseif ($mode != 'end') {
#
# JSON出力
#
  $c = filter_input($type, 'c');
  $geo = array();
  $rec = array();
  if ($mode === 'rec' && $c > 0) {
#
# 名山カテゴリを指定してREC検索
#
    $sql = <<<'EOS'
SELECT id,m.kana,m.name,alt,lat,lon FROM geom
JOIN (
 SELECT * FROM meizan
 WHERE cat=?
) AS m USING(id)
WHERE id=?
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $c, PDO::PARAM_INT);
    $sth->bindValue(2, $val, PDO::PARAM_INT);
  } elseif ($mode === 'id' || $mode === 'rec' || preg_match('/^[0-9]+$/', $val)) {
    if ($val > 0) {
#
# ID/REC検索
#
      $sql = <<<'EOS'
SELECT id,kana,name,alt,lat,lon FROM geom
WHERE act>0 AND id=?
EOS;
      $sth = $dbh->prepare($sql);
      $sth->bindValue(1, $val, PDO::PARAM_INT);
    } else {
#
# 最新の登録
#
      $sql = <<<'EOS'
SELECT id,kana,name,alt,lat,lon FROM geom
WHERE act>0
ORDER BY id DESC
LIMIT 100
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
#
# 山名＋所在地検索
#
      $sql = <<<EOS
SELECT DISTINCT id,geom.kana,geom.name,alt,lat,lon FROM geom
JOIN (
 SELECT * FROM sanmei
 WHERE name$eq?
) AS s USING(id)
JOIN (
 SELECT * FROM location
 JOIN city USING (code)
 WHERE name LIKE ?
) AS g USING (id)
ORDER BY alt DESC
LIMIT 1000
EOS;
      $sth = $dbh->prepare($sql);
      $sth->bindValue(1, $val, PDO::PARAM_STR);
      $sth->bindValue(2, $loc . '%', PDO::PARAM_STR);
    } else {
#
# 山名検索
#
      $sql = <<<EOS
SELECT DISTINCT id,geom.kana,geom.name,alt,lat,lon FROM geom
JOIN (
 SELECT * FROM sanmei
 WHERE name$eq?
) AS s USING(id)
ORDER BY alt DESC
LIMIT 1000
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
    # 「名山カテゴリを指定してREC検索」以外は総称があれば付加
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
      'auth' => 1
    );
  }
  $sth = null;
#
# 追加情報
#
  if ($mode === 'id' || $mode === 'rec') {
#
# 別名
#
    $alias = array();
    $sql = <<<'EOS'
SELECT kana,name FROM sanmei
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
#
# 所在地
#
    $address = array();
    $sql = <<<'EOS'
SELECT name FROM city
JOIN location USING (code)
WHERE id=?
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $val, PDO::PARAM_INT);
    $sth->execute();
    while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
      $address[] = $row->name;
    }
    $sth = null;
    $geo[0]['address'] = $address;
  }
  if ($mode === 'rec') {
#
# 山行記録
#
    $sql = <<<'EOS'
SELECT link,start,end,title,summary,image FROM record
JOIN (
 SELECT * FROM explored
 WHERE id=?
) AS e USING (rec)
WHERE link IS NOT NULL
ORDER BY start DESC
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $val, PDO::PARAM_INT);
    $sth->execute();
    while ($row = $sth->fetch(PDO::FETCH_OBJ)) {
      $rec[] = array(
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
  header('Cache-Control: no-store, max-age=0');
  echo json_encode($output, JSON_UNESCAPED_UNICODE), PHP_EOL;
}
$dbh = null;
