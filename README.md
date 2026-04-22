# PHP MySQL Login System

This project is a dynamic PHP website for XAMPP with:

- User registration
- Login with username and password
- MySQL database connection
- Server-side validation
- Password hashing
- Session-protected dashboard
- Log out button
- Basic styling

## Run It

1. Start Apache and MySQL from XAMPP Control Panel.
2. Open this URL in your browser:

```text
http://localhost/php-login-system/
```

## Database

The database setup file is:

```text
database.sql
```

The setup script is:

```text
setup_database.php
```

This project is configured for XAMPP MySQL on port `3307`:

```php
$host = '127.0.0.1';
$dbUser = 'root';
$dbPass = '';
$dbName = 'php_login_system';
$dbPort = 3307;
```

If your XAMPP MySQL uses port `3306`, change `$dbPort` in `db.php` to `3306`.
