/* === 1. IMPORT FIREBASE FUNCTIONS === */
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, doc, setDoc, getDoc,
  query, where, orderBy, getDocs 
} from "firebase/firestore";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged 
} from "firebase/auth";
// NOTE: Firebase Functions SDK imports removed for Netlify compatibility.

/* === 2. YOUR FIREBASE CONFIGURATION === */
// Your specific Firebase project keys
const firebaseConfig = {
  apiKey: "AIzaSyCxqC2ZVv-Mr1qIBCYvnOj5L3KbO9RwrUk",
  authDomain: "emotune-8db65.firebaseapp.com",
  projectId: "emotune-8db65",
  storageBucket: "emotune-8db65.firebasestorage.app",
  messagingSenderId: "448392645543",
  appId: "1:448392645543:web:e191634f04a02d0c2ec482",
  measurementId: "G-VR0EXXF588"
};

/* === 3. INITIALIZE FIREBASE === */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* === 4. GET ALL YOUR HTML ELEMENTS === */
// Containers
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');

// Auth Form
const authForm = document.getElementById('auth-form');
const formTitle = document.getElementById('form-title');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const toggleLink = document.getElementById('toggle-link');

// App Elements (Sidebar & Header)
const logoutBtn = document.getElementById('logout-btn'); 
const sidebarLinks = document.querySelectorAll('.sidebar-nav li'); 
const viewTitle = document.getElementById('view-title'); 

// App Elements (Main Content Views)
const playlistView = document.getElementById('playlist-view');
const queryView = document.getElementById('query-view');
const allViews = document.querySelectorAll('.main-view'); 

// History View Element
const moodLogList = document.getElementById('mood-log-list'); 

// Playlist Mode Mood Buttons
const happyPlaylistBtn = document.getElementById('happy-playlist-mode');
const sadPlaylistBtn = document.getElementById('sad-playlist-mode');
const stressedPlaylistBtn = document.getElementById('stressed-playlist-mode');
const focusedPlaylistBtn = document.getElementById('focused-playlist-mode');

// Query Mode Mood Buttons
const happyQueryBtn = document.getElementById('happy-query-mode');
const sadQueryBtn = document.getElementById('sad-query-mode');
const stressedQueryBtn = document.getElementById('stressed-query-mode');
const focusedQueryBtn = document.getElementById('focused-query-mode');

// Playlist Input Elements
const happyPlaylistInput = document.getElementById('happy-playlist');
const sadPlaylistInput = document.getElementById('sad-playlist');
const stressedPlaylistInput = document.getElementById('stressed-playlist');
const focusedPlaylistInput = document.getElementById('focused-playlist');
const savePlaylistsBtn = document.getElementById('save-playlists-btn');

// NEW: Language Modal Elements
const languageModal = document.getElementById('language-modal');
const languageOptions = document.getElementById('language-options');
const closeModalBtn = document.getElementById('close-modal-btn');

// NEW: Query Result Elements
const queryResultArea = document.getElementById('query-result-area');
const songLinkDisplay = document.getElementById('song-link-display');
const currentRecommendationText = document.getElementById('current-recommendation-text');
const generateNewBtn = document.getElementById('generate-new-btn');


/* === 5. APP LOGIC === */
let currentUserId = null;
let isLogin = true; 

// Global state for Query Mode
let currentQueryMood = null; 
let currentQueryLanguage = null; 

// --- Toggle between Sign In and Sign Up (Unchanged) ---
toggleLink.addEventListener('click', (e) => {
    e.preventDefault(); 
    isLogin = !isLogin; 

    if (isLogin) {
        formTitle.textContent = 'Sign In';
        authBtn.textContent = 'Login';
        toggleLink.innerHTML = "Don't have an account? <a href='#'>Create One</a>";
    } else {
        formTitle.textContent = 'Sign Up';
        authBtn.textContent = 'Sign Up';
        toggleLink.innerHTML = "Already have an account? <a href='#'>Sign In</a>";
    }
});

// --- Main Auth Button (Login/Sign Up) (Unchanged) ---
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        console.error('Authentication Error: ', error.message);
        alert(error.message);
    }
});

// --- Logout Button (Unchanged) ---
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout Error: ', error.message);
    }
});

// --- Main Auth Controller (Unchanged) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        loginContainer.style.display = 'none'; 
        appContainer.style.display = 'flex'; 
        loadUserPlaylists(currentUserId);
        switchView('playlist-view'); 
    } else {
        currentUserId = null;
        loginContainer.style.display = 'block'; 
        appContainer.style.display = 'none';  
        clearPlaylistInputs();
    }
});

// --- View Switching Logic ---
sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetViewId = link.getAttribute('data-view');
        if (targetViewId) {  
            switchView(targetViewId);
        }
    });
});

