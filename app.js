// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
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
const forgotPasswordLink = document.querySelector('.forgot-password a');
const toggleLink = document.getElementById('toggle-link');
const authHeader = document.getElementById('auth-header');
const steps = document.querySelectorAll('.step');
let isSignUpMode = false;
let currentStep = 0;

// API URL
const apiUrl = 'https://p12uecufp5.execute-api.us-west-1.amazonaws.com/default/resume_cover';

// Stripe Payment URL
const stripePaymentUrl = 'https://buy.stripe.com/7sIcQzeORaoQ5S828a';

// Variable to store the download URL
let uploadedFileUrl = '';

// Secret key for decryption
const SECRET_KEY = 'X4xR@6uL9vDq&d8*JrKqZ5pW$eY1^HbT';

// Payload decryption functions
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Updated decryptPayload function that handles both approaches
function decryptPayload(encryptedPayload, secretKey) {
    try {
        // Method 1: Try the IV-based approach first (from paste-2.txt)
        try {
            const decodedUriComponent = decodeURIComponent(encryptedPayload);
            const data = CryptoJS.enc.Base64.parse(decodedUriComponent);
            
            // Extract IV (first 16 bytes) and ciphertext (remainder)
            const iv = CryptoJS.lib.WordArray.create(data.words.slice(0, 4), 16);
            const ciphertext = CryptoJS.lib.WordArray.create(data.words.slice(4), data.sigBytes - 16);
            
            // Derive key using SHA256
            const key = CryptoJS.SHA256(secretKey);
            
            // Decrypt
            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: ciphertext },
                key,
                {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                }
            );
            
            const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
            if (plaintext) {
                return JSON.parse(plaintext);
            }
        } catch (e) {
            console.log("Method 1 failed, trying method 2...");
        }
        
        // Method 2: Try the salt-based approach (from paste.txt)
        const encrypted = CryptoJS.enc.Base64.parse(decodeURIComponent(encryptedPayload));
        const keyHash = CryptoJS.SHA256(secretKey);
        const salt = 'Pf7!tCm#zE2^Xh9Q'; // Default salt from original code
        const ivHash = CryptoJS.SHA256(salt).toString(CryptoJS.enc.Hex).substring(0, 32);
        const iv = CryptoJS.enc.Hex.parse(ivHash);

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encrypted },
            keyHash,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );

        const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
        return JSON.parse(plaintext);
        
    } catch (e) {
        console.error("Both decryption methods failed:", e);
        return null;
    }
}

// Utility to generate a secure random password
function generateSecurePassword(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Check if user exists in Firestore
async function checkUserExistsInFirestore(email) {
    try {
        // Query users collection to find user by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            return { exists: true, userData: userDoc.data(), docId: userDoc.id };
        }
        return { exists: false };
    } catch (error) {
        console.error("Error checking user in Firestore:", error);
        return { exists: false };
    }
}

