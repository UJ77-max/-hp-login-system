<?php
mysqli_report(MYSQLI_REPORT_OFF);

$host = '127.0.0.1';
$dbUser = 'root';
$dbPass = '';
$dbName = 'php_login_system';
$dbPort = 3307;

$conn = new mysqli($host, $dbUser, $dbPass, $dbName, $dbPort);

if ($conn->connect_error) {
    die('Database connection failed: ' . $conn->connect_error);
}

if (!$conn->set_charset('utf8mb4')) {
    die('Error setting database charset: ' . $conn->error);
}
?>
