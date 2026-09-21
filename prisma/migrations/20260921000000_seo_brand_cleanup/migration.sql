ALTER TABLE `Blog`
  ALTER COLUMN `authorName` SET DEFAULT 'APeakStrategy Team';

UPDATE `Blog`
SET `authorName` = 'APeakStrategy Team'
WHERE `authorName` = 'A Peak Strategy Team';

UPDATE `Work`
SET
  `shortDescription` = REPLACE(REPLACE(`shortDescription`, 'Apeakstrategy', 'APeakStrategy'), 'A Peak Strategy', 'APeakStrategy'),
  `overview` = REPLACE(REPLACE(`overview`, 'Apeakstrategy', 'APeakStrategy'), 'A Peak Strategy', 'APeakStrategy');

UPDATE `WorkParagraph`
SET `content` = REPLACE(REPLACE(`content`, 'Apeakstrategy', 'APeakStrategy'), 'A Peak Strategy', 'APeakStrategy');

UPDATE `Blog`
SET
  `excerpt` = REPLACE(REPLACE(`excerpt`, 'Apeakstrategy', 'APeakStrategy'), 'A Peak Strategy', 'APeakStrategy'),
  `seoTitle` = REPLACE(REPLACE(`seoTitle`, 'Apeakstrategy', 'APeakStrategy'), 'A Peak Strategy', 'APeakStrategy'),
  `seoDescription` = REPLACE(REPLACE(`seoDescription`, 'Apeakstrategy', 'APeakStrategy'), 'A Peak Strategy', 'APeakStrategy');

UPDATE `BlogParagraph`
SET `content` = REPLACE(REPLACE(`content`, 'Apeakstrategy', 'APeakStrategy'), 'A Peak Strategy', 'APeakStrategy');
