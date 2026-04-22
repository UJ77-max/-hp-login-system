<?php
require_once 'functions.php';

if (is_logged_in()) {
    redirect('dashboard.php');
}

redirect('login.php');
?>
