<?php 

$con = mysql_connect("digitalbrain-test.lancs.ac.uk","root","dbsproject2013");
if (!$con)
  {
  die('Could not connect: ' . mysql_error());
  }

$user_id = $_POST['user_id'];
$type = $_POST['type'];

mysql_select_db("wordpress", $con);
$today = date('Y-m-d');
$yesterday = date('Y-m-d', time()-86400);
$week = date('Y-m-d', time()-(86400*7));

if($type == 'today'){
	$query = sprintf("SELECT * from `wordpress`.`sessions` WHERE `user_id` = %s and `start` > '%s'", $user_id,$today);
}
if($type == 'yesterday'){
	$query = sprintf("SELECT * from `wordpress`.`sessions` WHERE `user_id` = %s and `start` > '%s' and `start` < '%s'", $user_id,$yesterday,$today);
}
if($type == 'week'){
	$query = sprintf("SELECT * from `wordpress`.`sessions` WHERE `user_id` = %s and `start` > '%s'", $user_id, $week);
}
//echo($query);
$res = mysql_query($query);
$rows = array();
while($r = mysql_fetch_assoc($res)) {
    $rows[] = $r;
}
print json_encode($rows);
mysql_close($con);

?>