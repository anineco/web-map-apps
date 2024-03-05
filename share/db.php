<?php
session_start();
$cf = parse_ini_file('/home/anineco/.my.cnf'); # 🔖 設定ファイル
$dsn = "mysql:dbname=$cf[database];host=$cf[host];charset=utf8mb4";
$dbh = new PDO($dsn, $cf['user'], $cf['password']);

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
#
# 新規登録・修正
#
  if (!isset($_SESSION['username'])) {
    http_response_code(403); # Forbidden
    $dbh = null;
    exit;
  }
  $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
  $alt = filter_input(INPUT_POST, 'alt', FILTER_VALIDATE_INT);
  $lat = filter_input(INPUT_POST, 'lat', FILTER_VALIDATE_FLOAT, [
    'options' => [ 'min_range' => -90, 'max_range' => 90 ]
  ]);
  $lon = filter_input(INPUT_POST, 'lon', FILTER_VALIDATE_FLOAT, [
    'options' => [ 'min_range' => -180, 'max_range' => 180 ]
  ]);
  $name = filter_input(INPUT_POST, 'name');
  $kana = filter_input(INPUT_POST, 'kana');
  foreach (array($id, $alt, $lat, $lon, $name, $kana) as $v) {
    if (is_null($v) || $v === false) {
      http_response_code(400); # Bad Request
      $dbh = null;
      exit;
    }
  }
  if ($id > 0) {
#
# 修正
#
    $sql = <<<'EOS'
UPDATE geom
SET alt=?,pt=ST_GeomFromText(?,4326/*!80003 ,'axis-order=long-lat' */),name=?,kana=?
WHERE id=?
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $alt, PDO::PARAM_INT);
    $sth->bindValue(2, "POINT($lon $lat)");
    $sth->bindValue(3, $name);
    $sth->bindValue(4, $kana);
    $sth->bindValue(5, $id, PDO::PARAM_INT);
    $sth->execute();
    $sth = null;
  } else {
#
# 新規登録
#
    $sql = <<<'EOS'
INSERT INTO geom (alt,pt,name,kana) VALUES
(?,ST_GeomFromText(?,4326/*!80003 ,'axis-order=long-lat' */),?,?)
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $alt, PDO::PARAM_INT);
    $sth->bindValue(2, "POINT($lon $lat)");
    $sth->bindValue(3, $name);
    $sth->bindValue(4, $kana);
    $sth->execute();
    $sth = null;

    $sth = $dbh->query('SELECT LAST_INSERT_ID()');
    $id = $sth->fetchColumn();
    $sth = null;
  }

  #
  # sanmei 更新
  #
  $sth = $dbh->prepare('DELETE FROM sanmei WHERE id=? AND type<2');
  $sth->bindValue(1, $id, PDO::PARAM_INT);
  $sth->execute();
  $sth = null;

  $ka = explode('・', $kana);
  $na = explode('・', $name);

  if (count($na) > 1 && count($ka) > 1) {
    # 総称
    $sth = $dbh->prepare('INSERT INTO sanmei VALUES (?,0,?,?)');
    $sth->bindValue(1, $id, PDO::PARAM_INT);
    $sth->bindValue(2, $ka[0]);
    $sth->bindValue(3, $na[0]);
    $sth->execute();
    $sth = null;
    $kana = $ka[1];
    $name = $na[1];
  }

  $sth = $dbh->prepare('INSERT INTO sanmei VALUES (?,1,?,?)');
  $sth->bindValue(1, $id, PDO::PARAM_INT);
  $sth->bindValue(2, $kana);
  $sth->bindValue(3, $name);
  $sth->execute();
  $sth = null;

  #
  # location 更新
  #
  $sth = $dbh->prepare('DELETE FROM location WHERE id=?');
  $sth->bindValue(1, $id, PDO::PARAM_INT);
  $sth->execute();
  $sth = null;

  # 🔖：MySQL8 40[m]、MySQL5 0.00036[deg]
  $sql = <<<'EOS'
SELECT ST_Buffer(pt,0.00036) INTO @g FROM geom WHERE id=?
EOS;
  $sth = $dbh->prepare($sql);
  $sth->bindValue(1, $id, PDO::PARAM_INT);
  $sth->execute();
  $sth = null;

  $sql = <<<'EOS'
INSERT INTO location
SELECT DISTINCT ?,code FROM gyosei
WHERE ST_Intersects(area,@g)
EOS;
  $sth = $dbh->prepare($sql);
  $sth->bindValue(1, $id, PDO::PARAM_INT);
  $sth->execute();
  $sth = null;

  header('Content-Type: text/plain; charset=UTF-8');
  echo 'SUCCESS';
  $dbh = null;
  exit;
}

$cat = filter_input(INPUT_GET, 'cat', FILTER_VALIDATE_INT);

