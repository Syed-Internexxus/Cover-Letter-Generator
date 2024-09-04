// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvPjN4aeHU2H0UtHfOHWdLy4clx5uGR-k",
  authDomain: "internexxus-products-65a8b.firebaseapp.com",
  projectId: "internexxus-products-65a8b",
  storageBucket: "internexxus-products-65a8b.appspot.com",
  messagingSenderId: "788630683314",
  appId: "1:788630683314:web:ff6a2da1fdfee098e713ab",
  measurementId: "G-B0JLMBTZWZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

// Google Auth Provider
const provider = new GoogleAuthProvider();
// DOM Elements
const signInButton = document.getElementById('sign-in-button');
const signOutButton = document.getElementById('sign-out-button');
const uploadBox = document.getElementById('upload-box');
const uploadButton = document.getElementById('upload-button');
const resumeUpload = document.getElementById('resume-upload');
const loginModal = document.getElementById('login-modal');
const closeButton = document.querySelector('.close-button');
const googleSignInButton = document.getElementById('google-sign-in');
const loginButton = document.getElementById('login-button'); 
const signupButton = document.getElementById('signup-button');
const emailInput = document.querySelector('input[type="text"]');
const passwordInput = document.querySelector('input[type="password"]');
const toggleLink = document.getElementById('toggle-link');
const steps = document.querySelectorAll('.step');  // Progress bar steps
let isSignUpMode = false;
let currentStep = 0;

// API URL
const apiUrl = 'https://p12uecufp5.execute-api.us-west-1.amazonaws.com/default/resume_cover';

// Variable to store the download URL
let uploadedFileUrl = '';

// Toggle between Sign-In and Sign-Up
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
        document.getElementById('login-button').style.display = 'none';
        signupButton.style.display = 'block';
        toggleLink.textContent = 'Already have an account? Sign In';
    } else {
        document.getElementById('login-button').style.display = 'block';
        signupButton.style.display = 'none';
        toggleLink.textContent = 'Don’t have an account? Sign Up';
    }
});

// Show login modal
signInButton.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    setTimeout(() => {
        loginModal.classList.add('show');
    }, 10); // Slight delay to allow CSS transition to work
});

// Close login modal
closeButton.addEventListener('click', () => {
    loginModal.classList.remove('show');
    setTimeout(() => {
        loginModal.style.display = 'none';
    }, 300);  // Wait for the transition to complete before hiding
});

// Handle Google Sign-In from modal
googleSignInButton.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then(result => {
            console.log('User signed in:', result.user);
            loginModal.classList.remove('show');
            setTimeout(() => {
                loginModal.style.display = 'none';
            }, 300);  // Wait for the transition to complete before hiding
            toggleUI(true);
        })
        .catch(error => {
            console.error('Sign in error:', error);
        });
});

// Handle Email/Password Sign-In
loginButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('User signed in with email:', user);
            loginModal.classList.remove('show');
            setTimeout(() => {
                loginModal.style.display = 'none';
            }, 300);  // Wait for the transition to complete before hiding
            toggleUI(true);
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Email sign in error:', errorCode, errorMessage);
            alert(`Error: ${errorMessage}`);
        });
});

// Handle Email/Password Sign-Up
signupButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('User signed up:', user);
            toggleUI(true);
            loginModal.style.display = 'none'; // Hide modal after sign-up
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Sign up error:', errorCode, errorMessage);
            alert(`Sign up failed: ${errorMessage}`);
        });
});

// Sign out event
signOutButton.addEventListener('click', () => {
    signOut(auth)
        .then(() => {
            console.log('User signed out');
            toggleUI(false);
            loginModal.style.display = 'none';
            loginModal.classList.remove('show');
        })
        .catch(error => {
            console.error('Sign out error:', error);
        });
});

// Listen for changes in the auth state (e.g., sign in, sign out)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        toggleUI(true);
    } else {
        // User is signed out
        toggleUI(false);
    }
});

// Toggle UI based on user auth state
function toggleUI(isSignedIn) {
    if (isSignedIn) {
        signInButton.style.display = 'none';  // Hide sign in button
        signOutButton.style.display = 'block'; // Show sign out button
    } else {
        signInButton.style.display = 'block'; // Show sign in button
        signOutButton.style.display = 'none';  // Hide sign out button
    }
}

