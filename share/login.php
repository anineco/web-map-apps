<?php
session_start();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];
    if ($username === 'YOUR USERNAME' && $password === 'YOUR PASSWORD') {
        $token = bin2hex(openssl_random_pseudo_bytes(16));
        $_SESSION['token'] = $token;
        $_SESSION['username'] = $username;
        $status = 'SUCCESS';
    } else {
        $token = '';
        $status = 'FAILURE';
    }
} else {
    $token = '';
    $status = isset($_SESSION['username']) ? 'SUCCESS' : 'FAILUTE';
}
$output = array('token' => $token, 'status' => $status);
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');
echo json_encode($output, JSON_UNESCAPED_UNICODE), PHP_EOL;
