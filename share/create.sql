CREATE TABLE `city` (
  `code` smallint unsigned NOT NULL COMMENT '行政区域コード',
  `name` varchar(255) NOT NULL COMMENT '都道府県+市区町村名',
  PRIMARY KEY (`code`)
);

CREATE TABLE `explored` (
  `rec` smallint unsigned NOT NULL COMMENT '山行記録ID',
  `summit` date DEFAULT NULL COMMENT '登頂日',
  `id` smallint unsigned NOT NULL COMMENT 'ID',
  UNIQUE KEY `idx_explored` (`rec`,`id`),
  KEY `id` (`id`) USING BTREE,
  KEY `rec` (`rec`)
);

CREATE TABLE `gcp` (
  `fid` varchar(255) NOT NULL COMMENT '基盤地図情報レコードID',
  `grade` tinyint NOT NULL COMMENT '等級',
  `pt` point NOT NULL /*!80003 SRID 4326 */ COMMENT '位置',
  `alt` decimal(7,3) NOT NULL COMMENT '標高',
  `name` varchar(255) NOT NULL COMMENT '点名',
  UNIQUE KEY `fid` (`fid`),
  SPATIAL KEY `pt` (`pt`)
);

CREATE TABLE `geom` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `kana` varchar(255) NOT NULL COMMENT 'よみ',
  `name` varchar(255) NOT NULL COMMENT '山名',
  `alt` smallint NOT NULL COMMENT '標高[m]',
  `pt` point NOT NULL /*!80003 SRID 4326 */ COMMENT '位置',
  `lat` decimal(10,6) GENERATED ALWAYS AS (st_latitude(`pt`)) VIRTUAL COMMENT '緯度',
  `lon` decimal(10,6) GENERATED ALWAYS AS (st_longitude(`pt`)) VIRTUAL COMMENT '経度',
  `level` tinyint NOT NULL DEFAULT '0' COMMENT '表示属性',
  `fid` varchar(255) DEFAULT NULL COMMENT '基盤地図情報レコードID',
  `auth` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '出典',
  PRIMARY KEY (`id`),
  SPATIAL KEY `pt` (`pt`)
);

CREATE TABLE `gyosei` (
  `code` smallint unsigned NOT NULL COMMENT '行政区域コード',
  `area` polygon NOT NULL /*!80003 SRID 4326 */ COMMENT '範囲',
  SPATIAL KEY `area` (`area`)
);

CREATE TABLE `location` (
  `id` smallint unsigned NOT NULL COMMENT 'ID',
  `code` smallint unsigned NOT NULL COMMENT '行政区域コード',
  UNIQUE KEY `idx_location` (`id`,`code`),
  KEY `id` (`id`),
  KEY `code` (`code`)
);

CREATE TABLE `meizan` (
  `cat` tinyint unsigned NOT NULL COMMENT 'カテゴリ',
  `seqno` smallint unsigned NOT NULL COMMENT 'カテゴリ内の順序',
  `id` smallint unsigned NOT NULL COMMENT 'ID',
  `kana` varchar(255) NOT NULL COMMENT 'よみ',
  `name` varchar(255) NOT NULL COMMENT '山名',
  UNIQUE KEY `idx_meizan` (`cat`,`id`),
  KEY `id` (`id`)
);

CREATE TABLE `poi` (
  `ptid` mediumint unsigned NOT NULL COMMENT 'PTID',
  `act` tinyint(1) NOT NULL COMMENT '0:無効, 1:有効',
  `kana` varchar(255) NOT NULL COMMENT 'よみ',
  `name` varchar(255) NOT NULL COMMENT '山名',
  `alt` smallint NOT NULL COMMENT '標高[m]',
  `pt` point NOT NULL /*!80003 SRID 4326 */ COMMENT '位置',
  `lat` decimal(10,6) GENERATED ALWAYS AS (st_latitude(`pt`)) VIRTUAL COMMENT '緯度',
  `lon` decimal(10,6) GENERATED ALWAYS AS (st_longitude(`pt`)) VIRTUAL COMMENT '経度',
  `grade` tinyint NOT NULL DEFAULT '0' COMMENT '等級',
  `id` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'ID',
  `c` tinyint NOT NULL DEFAULT '-1' COMMENT '一致度',
  PRIMARY KEY (`ptid`),
  KEY `id` (`id`) USING BTREE,
  SPATIAL KEY `pt` (`pt`)
);

CREATE TABLE `poi_location` (
  `ptid` mediumint unsigned NOT NULL COMMENT 'PTID',
  `code` smallint unsigned NOT NULL COMMENT '行政区域コード',
  UNIQUE KEY `idx_location` (`ptid`,`code`),
  KEY `ptid` (`ptid`),
  KEY `code` (`code`)
);

CREATE TABLE `record` (
  `rec` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT '山行記録ID',
  `start` date NOT NULL COMMENT '開始日',
  `end` date NOT NULL COMMENT '終了日',
  `issue` date DEFAULT NULL COMMENT '公開日',
  `title` varchar(255) NOT NULL COMMENT 'タイトル',
  `summary` varchar(255) DEFAULT NULL COMMENT '概略',
  `link` varchar(255) DEFAULT NULL COMMENT '山行記録URL',
  `image` varchar(255) DEFAULT NULL COMMENT '画像URL',
  PRIMARY KEY (`rec`)
);

CREATE TABLE `sanmei` (
  `id` smallint unsigned NOT NULL COMMENT 'ID',
  `type` tinyint NOT NULL COMMENT '0:総称，1:山名，2:別名',
  `kana` varchar(255) NOT NULL COMMENT 'よみ',
  `name` varchar(255) NOT NULL COMMENT '山名',
  UNIQUE KEY `idx_sanmei` (`id`,`kana`,`name`),
  KEY `name` (`name`) USING BTREE,
  KEY `id` (`id`)
);

CREATE TABLE `zumei` (
  `type` tinyint NOT NULL COMMENT '種別',
  `mapno` varchar(255) NOT NULL COMMENT '地図番号',
  `name` varchar(255) NOT NULL COMMENT '図名',
  `area` polygon NOT NULL /*!80003 SRID 4326 */ COMMENT '範囲',
  SPATIAL KEY `area` (`area`)
);

