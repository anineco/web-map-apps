-- MySQL dump 10.13  Distrib 8.0.23, for osx11.1 (x86_64)
--
-- Host: localhost    Database: DB_DATABASE
-- ------------------------------------------------------
-- Server version	8.0.22

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `city`
--

DROP TABLE IF EXISTS `city`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `city` (
  `code` smallint unsigned NOT NULL COMMENT '行政区域コード',
  `name` varchar(255) NOT NULL COMMENT '都道府県+市区町村名',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `explored`
--

DROP TABLE IF EXISTS `explored`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `explored` (
  `rec` smallint unsigned NOT NULL COMMENT '山行記録ID',
  `start` date NOT NULL COMMENT '開始日',
  `summit` date NOT NULL COMMENT '登頂日',
  `id` smallint unsigned NOT NULL COMMENT 'ID',
  `name` varchar(255) NOT NULL COMMENT '山名',
  UNIQUE KEY `idx_explored` (`rec`,`id`),
  KEY `id` (`id`) USING BTREE,
  KEY `rec` (`rec`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `geo`
--

DROP TABLE IF EXISTS `geo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `geo` (
  `id` smallint unsigned NOT NULL COMMENT 'ID',
  `act` tinyint(1) NOT NULL COMMENT '0:無効，1:有効',
  `kana` varchar(255) NOT NULL COMMENT 'よみ',
  `name` varchar(255) NOT NULL COMMENT '山名',
  `alt` smallint NOT NULL COMMENT '標高[m]',
  `lat` mediumint NOT NULL COMMENT '緯度（dms）',
  `lon` mediumint NOT NULL COMMENT '経度（dms）',
  `code` smallint unsigned DEFAULT NULL COMMENT '行政区域コード',
  `auth` tinyint unsigned DEFAULT '0' COMMENT '出典',
  `note` text COMMENT '記事',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`DB_USER`@`%`*/ /*!50003 TRIGGER `insert_sanmei` AFTER INSERT ON `geo` FOR EACH ROW INSERT INTO sanmei VALUES (NEW.id, 1, NEW.kana, NEW.name) */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`DB_USER`@`%`*/ /*!50003 TRIGGER `update_sanmei` AFTER UPDATE ON `geo` FOR EACH ROW UPDATE sanmei SET id=NEW.id,kana=NEW.kana,name=NEW.name
WHERE id=OLD.id AND type=1 */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `gyosei`
--

DROP TABLE IF EXISTS `gyosei`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gyosei` (
  `code` smallint unsigned NOT NULL COMMENT '行政区域コード',
  `area` geometry NOT NULL /*!80003 SRID 4326 */ COMMENT '範囲',
  SPATIAL KEY `area` (`area`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `meizan`
--

DROP TABLE IF EXISTS `meizan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meizan` (
  `cat` tinyint unsigned NOT NULL COMMENT 'カテゴリ',
  `seqno` smallint unsigned NOT NULL COMMENT 'カテゴリ内の順序',
  `id` smallint unsigned NOT NULL COMMENT 'ID',
  `kana` varchar(255) NOT NULL COMMENT 'よみ',
  `name` varchar(255) NOT NULL COMMENT '山名',
  UNIQUE KEY `idx_meizan` (`cat`,`id`),
  KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `poi`
--

DROP TABLE IF EXISTS `poi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poi` (
  `ptid` mediumint unsigned NOT NULL COMMENT 'PTID',
  `act` tinyint(1) NOT NULL COMMENT '0:無効, 1:有効',
  `kana` varchar(255) NOT NULL COMMENT 'よみ',
  `name` varchar(255) NOT NULL COMMENT '山名',
  `alt` smallint NOT NULL COMMENT '標高[m]',
  `lat` mediumint NOT NULL COMMENT '緯度（dms)',
  `lon` mediumint NOT NULL COMMENT '経度（dms）',
  `id` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'ID',
  `c` tinyint NOT NULL DEFAULT '-1' COMMENT '一致度',
  PRIMARY KEY (`ptid`),
  KEY `id` (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `record`
--

DROP TABLE IF EXISTS `record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `record` (
  `rec` smallint unsigned NOT NULL COMMENT '山行記録ID',
  `start` date NOT NULL COMMENT '開始日',
  `end` date NOT NULL COMMENT '終了日',
  `issue` date DEFAULT NULL COMMENT '公開日',
  `title` varchar(255) NOT NULL COMMENT 'タイトル',
  `summary` varchar(255) DEFAULT NULL COMMENT '概略',
  `link` varchar(255) DEFAULT NULL COMMENT '山行記録URL',
  `image` varchar(255) DEFAULT NULL COMMENT '画像URL',
  PRIMARY KEY (`rec`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sanmei`
--

DROP TABLE IF EXISTS `sanmei`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sanmei` (
  `id` smallint unsigned NOT NULL COMMENT 'ID',
  `type` tinyint NOT NULL COMMENT '0:総称，1:山名，2:別名',
  `kana` varchar(255) NOT NULL COMMENT 'よみ',
  `name` varchar(255) NOT NULL COMMENT '山名',
  UNIQUE KEY `idx_sanmei` (`id`,`kana`,`name`),
  KEY `name` (`name`) USING BTREE,
  KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `zumei`
--

DROP TABLE IF EXISTS `zumei`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zumei` (
  `type` tinyint NOT NULL COMMENT '種別',
  `mapno` varchar(255) NOT NULL COMMENT '地図番号',
  `name` varchar(255) NOT NULL COMMENT '図名',
  `area` geometry NOT NULL /*!80003 SRID 4326 */ COMMENT '範囲',
  SPATIAL KEY `area` (`area`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2021-01-26  2:47:55
