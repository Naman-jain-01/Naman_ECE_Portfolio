<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $first_name = htmlspecialchars($_POST['first_name']);
    $last_name = htmlspecialchars($_POST['last_name']);
    $email = htmlspecialchars($_POST['email']);
    $phone = htmlspecialchars($_POST['phone']);
    $subject = htmlspecialchars($_POST['subject']);

    $to = "naman.jain22b@iiitg.ac.in"; // Replace with your email address
    $subject_mail = "New Contact Form Submission";
    $message = "First Name: $first_name\nLast Name: $last_name\nEmail: $email\nPhone: $phone\nSubject: $subject";
    $headers = "From: $email";

    if (mail($to, $subject_mail, $message, $headers)) {
        echo "Message sent successfully!";
    } else {
        echo "Failed to send message.";
    }
} else {
    echo "Invalid request method.";
}
?>
