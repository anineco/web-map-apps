<?php
$home = '/home/anineco'; # 🔖 user's home directory
$cf = parse_ini_file($home . '/.my.cnf'); # MySQL configuration
$dsn = "mysql:dbname=$cf[database];host=$cf[host];charset=utf8mb4;readOnly=1";
$dbh = new PDO($dsn, $cf['user'], $cf['password']);

# 位置の許容誤差（ST_Buffer の半径）
$sql = <<<'EOS'
SET @EPS=IF(0/*!80003 +1 */,40,0.00036) -- [m] or [deg]
EOS;
$dbh->exec($sql);

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
SET @g=ST_GeomFromText(?,4326/*!80003, 'axis-order=long-lat' */)
EOS;
$sth = $dbh->prepare($sql);
$sth->bindValue(1, "POINT($lon $lat)");
$sth->execute();
$sth = null;
#
# 最寄りの山名
#

# NOTE: ST_Distance_Sphere() is not available in MySQL 5.7, use ST_Distance() instead
$sql = <<<'EOS'
SELECT id,name,ST_Distance_Sphere(pt,@g) AS d FROM geom
ORDER BY d LIMIT 1
EOS;
$sth = $dbh->query($sql);
$output = $sth->fetchAll(PDO::FETCH_ASSOC);
$sth = null;
$dbh = null;
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');
echo json_encode($output, JSON_UNESCAPED_UNICODE), PHP_EOL;
# __END__