// Ensure file selection triggers sign-in if the user is not logged in
uploadButton.addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) {
        // If user is not signed in, trigger the login modal
        loginModal.style.display = 'flex';
        setTimeout(() => {
            loginModal.classList.add('show');
        }, 10);  // Slight delay to allow CSS transition
    } else {
        // If signed in, trigger the file upload
        resumeUpload.click();
    }
});

// Drag and Drop functionality
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        handleFileUpload(file);
    } else {
        alert('Please upload a PDF file.');
    }
});

// Upload resume event
resumeUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        handleFileUpload(file);
    } else {
        alert('Please select a PDF file.');
    }
});

// Handle File Upload
function handleFileUpload(file) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please sign in first.');
        return;
    }

    showLoader();  // Show loader while uploading

    const storageRef = ref(storage, `resumes/${user.uid}/${file.name}`);
    uploadBytes(storageRef, file)
        .then((snapshot) => {
            console.log('File uploaded successfully');
            return getDownloadURL(snapshot.ref);
        })
        .then((url) => {
            uploadedFileUrl = url;
            hideLoader();  // Hide loader after upload
            updateProgressBar(1);  // Move to step 2 when file upload is done
            showJobDescriptionInput();  // Proceed to show job description input
        })
        .catch(error => {
            hideLoader();  // Hide loader if there’s an error
            console.error('File upload error:', error);
        });
}

// Show Job Description Input
function showJobDescriptionInput() {
    uploadBox.innerHTML = '';
    uploadBox.classList.add('job-description-active');

    const jobDescriptionInput = document.createElement('textarea');
    jobDescriptionInput.id = 'job-description-input';
    jobDescriptionInput.placeholder = 'Enter the job description here...';
    uploadBox.appendChild(jobDescriptionInput);

    const generateButton = document.createElement('button');
    generateButton.textContent = 'Generate Cover Letter';
    generateButton.className = 'generate-button';
    uploadBox.appendChild(generateButton);

    generateButton.addEventListener('click', () => {
        const description = jobDescriptionInput.value.trim();
        if (description && uploadedFileUrl) {
            updateProgressBar(2);  // Move to step 3 on Generate button click
            generateCoverLetter(description);
        } else {
            alert('Please enter a job description.');
        }
    });
}

// Function to show loader
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

// Function to hide loader
function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

// Generate Cover Letter and Redirect to Payment
function generateCoverLetter(description) {
    showLoader();

    const requestData = {
        link: uploadedFileUrl,
        job_description: description
    };

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        // Use the fixed Stripe payment URL
        const stripePaymentUrl = 'https://buy.stripe.com/9AQ03N36954wbcs145';

        if (stripePaymentUrl) {
            // Redirect to Stripe payment
            redirectToStripePayment(stripePaymentUrl);
        } else {
            alert('Payment URL not available.');
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    })
    .finally(() => {
        hideLoader();
    });
}

// Function to redirect to Stripe payment
function redirectToStripePayment(stripeUrl) {
    window.location.href = stripeUrl;
}

// Handle successful payment and download
function handleSuccessfulPayment() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const coverLetterUrl = urlParams.get('cover_letter_url');

    if (paymentStatus === 'success' && coverLetterUrl) {
        document.getElementById('payment-success').style.display = 'block';
        
        // Trigger the download
        const link = document.createElement('a');
        link.href = coverLetterUrl;
        link.download = coverLetterUrl.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Check for successful payment on page load
document.addEventListener('DOMContentLoaded', () => {
    handleSuccessfulPayment();
});

// Function to update the progress bar
function updateProgressBar(stepIndex) {
    steps.forEach((step, index) => {
        if (index <= stepIndex) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

// FAQ Toggle
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const isVisible = answer.style.display === 'block';
        
        // Hide all answers
        document.querySelectorAll('.faq-answer').forEach(a => a.style.display = 'none');
        
        // Toggle current answer
        answer.style.display = isVisible ? 'none' : 'block';
    });
});