function switchView(viewId) {
    // Update sidebar active state
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-view') === viewId) {
            link.classList.add('active');
            const titleSpan = link.querySelector('span');
            if (titleSpan) {
                viewTitle.textContent = titleSpan.textContent; 
            }
        }
    });

    // Hide all views, then show the target view
    allViews.forEach(view => view.classList.remove('view-active'));
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('view-active');
        
        // Load History when the view is selected
        if (viewId === 'history-view' && currentUserId) {
            loadMoodHistory(currentUserId);
        }
        
        // NEW: Hide result area when switching away from Query view
        if (viewId !== 'query-view') {
            queryResultArea.style.display = 'none';
        }

    } else {
        console.error("Target view not found:", viewId); 
    }
}

// --- Utility to clear playlist inputs (Unchanged) ---
function clearPlaylistInputs() {
    happyPlaylistInput.value = '';
    sadPlaylistInput.value = '';
    stressedPlaylistInput.value = '';
    focusedPlaylistInput.value = '';
}

// --- Utility Function to get Emojis (Unchanged) ---
function getMoodEmoji(mood) {
    switch (mood) {
        case 'happy': return '😊';
        case 'sad': return '😔';
        case 'stressed': return '🥵';
        case 'focused': return '🧐';
        default: return '❓';
    }
}

// --- Load and Display Mood History (Unchanged) ---
async function loadMoodHistory(userId) {
    if (!moodLogList) return;
    
    moodLogList.innerHTML = '<p style="text-align: center; color: #999;">Loading history...</p>';

    try {
        const moodsRef = collection(db, "moods");
        const q = query(
            moodsRef, 
            where("userId", "==", userId),
            orderBy("timestamp", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            moodLogList.innerHTML = '<p style="text-align: center; color: #999;">No moods logged yet.</p>';
            return;
        }

        let logHtml = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const mood = data.mood || 'unknown';
            const timestamp = data.timestamp ? data.timestamp.toDate() : new Date(); 
            const mode = data.mode || 'unknown'; 
            
            const dateStr = timestamp.toLocaleDateString();
            const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const emoji = getMoodEmoji(mood);

            logHtml += `
                <div class="mood-log-item">
                    <span class="log-date">
                        ${dateStr} at ${timeStr}
                    </span>
                    <span class="log-mood">
                        <span class="emoji">${emoji}</span>
                        ${mood}
                    </span>
                    <span class="log-mode-pill" data-mode="${mode}">
                        ${mode}
                    </span>
                </div>
            `;
        });
        
        moodLogList.innerHTML = logHtml;

    } catch (error) {
        console.error("Error loading mood history:", error);
        moodLogList.innerHTML = '<p style="color: red; text-align: center;">Error loading history.</p>';
    }
}


// --- Load/Save Playlists (Unchanged) ---
async function loadUserPlaylists(userId) {
    try { 
        const docRef = doc(db, "userPlaylists", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            happyPlaylistInput.value = data.happy || '';
            sadPlaylistInput.value = data.sad || '';
            stressedPlaylistInput.value = data.stressed || '';
            focusedPlaylistInput.value = data.focused || '';
        } else {
            console.log("No saved playlists for this user.");
            clearPlaylistInputs(); 
        }
    } catch (error) {
        console.error("Error loading playlists:", error);
    }
}

savePlaylistsBtn.addEventListener('click', async () => {
    if (!currentUserId) return;

    const playlistData = {
        happy: happyPlaylistInput.value,
        sad: sadPlaylistInput.value,
        stressed: stressedPlaylistInput.value,
        focused: focusedPlaylistInput.value
    };

    try {
        const docRef = doc(db, "userPlaylists", currentUserId);
        await setDoc(docRef, playlistData);
        alert('Playlists saved!');
    } catch (e) {
        console.error("Error saving playlists: ", e);
        alert('Failed to save playlists.'); 
    }
});