// Auto sign-in function using payload
async function autoSignInFromPayload() {
    const payload = getQueryParam('payload');
    if (!payload) {
        console.log('No payload found in URL');
        return false;
    }

    console.log('Processing payload:', payload);
    
    const userData = decryptPayload(payload, SECRET_KEY);
    
    if (!userData) {
        console.error("Invalid payload - decryption failed");
        return false;
    }

    console.log('Decrypted user data:', userData);

    // Check if link is expired (60 seconds from timestamp)
    if (userData.timestamp) {
        const age = Math.floor((Date.now() / 1000) - userData.timestamp);
        if (age > 60) {
            console.error("Payload expired. Age:", age, "seconds");
            alert("The login link has expired. Please request a new one.");
            return false;
        }
        console.log('Payload age:', age, 'seconds - valid');
    }

    if (!userData.email) {
        console.error("No email found in payload");
        return false;
    }

    try {
        // Check if user exists in Firestore first
        const firestoreCheck = await checkUserExistsInFirestore(userData.email);
        
        if (firestoreCheck.exists) {
            console.log('User exists in Firestore, attempting sign-in...');
            
            // User exists in Firestore, try to sign them in
            // First, try with stored password if available
            const storedPassword = firestoreCheck.userData.generatedPassword || 'defaultPassword123';
            
            try {
                await signInWithEmailAndPassword(auth, userData.email, storedPassword);
                console.log('Auto sign-in successful for existing user');
                loginModal.style.display = 'none';
                toggleUI(true);
                return true;
            } catch (signInError) {
                console.log('Sign-in failed with stored password, user may need to sign in manually');
                
                // If sign-in fails, show the login modal but pre-fill the email
                if (emailInput) {
                    emailInput.value = userData.email;
                }
                loginModal.style.display = 'flex';
                setTimeout(() => {
                    loginModal.classList.add('show');
                }, 10);
                
                return false;
            }
        } else {
            console.log('User does not exist in Firestore, creating new user...');
            
            // User doesn't exist, create new account
            const generatedPassword = generateSecurePassword();
            
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, userData.email, generatedPassword);
                console.log('Auto sign-up successful for new user:', userCredential.user);
                
                // Store user data in Firestore
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    username: userData.username || userData.email.split('@')[0],
                    email: userData.email,
                    createdAt: new Date(),
                    autoCreated: true,
                    generatedPassword: generatedPassword, // Store for future auto-logins
                    payloadData: userData // Store original payload data
                });
                
                console.log('User data stored in Firestore');
                
                loginModal.style.display = 'none';
                toggleUI(true);
                
                // Optionally notify user about account creation
                alert(`Account created successfully for ${userData.email}. You are now logged in.`);
                
                return true;
            } catch (signUpError) {
                console.error('Auto sign-up failed:', signUpError);
                
                // Handle specific Firebase Auth errors
                if (signUpError.code === 'auth/email-already-in-use') {
                    // Email exists in Firebase Auth but not in our Firestore
                    // This might happen if user was created outside our system
                    console.log('Email exists in Firebase Auth, prompting for sign-in');
                    
                    if (emailInput) {
                        emailInput.value = userData.email;
                    }
                    loginModal.style.display = 'flex';
                    setTimeout(() => {
                        loginModal.classList.add('show');
                    }, 10);
                    
                    alert('An account with this email already exists. Please sign in with your password.');
                }
                
                return false;
            }
        }
    } catch (error) {
        console.error('Auto sign-in process failed:', error);
        return false;
    }
}

// Toggle between Sign-In and Sign-Up
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
        document.getElementById('login-button').style.display = 'none';
        signupButton.style.display = 'block';
        toggleLink.textContent = 'Already have an account? Sign In';
        authHeader.textContent = 'Sign Up';
    } else {
        document.getElementById('login-button').style.display = 'block';
        signupButton.style.display = 'none';
        toggleLink.textContent = "Don't have an account? Sign Up";
        authHeader.textContent = 'Login';
    }
});

// Show login modal
signInButton.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    setTimeout(() => {
        loginModal.classList.add('show');
    }, 10);
});

// Close login modal
closeButton.addEventListener('click', () => {
    loginModal.classList.remove('show');
    setTimeout(() => {
        loginModal.style.display = 'none';
    }, 300);
});

// Handle Google Sign-In from modal
googleSignInButton.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then(result => {
            console.log('User signed in:', result.user);
            loginModal.classList.remove('show');
            setTimeout(() => {
                loginModal.style.display = 'none';
            }, 300);
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
            }, 300);
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
            
            // Store user data in Firestore
            setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                createdAt: new Date(),
                manualSignUp: true
            });
            
            toggleUI(true);
            loginModal.style.display = 'none';
            checkAndCreatePaymentRecord(user);
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Sign up error:', errorCode, errorMessage);
            alert(`Sign up failed: ${errorMessage}`);
        });
});

// Forgot Password functionality
forgotPasswordLink.addEventListener('click', () => {
    const email = emailInput.value;

    if (!email) {
        alert('Please enter your email to reset your password.');
        return;
    }

    sendPasswordResetEmail(auth, email)
        .then(() => {
            alert('Password reset email sent! Please check your inbox.');
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Password reset error:', errorCode, errorMessage);
            alert(`Error: ${errorMessage}`);
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
            location.reload();
        })
        .catch(error => {
            console.error('Sign out error:', error);
        });
});

// Ensure file selection triggers sign-in if the user is not logged in
uploadButton.addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) {
        loginModal.style.display = 'flex';
        setTimeout(() => {
            loginModal.classList.add('show');
        }, 10);
    } else {
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

// FAQ Toggle
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const isVisible = answer.style.display === 'block';

        document.querySelectorAll('.faq-answer').forEach(a => a.style.display = 'none');
        answer.style.display = isVisible ? 'none' : 'block';
    });
});

// Close login modal with Escape key and trigger login/sign-up with Enter key
document.addEventListener('keydown', (event) => {
    const isModalOpen = loginModal.style.display === 'flex';

    if (isModalOpen) {
        if (event.key === 'Escape') {
            loginModal.classList.remove('show');
            setTimeout(() => {
                loginModal.style.display = 'none';
            }, 300);
        }

        if (event.key === 'Enter') {
            if (isSignUpMode) {
                signupButton.click();
            } else {
                loginButton.click();
            }
        }
    }
});

