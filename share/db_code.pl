#!/usr/bin/env perl

# calculate administrative area code

use strict;
use warnings;
use utf8;
use open qw(:utf8 :std);
use DBI;
use Time::Piece;

my $dsn = 'DBI:mysql:anineco_tozan;mysql_read_default_file=/home/anineco/.my.cnf'; # 🔖
my $dbh = DBI->connect($dsn, undef, undef, {mysql_enable_utf8mb4 => 1}) or die $DBI::errstr;

my $sth1 = $dbh->prepare(<<'EOS');
SELECT id,name FROM geom
LEFT JOIN location USING(id)
WHERE code IS NULL
EOS

my $sth2 = $dbh->prepare(<<'EOS');
SELECT ST_Buffer(pt,0.00036) INTO @p FROM geom
WHERE id=?
EOS

my $sth3 = $dbh->prepare(<<'EOS');
SELECT DISTINCT code,name FROM gyosei
JOIN city USING(code)
WHERE ST_Intersects(area,@p)
EOS

my $sth6 = $dbh->prepare(<<'EOS');
INSERT INTO location (id,code) VALUE (?,?)
EOS

my $count = 0;
$sth1->execute;
while (my $row1 = $sth1->fetch) {
  my ($id, $yama) = @$row1;
  $sth2->execute(($id));
  $sth2->finish;
  $sth3->execute;
  while (my $row3 = $sth3->fetch) {
    my ($code, $name) = @$row3;
    print join(',', ($id, $yama, $code, $name)), "\n";
    $sth6->execute($id, $code);
    $sth6->finish;
  }
  $sth3->finish;
}
$sth1->finish;
$dbh->disconnect;
__END__
