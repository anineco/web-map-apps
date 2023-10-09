#!/usr/bin/env perl

# calculate administrative area code

use strict;
use warnings;
use utf8;
use open qw(:utf8 :std);

use DBI;
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

#my $sth1 = $dbh->prepare(<<'EOS');
#SELECT id,name FROM geom WHERE act>0
#EOS
my $sth1 = $dbh->prepare(<<'EOS');
SELECT id,name FROM geom
LEFT JOIN location USING(id)
WHERE act>0 AND code IS NULL
EOS

# MySQL 5
#my $sth2 = $dbh->prepare(<<'EOS');
#SELECT ST_Buffer(pt,40*180.0/PI()/6378137.0) INTO @p FROM geom WHERE id=?
#EOS
# MySQL 8
my $sth2 = $dbh->prepare(<<'EOS');
SELECT ST_Buffer(pt,40) INTO @p FROM geom WHERE id=?
EOS

my $sth3 = $dbh->prepare(<<'EOS');
SELECT DISTINCT code,name FROM gyosei
JOIN city USING(code)
WHERE ST_Intersects(area,@p)
EOS

my $sth6 = $dbh->prepare(q{INSERT INTO location (id,code) VALUE (?,?)});

#my $t = localtime;
#my $timestamp = $t->strftime('%y%m%d');
#open(my $out, '>', "location_$timestamp.csv");
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
    #print $out join(',', ($id, $code)), "\n";
    $sth6->execute($id, $code);
    $sth6->finish;
  }
  $sth3->finish;
}
$sth1->finish;
#close($out);
$dbh->disconnect;
__END__