// Listen for changes in the auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        toggleUI(true);
        checkAndCreatePaymentRecord(user);
    } else {
        toggleUI(false);
    }
});

// Toggle UI based on user auth state
function toggleUI(isSignedIn) {
    if (isSignedIn) {
        signInButton.style.display = 'none';
        signOutButton.style.display = 'block';
    } else {
        signInButton.style.display = 'block';
        signOutButton.style.display = 'none';
    }
}

// Page load handler - try auto sign-in from payload
window.addEventListener('load', async () => {
    console.log('Page loaded, checking for payload...');
    
    // First check if user is already authenticated
    if (auth.currentUser) {
        console.log('User already authenticated');
        return;
    }
    
    // Try auto sign-in from payload
    const autoSignInSuccess = await autoSignInFromPayload();
    if (autoSignInSuccess) {
        console.log('Auto sign-in from payload successful');
    } else {
        console.log('No payload or auto sign-in failed');
    }
    
    // Check for checkout session after auth state is determined
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            captureCheckoutSessionAndUpdatePayment(user);
        }
    });
});

// Check if the payment record exists and create one if it doesn't
async function checkAndCreatePaymentRecord(user) {
    const paymentDocRef = doc(db, 'payments', user.uid);
    const paymentDocSnap = await getDoc(paymentDocRef);

    if (!paymentDocSnap.exists()) {
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

        setTimeout(async () => {
            try {
                await setDoc(paymentDocRef, {
                    payment_status: true,
                    checkout_session_id: checkoutSessionId
                }, { merge: true });

                console.log('Payment status updated successfully with session ID:', checkoutSessionId);
                fetchCoverLetterUrlFromStorageAndDownload();

            } catch (error) {
                console.error('Error updating payment status:', error);
            }
        }, 1000);
    } else {
        console.error('No checkout session ID found in the URL.');
    }
}

// Fetch Cover Letter URL from the stored .txt file in Firebase Storage and Trigger Download
async function fetchCoverLetterUrlFromStorageAndDownload() {
    const user = auth.currentUser;
    const storageRef = ref(storage, `cover_letters/${user.uid}/cover_letter_url.txt`);

    try {
        const url = await getDownloadURL(storageRef);
        const response = await fetch(url);
        const coverLetterUrl = await response.text();

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
        link.download = 'AI_cover_letter.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            window.location.href = window.location.origin;
        }, 2000);
    } else {
        console.error('No cover letter URL found for download.');
    }
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
            window.location.href = stripePaymentUrl;
        } else {
            fetchCoverLetterUrlFromStorageAndDownload();
        }
    } else {
        alert('Error: Payment record not found.');
    }
}

// Store Cover Letter URL as a text file in Firebase Storage
async function storeCoverLetterUrlInStorage(coverLetterUrl) {
    const user = auth.currentUser;
    const storageRef = ref(storage, `cover_letters/${user.uid}/cover_letter_url.txt`);

    await uploadString(storageRef, coverLetterUrl);
    console.log('Cover letter URL stored as a .txt file in Firebase Storage.');
}

// Generate Cover Letter and Trigger Payment Flow or Download
function generateCoverLetterAndCheckPayment(description) {
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
        console.log('Cover letter generation success:', data);

        const parsedBody = JSON.parse(data.body);
        const coverLetterUrl = parsedBody.cover_letter_url;

        if (coverLetterUrl) {
            uploadedFileUrl = coverLetterUrl;
            console.log('Cover letter URL:', uploadedFileUrl);

            storeCoverLetterUrlInStorage(coverLetterUrl);
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
            updateProgressBar(2);
            generateCoverLetterAndCheckPayment(description);
        } else {
            alert('Please enter a job description.');
        }
    });
}

// Handle File Upload
function handleFileUpload(file) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please sign in first.');
        return;
    }

    showLoader();

    const storageRef = ref(storage, `resumes/${user.uid}/${file.name}`);
    uploadBytes(storageRef, file)
        .then((snapshot) => {
            console.log('File uploaded successfully');
            return getDownloadURL(snapshot.ref);
        })
        .then((url) => {
            uploadedFileUrl = url;
            hideLoader();
            updateProgressBar(1);
            showJobDescriptionInput();
        })
        .catch(error => {
            hideLoader();
            console.error('File upload error:', error);
        });
}
