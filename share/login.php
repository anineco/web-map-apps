<?php
session_start();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $username = $_POST['username'];
  $password = $_POST['password'];
  if ($username === 'YOUR USERNAME' && $password === 'YOUR PASSWORD') {
    $_SESSION['username'] = $username;
    $status = 'SUCCESS';
  } else {
    $status = 'FAILURE';
  }
} else {
  $status = isset($_SESSION['username']) ? 'SUCCESS' : 'FAILUTE';
}
header('Content-Type: text/plain; charset=UTF-8');
echo $status;
