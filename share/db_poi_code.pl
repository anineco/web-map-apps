#!/usr/bin/env perl

# calculate administrative area code

use strict;
use warnings;
use utf8;
use open ':utf8';
use open ':std';

use DBI;
use DBD::mysql;
use Time::Piece;

require './init.pl';
my $cf = set_init();

my $dsn = 'DBI:mysql:database=' . $cf->{database};
if ($cf->{host} eq 'localhost') {
  $dsn .= ';mysql_socket=' . $cf->{socket}
} else {
  $dsn .= ';host=' . $cf->{host} . ($cf->{port} ? ';port=' . $cf->{port} : '');
}
my $dbh = DBI->connect($dsn, $cf->{user}, $cf->{password}, {mysql_enable_utf8mb4 => 1}) or die $DBI::errstr;

#my $sql = <<'EOS';
#SELECT ptid,name,lat,lon FROM poi
#WHERE act>0
#EOS
my $sql = <<'EOS';
SELECT ptid,name,lat,lon FROM poi
LEFT JOIN poi_location USING(ptid)
WHERE act>0 AND c>=0 AND code IS NULL
EOS
my $sth1 = $dbh->prepare($sql);

if ($cf->{version} >= 8) {
  $sql = <<'EOS';
SET @p=ST_GeomFromText(?,4326,'axis-order=long-lat')
EOS
} else {
  $sql = <<'EOS';
SET @p=ST_GeomFromText(?,4326)
EOS
}
my $sth2 = $dbh->prepare($sql);

$sql = <<'EOS';
SELECT DISTINCT code,name FROM gyosei
JOIN city USING(code)
WHERE ST_Intersects(area,@p)
EOS
my $sth3 = $dbh->prepare($sql);

#my $sth5 = $dbh->prepare(q{DELETE FROM poi_location WHERE ptid=?});
my $sth6 = $dbh->prepare(q{INSERT INTO poi_location (ptid,code) VALUE (?,?)});

sub dms2deg {
  my $dms = shift;
  $dms =~ /^(\d+)(\d\d)(\d\d)$/;
  return sprintf('%.6f', ($3 / 60 + $2) / 60 + $1);
}

sub dms2sec {
  my $dms = shift;
  $dms =~ /^(\d+)(\d\d)(\d\d)$/;
  return ($1 * 60 + $2) * 60 + $3;
}

sub sec2deg {
  my $sec = shift;
  return sprintf('%.6f', $sec / 3600);
}

#my $t = localtime;
#my $timestamp = $t->strftime('%y%m%d');
#open(my $out, '>', "location_$timestamp.csv");
my $count = 0;
my $d = 1;
$sth1->execute;
while (my @row1 = $sth1->fetchrow_array) {
  my ($ptid, $yama, $lat, $lon) = @row1;
  my $x = dms2sec($lon);
  my $y = dms2sec($lat);
  my $x0 = sec2deg($x - $d);
  my $y0 = sec2deg($y - $d);
  my $x1 = sec2deg($x + $d);
  my $y1 = sec2deg($y + $d);
  my $wkt = 'POLYGON((' . $x0 . ' ' . $y0
    . ',' . $x1 . ' ' . $y0
    . ',' . $x1 . ' ' . $y1
    . ',' . $x0 . ' ' . $y1
    . ',' . $x0 . ' ' . $y0 . '))';
  $sth2->execute($wkt);
  $sth2->finish;
  $sth3->execute;
  while (my @row3 = $sth3->fetchrow_array) {
    my ($code, $name) = @row3;
    print join(',', ($ptid, $yama, $code, $name)), "\n";
    #print $out join(',', ($ptid, $code)), "\n";
    $sth6->execute($ptid, $code);
    $sth6->finish;
  }
  $sth3->finish;
}
$sth1->finish;
#close($out);
$dbh->disconnect;
__END__
