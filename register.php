<?php
require_once 'functions.php';
require_once 'db.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';

    if ($username === '') {
        $errors[] = 'Username is required.';
    } elseif (!preg_match('/^[A-Za-z0-9_]{3,50}$/', $username)) {
        $errors[] = 'Username must be 3-50 characters and use only letters, numbers, and underscores.';
    }

    if ($email === '') {
        $errors[] = 'Email is required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Enter a valid email address.';
    }

    if ($password === '') {
        $errors[] = 'Password is required.';
    } elseif (strlen($password) < 6) {
        $errors[] = 'Password must be at least 6 characters.';
    }

    if ($password !== $confirmPassword) {
        $errors[] = 'Passwords do not match.';
    }

    if (!$errors) {
        $check = $conn->prepare('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1');
        if (!$check) {
            die('Prepare failed: ' . $conn->error);
        }

        if (!$check->bind_param('ss', $username, $email)) {
            die('Binding parameters failed: ' . $check->error);
        }

        if (!$check->execute()) {
            die('Checking existing user failed: ' . $check->error);
        }

        $result = $check->get_result();
        if ($result && $result->num_rows > 0) {
            $errors[] = 'Username or email already exists.';
        } else {
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $insert = $conn->prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
            if (!$insert) {
                die('Prepare failed: ' . $conn->error);
            }

            if (!$insert->bind_param('sss', $username, $email, $passwordHash)) {
                die('Binding parameters failed: ' . $insert->error);
            }

            if (!$insert->execute()) {
                die('Registration failed: ' . $insert->error);
            }

            $_SESSION['success'] = 'Registration successful. Please log in.';
            redirect('login.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - PHP Login System</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <main class="auth-shell">
        <section class="auth-card">
            <h1>Create Account</h1>
            <p class="muted">Register to access your dashboard.</p>

            <?php if ($errors): ?>
                <div class="alert error">
                    <?php foreach ($errors as $error): ?>
                        <p><?= e($error) ?></p>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <form method="post" action="register.php" novalidate>
                <label for="username">Username</label>
                <input type="text" id="username" name="username" value="<?= old('username') ?>" required>

                <label for="email">Email</label>
                <input type="email" id="email" name="email" value="<?= old('email') ?>" required>

                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>

                <label for="confirm_password">Confirm Password</label>
                <input type="password" id="confirm_password" name="confirm_password" required>

                <button type="submit">Register</button>
            </form>

            <p class="switch-link">Already registered? <a href="login.php">Log in</a></p>
        </section>
    </main>
</body>
</html>
