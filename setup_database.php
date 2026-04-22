<?php
mysqli_report(MYSQLI_REPORT_OFF);

$conn = new mysqli('127.0.0.1', 'root', '', '', 3307);

if ($conn->connect_error) {
    die('Database setup connection failed: ' . $conn->connect_error . PHP_EOL);
}

$sql = file_get_contents(__DIR__ . DIRECTORY_SEPARATOR . 'database.sql');
if ($sql === false) {
    die('Could not read database.sql' . PHP_EOL);
}

if (!$conn->multi_query($sql)) {
    die('Database setup failed: ' . $conn->error . PHP_EOL);
}

echo 'Database and users table created successfully.' . PHP_EOL;
?>