// --- REVISED: Function to generate and display a song by calling the Netlify Function ---
async function generateAndDisplaySong(mood, language) {
    
    // 1. Set Loading State
    currentRecommendationText.textContent = `Searching for a ${mood} song in ${language}...`;
    songLinkDisplay.style.display = 'none';
    queryResultArea.style.display = 'block';
    generateNewBtn.disabled = true; // Disable button during API call

    try {
        // 2. Call the Netlify Function endpoint (standard fetch call)
        const response = await fetch('/.netlify/functions/youtube-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Send the required mood and language data
            body: JSON.stringify({ mood: mood, language: language, userId: currentUserId }),
        });
        
        const data = await response.json();
        const { url, error } = data;

        if (error || !url) {
            currentRecommendationText.textContent = error || 'Sorry, could not find music right now.';
            songLinkDisplay.style.display = 'none';
            return;
        }

        // 3. Update UI with the live, dynamic link
        currentQueryMood = mood;
        currentQueryLanguage = language;
        
        songLinkDisplay.href = url;
        songLinkDisplay.style.display = 'inline-block';
        songLinkDisplay.textContent = `Listen on YouTube`;
        currentRecommendationText.textContent = `Found a random ${mood.toUpperCase()} song in ${language.toUpperCase()}!`;
        
    } catch (error) {
        console.error("Function call failed:", error);
        currentRecommendationText.textContent = 'An internal error occurred. Check browser console.';
        songLinkDisplay.style.display = 'none';
    } finally {
        // 4. Re-enable the button regardless of success/failure
        generateNewBtn.disabled = false;
    }
}

// --- Event listener for the language buttons (Triggers first generation) ---
languageOptions.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const selectedLanguage = e.target.getAttribute('data-lang');
        
        if (currentUserId && currentQueryMood) {
            // 1. Log the initial choice to the database
            try {
                addDoc(collection(db, "moods"), {
                    mood: currentQueryMood,
                    timestamp: new Date(),
                    userId: currentUserId,
                    mode: 'query',
                    language: selectedLanguage 
                });
                console.log(`Mood and Query language (${selectedLanguage}) logged.`);
            } catch (error) { console.error("Error logging mood: ", error); }
            
            // 2. Generate and display the first random song
            generateAndDisplaySong(currentQueryMood, selectedLanguage);
        }

        // 3. Close the modal
        languageModal.style.display = 'none';
    }
});

// --- Listener for the 'Generate New Song' button (Triggers regeneration) ---
generateNewBtn.addEventListener('click', () => {
    if (currentUserId && currentQueryMood && currentQueryLanguage) {
        // Log regeneration event (using a different mode for tracking)
        try {
            addDoc(collection(db, "moods"), {
                mood: currentQueryMood,
                timestamp: new Date(),
                userId: currentUserId,
                mode: 'query_regenerate',
                language: currentQueryLanguage 
            });
        } catch (error) { console.error("Error logging regeneration: ", error); }
        

        // Generate and display a new song based on the stored state
        generateAndDisplaySong(currentQueryMood, currentQueryLanguage);
    } else {
        alert("Please select a mood and language first!");
    }
});


// --- Close modal listener ---
closeModalBtn.addEventListener('click', () => {
    languageModal.style.display = 'none';
});


// --- Main function to handle mood clicks based on mode ---
async function handleMoodClick(mood, mode) { 
    if (mode === 'playlist') {
        // 1. Log the mood immediately
        if (currentUserId) {
            try {
                await addDoc(collection(db, "moods"), {
                    mood: mood,
                    timestamp: new Date(),
                    userId: currentUserId,
                    mode: mode 
                });
                console.log("Mood saved to database from mode:", mode);
            } catch (e) { console.error("Error logging mood: ", e); }
        }

        // 2. Open saved URL or show alert if none is found
        let targetUrl = happyPlaylistInput.value; 
        switch (mood) {
            case 'sad': targetUrl = sadPlaylistInput.value; break;
            case 'stressed': targetUrl = stressedPlaylistInput.value; break;
            case 'focused': targetUrl = focusedPlaylistInput.value; break;
        }

        if (targetUrl) {
            window.open(targetUrl, '_blank');
        } else {
            alert(`No custom playlist URL saved for ${mood}. Please save a URL in the 'My Playlists' view.`);
        }
        
    } else if (mode === 'query') {
        // Query Mode: Store the mood that was clicked and show modal
        currentQueryMood = mood;
        currentQueryLanguage = null; // Clear language
        queryResultArea.style.display = 'none'; // Hide previous result
        languageModal.style.display = 'flex'; // Show the modal
    }
}

// --- Mood button listeners for BOTH modes ---
happyPlaylistBtn.addEventListener('click', () => handleMoodClick('happy', 'playlist'));
sadPlaylistBtn.addEventListener('click', () => handleMoodClick('sad', 'playlist'));
stressedPlaylistBtn.addEventListener('click', () => handleMoodClick('stressed', 'playlist'));
focusedPlaylistBtn.addEventListener('click', () => handleMoodClick('focused', 'playlist'));

happyQueryBtn.addEventListener('click', () => handleMoodClick('happy', 'query'));
sadQueryBtn.addEventListener('click', () => handleMoodClick('sad', 'query'));
stressedQueryBtn.addEventListener('click', () => handleMoodClick('stressed', 'query'));
focusedQueryBtn.addEventListener('click', () => handleMoodClick('focused', 'query'));