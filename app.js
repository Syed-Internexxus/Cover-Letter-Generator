// Import the Firebase functions you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
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
const storage = getStorage(app);

// DOM Elements
const uploadBox      = document.getElementById('upload-box');
const uploadButton   = document.getElementById('upload-button');
const resumeUpload   = document.getElementById('resume-upload');
const steps          = document.querySelectorAll('.step');

// API URL
const apiUrl = 'https://p12uecufp5.execute-api.us-west-1.amazonaws.com/default/resume_cover';

// Variable to store file URLs\let uploadedFileUrl = '';

// Ensure file selection always triggers upload
uploadButton.addEventListener('click', () => {
  resumeUpload.click();
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
  if (file?.type === 'application/pdf') {
    handleFileUpload(file);
  } else {
    alert('Please upload a PDF file.');
  }
});

// Upload resume event
resumeUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file?.type === 'application/pdf') {
    handleFileUpload(file);
  } else {
    alert('Please select a PDF file.');
  }
});

// Handle File Upload
function handleFileUpload(file) {
  showLoader();

  const storageRef = ref(storage, `resumes/${file.name}`);
  uploadBytes(storageRef, file)
    .then(snapshot => getDownloadURL(snapshot.ref))
    .then(url => {
      uploadedFileUrl = url;
      hideLoader();
      updateProgressBar(1);
      showJobDescriptionInput();
    })
    .catch(error => {
      hideLoader();
      console.error('File upload error:', error);
      alert('Upload failed. Please try again.');
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
      generateCoverLetter(description);
    } else {
      alert('Please enter a job description.');
    }
  });
}

// Generate Cover Letter and Trigger Download
function generateCoverLetter(description) {
  showLoader();

  const requestData = {
    link: uploadedFileUrl,
    job_description: description
  };

  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData),
  })
  .then(response => response.json())
  .then(data => {
    const parsedBody = JSON.parse(data.body);
    const coverLetterUrl = parsedBody.cover_letter_url;
    if (coverLetterUrl) {
      triggerCoverLetterDownload(coverLetterUrl);
      updateProgressBar(3);
    } else {
      alert('Error generating cover letter. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error generating cover letter:', error);
    alert('Failed to generate cover letter.');
  })
  .finally(() => {
    hideLoader();
  });
}

// Trigger cover letter download and refresh page
function triggerCoverLetterDownload(url) {
  const link = document.createElement('a');
  link.href = url;
  link.download = 'AI_cover_letter.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    window.location.href = window.location.origin;
  }, 2000);
}

// Show loader
function showLoader() {
  document.getElementById('loader').style.display = 'flex';
}

// Hide loader
function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}

// Update progress bar steps
function updateProgressBar(stepIndex) {
  steps.forEach((step, index) => {
    step.classList.toggle('active', index <= stepIndex);
  });
}

// FAQ Toggle
document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const answer = question.nextElementSibling;
    const isVisible = answer.style.display === 'block';
    document.querySelectorAll('.faq-answer').forEach(a => a.style.display = 'none');
    answer.style.display = isVisible ? 'none' : 'block';
  });
});
