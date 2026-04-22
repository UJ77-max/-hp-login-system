<?php
require_once 'functions.php';
require_login();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - PHP Login System</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <main class="dashboard-shell">
        <section class="dashboard-panel">
            <div>
                <p class="eyebrow">Logged in</p>
                <h1>Hello, <?= e($_SESSION['username']) ?></h1>
                <p class="muted">You are successfully logged in to the PHP and MySQL system.</p>
            </div>

            <form method="post" action="logout.php">
                <button class="secondary" type="submit">Log Out</button>
            </form>
        </section>
    </main>
</body>
</html>
