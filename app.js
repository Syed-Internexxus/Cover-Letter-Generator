// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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
const db = getFirestore(app);

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
const steps = document.querySelectorAll('.step');
let isSignUpMode = false;
let currentStep = 0;

// API URL
const apiUrl = 'https://p12uecufp5.execute-api.us-west-1.amazonaws.com/default/resume_cover';

// Stripe Payment URL
const stripePaymentUrl = 'https://buy.stripe.com/7sIcQzeORaoQ5S828a';

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
            checkAndCreatePaymentRecord(result.user);
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
            checkAndCreatePaymentRecord(user);
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
            checkAndCreatePaymentRecord(user);
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
            location.reload(); // Refresh the page after signing out
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
        checkAndCreatePaymentRecord(user);
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

// Show Job Description Input and Start Process
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
            generateCoverLetterAndCheckPayment(description);  // Generate cover letter first, then handle payment
        } else {
            alert('Please enter a job description.');
        }
    });
}

// Generate Cover Letter and Trigger Payment Flow or Download
function generateCoverLetterAndCheckPayment(description) {
    showLoader();

    const requestData = {
        link: uploadedFileUrl,
        job_description: description
    };

    // First, generate the cover letter
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Cover letter generation success:', data);

        const parsedBody = JSON.parse(data.body);  // Parse the response body
        const coverLetterUrl = parsedBody.cover_letter_url;  // Extract cover letter URL

        if (coverLetterUrl) {
            uploadedFileUrl = coverLetterUrl;  // Store the URL for later use
            console.log('Cover letter URL:', uploadedFileUrl);

            // Store the cover letter URL in Firebase Storage as a text file
            storeCoverLetterUrlInStorage(coverLetterUrl);

            // Now check payment status after generating the cover letter
            checkPaymentStatusAndProceed();
        } else {
            console.error('Cover letter URL not found.');
            alert('Error generating cover letter. Please try again.');
        }
    })
    .catch((error) => {
        console.error('Error generating cover letter:', error);
        alert('Failed to generate cover letter.');
    })
    .finally(() => {
        hideLoader();
    });
}

// Store Cover Letter URL as a text file in Firebase Storage
async function storeCoverLetterUrlInStorage(coverLetterUrl) {
    const user = auth.currentUser;
    const storageRef = ref(storage, `cover_letters/${user.uid}/cover_letter_url.txt`);

    // Store the URL as text in Firebase Storage
    await uploadString(storageRef, coverLetterUrl);
    console.log('Cover letter URL stored as a .txt file in Firebase Storage.');
}

// Check payment status and either proceed to payment or download cover letter
async function checkPaymentStatusAndProceed() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please sign in first.');
        return;
    }

    const paymentDocRef = doc(db, 'payments', user.uid);
    const paymentDocSnap = await getDoc(paymentDocRef);

    if (paymentDocSnap.exists()) {
        const paymentData = paymentDocSnap.data();
        if (paymentData.payment_status === false) {
            // Redirect to Stripe for payment
            window.location.href = stripePaymentUrl;
        } else {
            // If already paid, retrieve cover letter URL and trigger download
            fetchCoverLetterUrlFromStorageAndDownload();
        }
    } else {
        alert('Error: Payment record not found.');
    }
}

// Fetch Cover Letter URL from the stored .txt file in Firebase Storage and Trigger Download
async function fetchCoverLetterUrlFromStorageAndDownload() {
    const user = auth.currentUser;
    const storageRef = ref(storage, `cover_letters/${user.uid}/cover_letter_url.txt`);

    try {
        const url = await getDownloadURL(storageRef);
        const response = await fetch(url);
        const coverLetterUrl = await response.text();  // Read the content (URL) from the .txt file

        if (coverLetterUrl) {
            uploadedFileUrl = coverLetterUrl;
            triggerCoverLetterDownload();
        } else {
            console.error('Cover letter URL not found in the text file.');
        }
    } catch (error) {
        console.error('Error fetching cover letter URL from storage:', error);
    }
}

// Trigger cover letter download and refresh page after download
function triggerCoverLetterDownload() {
    if (uploadedFileUrl) {
        const link = document.createElement('a');
        link.href = uploadedFileUrl;
        link.download = 'AI_cover_letter.pdf';  // Rename the file to AI_cover_letter.pdf
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Refresh the page after download, removing URL parameters (like ?id=CHECKOUT_SESSION_ID)
        setTimeout(() => {
            window.location.href = window.location.origin;  // This reloads the page without any query parameters
        }, 2000);  // Wait for 2 seconds before refreshing
    } else {
        console.error('No cover letter URL found for download.');
    }
}

// Capture the CHECKOUT_SESSION_ID from the URL after payment and update Firestore
function captureCheckoutSessionAndUpdatePayment() {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutSessionId = urlParams.get('id');

    if (checkoutSessionId) {
        const user = auth.currentUser;

        if (!user) {
            alert('Please sign in first.');
            return;
        }

        const paymentDocRef = doc(db, 'payments', user.uid);

        // Immediately store payment info and trigger download
        setTimeout(async () => {
            try {
                // Update Firestore with payment status and session ID
                await setDoc(paymentDocRef, {
                    payment_status: true,
                    checkout_session_id: checkoutSessionId
                }, { merge: true });

                console.log('Payment status updated successfully with session ID:', checkoutSessionId);

                // Fetch the cover letter URL from Firebase Storage and trigger download
                fetchCoverLetterUrlFromStorageAndDownload();

            } catch (error) {
                console.error('Error updating payment status:', error);
            }
        }, 1000); // Adding a small delay just for better UX
    } else {
        console.error('No checkout session ID found in the URL.');
    }
}

// Check for the checkout session and update payment status if successful
window.addEventListener('load', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Once the user is authenticated, proceed with checking the session ID and updating the payment status
            captureCheckoutSessionAndUpdatePayment(user);
        } else {
            console.error('User is not signed in.');
        }
    });
});

// Check if the payment record exists and create one if it doesn't
async function checkAndCreatePaymentRecord(user) {
    const paymentDocRef = doc(db, 'payments', user.uid);
    const paymentDocSnap = await getDoc(paymentDocRef);

    if (!paymentDocSnap.exists()) {
        // Create a payment record with payment_status = false
        await setDoc(paymentDocRef, { payment_status: false });
        console.log('Created new payment record for user:', user.uid);
    } else {
        console.log('Payment record already exists for user:', user.uid);
    }
}

// Show loader
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

// Hide loader
function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

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