if (isset($cat)) {
#
# GeoJSON出力
#
  $v = filter_input(INPUT_GET, 'v', FILTER_VALIDATE_INT);
  $sql = null;
  if ($cat == 0) {
    if ($v == 0) {
#
# 全国
#
      $sql = <<<'EOS'
SELECT id,name,lat,lon,1 AS c FROM geom
EOS;
    } else if ($v == 1) {
#
# 山行記録のある山を抽出
#
      $sql = <<<'EOS'
SELECT id,name,lat,lon,1 AS c FROM geom
JOIN (
 SELECT DISTINCT id FROM explored
 JOIN record USING (rec)
 WHERE link IS NOT NULL
) AS e USING (id)
EOS;
    } else if ($v == 2) {
#
# 山+山行記録数を抽出
#
      $sql = <<<'EOS'
SELECT id,name,lat,lon,COUNT(rec) AS c FROM geom
LEFT JOIN (
 SELECT id,rec FROM explored
 JOIN record USING (rec)
 WHERE link IS NOT NULL
) AS e USING (id)
GROUP BY id
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
 SELECT id,name FROM meizan
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
 SELECT id,name FROM meizan
 WHERE cat=?
) AS m USING (id)
JOIN (
 SELECT DISTINCT id FROM explored
 JOIN record USING (rec)
 WHERE link IS NOT NULL
) AS e USING (id)
EOS;
    } else if ($v == 2) {
#
# 名山カテゴリを指定して山＋山行記録数を抽出
#
      $sql = <<<'EOS'
SELECT id,m.name,lat,lon,COUNT(rec) AS c FROM geom
JOIN (
 SELECT id,name FROM meizan
 WHERE cat=?
) AS m USING (id)
LEFT JOIN (
 SELECT id,rec FROM explored
 JOIN record USING (rec)
 WHERE link IS NOT NULL
) AS e USING (id)
GROUP BY id
EOS;
    }
  }
  if (!isset($sql)) {
    http_response_code(400); # Bad Request
    $dbh = null;
    exit;
  }
  $sth = $dbh->prepare($sql);
  if ($cat > 0) {
    $sth->bindValue(1, $cat, PDO::PARAM_INT); # 名山カテゴリ
  }
  $sth->execute();
  header('Content-Type: application/geo+json; charset=UTF-8');
  header('Cache-Control: no-store, max-age=0');
  echo '{"type":"FeatureCollection","features":[', PHP_EOL;
  $count = 0;
  while ($row = $sth->fetch(PDO::FETCH_ASSOC)) {
    if ($count > 0) {
      echo ',', PHP_EOL;
    }
    echo <<<EOS
{"id":$row[id],"type":"Feature","properties":{"name":"$row[name]","c":$row[c]},
"geometry":{"type":"Point","coordinates":[$row[lon],$row[lat]]}}
EOS;
    $count++;
  }
  if ($count > 0) {
    echo PHP_EOL;
  }
  echo ']}', PHP_EOL;
  $sth = null;
  $dbh = null;
  exit;
}

$rgc = filter_input(INPUT_GET, 'rgc');
$zu = filter_input(INPUT_GET, 'zu');

if (isset($rgc) || isset($zu)) {
#
# 逆ジオコーディング
#
  $lat = filter_input(INPUT_GET, 'lat', FILTER_VALIDATE_FLOAT, [
    'options' => ['min_range' => -90, 'max_range' => 90]
  ]);
  $lon = filter_input(INPUT_GET, 'lon', FILTER_VALIDATE_FLOAT, [
    'options' => [ 'min_range' => -180, 'max_range' => 180]
  ]);
  if (!isset($lat, $lon) || $lat === false || $lon === false) {
    http_response_code(400); # Bad Request
    $dbh = null;
    exit;
  }
  $sql = <<<'EOS'
SET @pt=ST_GeomFromText(?,4326/*!80003 ,'axis-order=long-lat' */)
EOS;
  $sth = $dbh->prepare($sql);
  $sth->bindValue(1, "POINT($lon $lat)");
  $sth->execute();
  $sth = null;
  if (isset($rgc)) {
#
# 都道府県＋市区町村
#
    $sql = <<<'EOS'
SELECT code,name FROM gyosei
LEFT JOIN city USING (code)
WHERE ST_Contains(area,@pt)
EOS;
  } else {
#
# 地形図名
#
    $sql = <<<'EOS'
SELECT type,mapno,name FROM zumei
WHERE ST_Contains(area,@pt)
ORDER BY type DESC
EOS;
  }
  $sth = $dbh->query($sql);
  $output = $sth->fetchAll(PDO::FETCH_ASSOC);
  $sth = null;
  header('Content-Type: application/json; charset=UTF-8');
  header('Cache-Control: no-store, max-age=0');
  echo json_encode($output, JSON_UNESCAPED_UNICODE), PHP_EOL;
  $dbh = null;
  exit;
}

