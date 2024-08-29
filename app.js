// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
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
const uploadBox = document.getElementById('upload-box');  // Drag and drop area
const uploadButton = document.getElementById('upload-button');
const resumeUpload = document.getElementById('resume-upload');
const jobDescriptionInput = document.getElementById('job-description');
const generateButton = document.getElementById('generate-button');

// API URL
const apiUrl = 'https://p12uecufp5.execute-api.us-west-1.amazonaws.com/default/resume_cover';

// Variable to store the download URL
let uploadedFileUrl = '';

// Sign in event
signInButton.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then(result => {
            console.log('User signed in:', result.user);
            toggleUI(true);
        })
        .catch(error => {
            console.error('Sign in error:', error);
        });
});

// Sign out event
signOutButton.addEventListener('click', () => {
    signOut(auth)
        .then(() => {
            console.log('User signed out');
            toggleUI(false);
        })
        .catch(error => {
            console.error('Sign out error:', error);
        });
});

// Drag and Drop functionality
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover'); // Add visual feedback
});

uploadBox.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover'); // Remove visual feedback
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        handleFileUpload(file); // Call file upload function
    } else {
        alert('Please upload a PDF file.');
    }
});

// Upload resume event
uploadButton.addEventListener('click', () => {
    resumeUpload.click(); // Trigger file input click
});

resumeUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        handleFileUpload(file); // Call file upload function
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

    const storageRef = ref(storage, `resumes/${user.uid}/${file.name}`);
    uploadBytes(storageRef, file)
        .then((snapshot) => {
            console.log('File uploaded successfully');
            return getDownloadURL(snapshot.ref); // Get the download URL
        })
        .then((url) => {
            uploadedFileUrl = url; // Store the download URL
            showJobDescriptionInput(); // Show job description input
        })
        .catch(error => {
            console.error('File upload error:', error);
        });
}

// Show Job Description Input
function showJobDescriptionInput() {
    // Clear the upload box content
    uploadBox.innerHTML = '';

    // Add the class to remove dashed border
    uploadBox.classList.add('job-description-active');

    // Create and append the text area for job description
    const jobDescriptionInput = document.createElement('textarea');
    jobDescriptionInput.id = 'job-description-input';
    jobDescriptionInput.placeholder = 'Enter the job description here...';
    uploadBox.appendChild(jobDescriptionInput);

    // Set up the "Generate Cover Letter" button
    const generateButton = document.createElement('button');
    generateButton.textContent = 'Generate Cover Letter';
    generateButton.className = 'generate-button';
    uploadBox.appendChild(generateButton);

    // Handle the click event for generating the cover letter
    generateButton.addEventListener('click', () => {
        const description = jobDescriptionInput.value.trim();
        if (description && uploadedFileUrl) {
            generateCoverLetter(description);
        } else {
            alert('Please enter a job description.');
        }
    });
}

// Generate Cover Letter
// Function to show loader
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

// Function to hide loader
function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

function generateCoverLetter(description) {
    // Show the loader
    showLoader();

    // Prepare the POST request payload
    const requestData = {
        link: uploadedFileUrl, // Use the stored download URL
        job_description: description
    };

    // Send POST request to API
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
        const body = JSON.parse(data.body);
        const coverLetterUrl = body.cover_letter_url;

        if (coverLetterUrl) {
            // Trigger the download
            const link = document.createElement('a');
            link.href = coverLetterUrl;
            link.download = coverLetterUrl.split('/').pop(); // Extract file name from URL
            document.body.appendChild(link); // Append link to the body
            link.click(); // Trigger click event
            document.body.removeChild(link); // Remove link from the body
        } else {
            alert('Cover letter URL not available.');
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    })
    .finally(() => {
        // Hide the loader after 30 seconds
        setTimeout(() => {
            hideLoader();
        }, 15000); // 30 seconds delay
    });
}

// Ensure the generate button click triggers the cover letter generation
generateButton.addEventListener('click', () => {
    const description = document.getElementById('job-description-input').value.trim();
    if (description && uploadedFileUrl) {
        generateCoverLetter(description);
    } else {
        alert('Please enter a job description.');
    }
});

// Toggle UI based on user auth state
onAuthStateChanged(auth, user => {
    if (user) {
        toggleUI(true);
    } else {
        toggleUI(false);
    }
});

function toggleUI(isSignedIn) {
    if (isSignedIn) {
        signInButton.style.display = 'none';
        signOutButton.style.display = 'block';
        uploadBox.style.display = 'block'; // Assuming this is the intended behavior
    } else {
        signInButton.style.display = 'block';
        signOutButton.style.display = 'none';
        uploadBox.style.display = 'none';
    }
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

// Update Progress Bar
document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.step');
    const uploadButton = document.querySelector('.upload-button');
    const jobDescriptionInput = document.querySelector('#job-description-input');
    const generateButton = document.querySelector('.generate-button');

    let currentStep = 0;

    function updateProgressBar(stepIndex) {
        steps.forEach((step, index) => {
            if (index <= stepIndex) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    uploadButton.addEventListener('click', () => {
        currentStep = 1; // Move to step 1 (upload job description)
        updateProgressBar(currentStep);
    });

    generateButton.addEventListener('click', () => {
        if (jobDescriptionInput.value.trim() !== '') {
            currentStep = 2; // Move to step 2 (generate results)
            updateProgressBar(currentStep);
        }
    });

    // Optional: Handle any other events that should update the progress bar
});

// Sign out event
signOutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log('User signed out');
        toggleUI(false);
        // Refresh the page after signing out
        window.location.reload();
    } catch (error) {
        console.error('Sign out error:', error);
    }
});


