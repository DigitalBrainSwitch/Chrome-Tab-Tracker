<?php 
$con = mysql_connect("digitalbrain-test.lancs.ac.uk","root","dbsproject2013");
if (!$con)
  {
  die('Could not connect: ' . mysql_error());
  }

$user_id = $_POST['user_id'];
$start = $_POST['start'];
$end = $_POST['end'];
$switches = $_POST['switches'];
$time = $_POST['time'];
$url = $_POST['url'];

mysql_select_db("wordpress", $con);

mysql_query("INSERT INTO `wordpress`.`sessions` (`user_id`, `start`, `end`, `switches`, `active_time`, `url`) VALUES ('$user_id', '$start', '$end', '$switches', '$time', '$url');");

mysql_close($con);

print_r("HELLO");

?>