#
# JSON出力
#

$mode = null;
foreach (array('id', 'rec', 'q') as $i) {
  $val = filter_input(INPUT_GET, $i);
  if (isset($val)) {
    $mode = $i;
    break;
  }
}
if (!isset($mode)) {
  http_response_code(400); # Bad Request
  $dbh = null;
  exit;
}

$c = filter_input(INPUT_GET, 'c', FILTER_VALIDATE_INT);

if ($mode == 'rec' && $c > 0) {
#
# 名山カテゴリを指定してREC検索
#
  $sql = <<<'EOS'
SELECT id,m.kana,m.name,alt,lat,lon FROM geom
JOIN (
 SELECT id,kana,name FROM meizan
 WHERE cat=?
) AS m USING(id)
WHERE id=?
EOS;
  $sth = $dbh->prepare($sql);
  $sth->bindValue(1, $c, PDO::PARAM_INT);
  $sth->bindValue(2, $val, PDO::PARAM_INT);
} elseif ($mode == 'id' || $mode == 'rec' || preg_match('/^[0-9]+$/', $val)) {
  if ($val > 0) {
#
# ID/REC検索
#
    $sql = <<<'EOS'
SELECT id,kana,name,alt,lat,lon FROM geom
WHERE id=?
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $val, PDO::PARAM_INT);
  } else {
#
# 最新の登録
#
    $sql = <<<'EOS'
SELECT id,kana,name,alt,lat,lon FROM geom
ORDER BY id DESC
LIMIT 100
EOS;
    $sth = $dbh->prepare($sql);
  }
} else {
  $loc = '';
  $m = explode('@', $val);
  if (count($m) > 1) {
    $val = $m[0];
    $loc = $m[1] . '%'; # 前方一致検索
  }
  if (substr($val, 0, 1) == '%' || substr($val, -1, 1) == '%') {
    $eq = ' LIKE ';
  } else {
    $eq = '=';
  }
  if ($loc) {
#
# 山名＋所在地検索
#
    $sql = <<<EOS
SELECT DISTINCT id,kana,name,alt,lat,lon FROM geom
JOIN (
 SELECT id FROM sanmei
 WHERE name$eq?
) AS m USING(id)
JOIN (
 SELECT id FROM location
 JOIN city USING (code)
 WHERE name LIKE ?
) AS g USING (id)
ORDER BY alt DESC
LIMIT 1000
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $val);
    $sth->bindValue(2, $loc);
  } else {
#
# 山名検索
#
    $sql = <<<EOS
SELECT DISTINCT id,kana,name,alt,lat,lon FROM geom
JOIN (
 SELECT id FROM sanmei
 WHERE name$eq?
) AS m USING(id)
ORDER BY alt DESC
LIMIT 1000
EOS;
    $sth = $dbh->prepare($sql);
    $sth->bindValue(1, $val);
  }
}
$sth->execute();
$geo = $sth->fetchAll(PDO::FETCH_ASSOC);
$sth = null;
#
# 追加情報
#
if ($mode == 'id' || $mode == 'rec') {
#
# 別名
#
  $sql = <<<'EOS'
SELECT kana,name FROM sanmei
WHERE id=? AND type>1
EOS;
  $sth = $dbh->prepare($sql);
  $sth->bindValue(1, $val, PDO::PARAM_INT);
  $sth->execute();
  $geo[0]['alias'] = $sth->fetchAll(PDO::FETCH_ASSOC);
  $sth = null;
#
# 所在地
#
  $sql = <<<'EOS'
SELECT name FROM city
JOIN location USING (code)
WHERE id=?
EOS;
  $sth = $dbh->prepare($sql);
  $sth->bindValue(1, $val, PDO::PARAM_INT);
  $sth->execute();
  $geo[0]['address'] = $sth->fetchAll(PDO::FETCH_COLUMN);
  $sth = null;
}

$rec = array();
if ($mode == 'rec') {
#
# 山行記録
#
  $sql = <<<'EOS'
SELECT link,start,end,title,summary,image FROM record
JOIN (
 SELECT rec FROM explored
 WHERE id=?
) AS e USING (rec)
WHERE link IS NOT NULL
ORDER BY start DESC
EOS;
  $sth = $dbh->prepare($sql);
  $sth->bindValue(1, $val, PDO::PARAM_INT);
  $sth->execute();
  $rec = $sth->fetchAll(PDO::FETCH_ASSOC);
  $sth = null;
}
$output = array('geo' => $geo, 'rec' => $rec);
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');
echo json_encode($output, JSON_UNESCAPED_UNICODE), PHP_EOL;
$dbh = null;
# __END__
