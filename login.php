<?php
require_once 'functions.php';
require_once 'db.php';

if (is_logged_in()) {
    redirect('dashboard.php');
}

$errors = [];
$success = $_SESSION['success'] ?? '';
unset($_SESSION['success']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username === '') {
        $errors[] = 'Username is required.';
    }

    if ($password === '') {
        $errors[] = 'Password is required.';
    }

    if (!$errors) {
        $stmt = $conn->prepare('SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1');
        if (!$stmt) {
            die('Prepare failed: ' . $conn->error);
        }

        if (!$stmt->bind_param('s', $username)) {
            die('Binding parameters failed: ' . $stmt->error);
        }

        if (!$stmt->execute()) {
            die('Login query failed: ' . $stmt->error);
        }

        $result = $stmt->get_result();
        $user = $result ? $result->fetch_assoc() : null;

        if ($user && password_verify($password, $user['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            redirect('dashboard.php');
        }

        $errors[] = 'Invalid username or password.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - PHP Login System</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <main class="auth-shell">
        <section class="auth-card">
            <h1>Welcome Back</h1>
            <p class="muted">Log in with your valid credentials.</p>

            <?php if ($success): ?>
                <div class="alert success">
                    <p><?= e($success) ?></p>
                </div>
            <?php endif; ?>

            <?php if ($errors): ?>
                <div class="alert error">
                    <?php foreach ($errors as $error): ?>
                        <p><?= e($error) ?></p>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <form method="post" action="login.php" novalidate>
                <label for="username">Username</label>
                <input type="text" id="username" name="username" value="<?= old('username') ?>" required>

                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>

                <button type="submit">Log In</button>
            </form>

            <p class="switch-link">Need an account? <a href="register.php">Register</a></p>
        </section>
    </main>
</body>
</html>
