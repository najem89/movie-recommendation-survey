// Get Firebase instances
const database = window.firebaseDatabase;

const questions = [
    { question: "Do you want to watch Movies or Series?", options: ["Movies", "Series"] },
    { question: "What genre do you prefer?", options: ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance"] },
    { question: "Do you prefer new releases or classics?", options: ["New Releases", "Classics"] },
    { question: "How long do you want the content to be?", options: ["Less than 1 hour", "1-2 hours", "More than 2 hours"] },
    { question: "Do you prefer content with happy endings?", options: ["Yes", "No"] },
    { question: "What mood are you in for the content?", options: ["Exciting", "Chilling", "Heartwarming", "Thought-provoking"] },
    { question: "Would you like the content to be based on a true story?", options: ["Yes", "No"] },
    { question: "Would you like the content to be available on Netflix?", options: ["Yes", "No"] }
];

const surveyForm = document.getElementById('surveyForm');
const questionContainer = document.getElementById('questionContainer');
const resultContainer = document.getElementById('resultContainer');
const movieRecommendation = document.getElementById('movieRecommendation');
const nextButton = document.getElementById('nextButton');
const backButton = document.getElementById('backButton');
let currentQuestionIndex = 0;
const selectedOptions = [];

// Your TMDb API Key
const apiKey = '16c5651f75b515d6f334afeff8f9536a';

// Visitor counter function using both localStorage and Firebase
async function updateVisitorCount() {
    // Get the stored local count
    let localCount = localStorage.getItem('visitorCount');
    if (localCount === null) {
        localCount = 0;
    } else {
        localCount = parseInt(localCount);
    }
    
    // Increment local count
    localCount++;
    localStorage.setItem('visitorCount', localCount);
    
    try {
        // Import Firebase functions
        const { ref, runTransaction } = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js");
        
        // Update Firebase count
        const countRef = ref(database, 'visitorCount');
        
        await runTransaction(countRef, (currentCount) => {
            return (currentCount || 0) + 1;
        });
    } catch (error) {
        console.error('Error updating visitor count:', error);
        // If Firebase update fails, at least show the local count
        document.getElementById('visitor-count').textContent = localCount;
    }
}

// Add a listener to update the counter in real-time
async function setupRealtimeListener() {
    try {
        const { ref, onValue } = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js");
        const countRef = ref(database, 'visitorCount');
        
        onValue(countRef, (snapshot) => {
            const count = snapshot.val() || 0;
            document.getElementById('visitor-count').textContent = count;
        });
    } catch (error) {
        console.error('Error setting up realtime listener:', error);
    }
}

function adjustQuestionText(text) {
    const contentType = selectedOptions[0];
    if (contentType === "Series") {
        return text.replace("movie", "series").replace("Movie", "Series");
    }
    return text;
}

function shouldSkipQuestion(index) {
    const contentType = selectedOptions[0];
    const genre = selectedOptions[1];
    
    if (contentType === "Series" && genre === "Horror") {
        return index === 4 || index === 6;
    }
    return false;
}

function loadQuestion() {
    questionContainer.innerHTML = '';

    if (currentQuestionIndex > 0 && currentQuestionIndex < questions.length) {
        backButton.style.display = 'block';
    } else {
        backButton.style.display = 'none';
    }

    while (currentQuestionIndex < questions.length && shouldSkipQuestion(currentQuestionIndex)) {
        currentQuestionIndex++;
    }

    if (currentQuestionIndex < questions.length) {
        const currentQuestion = questions[currentQuestionIndex];
        const adjustedQuestionText = adjustQuestionText(currentQuestion.question);
        
        const questionElement = document.createElement('div');
        questionElement.innerHTML = `<p>${adjustedQuestionText}</p>`;
        
        currentQuestion.options.forEach(option => {
            const checked = selectedOptions[currentQuestionIndex] === option ? 'checked' : ''; 
            questionElement.innerHTML += `<label><input type="radio" name="q${currentQuestionIndex}" value="${option}" ${checked}> ${option}</label><br>`;
        });

        questionContainer.appendChild(questionElement);
    } else {
        fetchRecommendations();
    }
}
async function checkAvailability(title, year) {
    const url1 = `https://himovies.to/`;  // Link to homepage
    const url2 = `https://web2.topcinema.cam/`;  // Link to homepage

    // Providing links with search instructions
    const links = [
        `<a href="${url1}" target="_blank">Search "${title} (${year})" on Himovies</a>`,
        `<a href="${url2}" target="_blank">Search "${title} (${year})" on TopCinema</a>`
    ];

    return links.join(' or ');
}

function fetchRecommendations() {
    const contentType = selectedOptions[0];
    const genre = selectedOptions[1];
    const releasePreference = selectedOptions[2];
    const durationPreference = selectedOptions[3];
    const netflixPreference = selectedOptions[selectedOptions.length - 1];

    const movieGenreMap = {
        "Action": 28,
        "Comedy": 35,
        "Drama": 18,
        "Horror": 27,
        "Sci-Fi": 878,
        "Romance": 10749
    };

    const tvGenreMap = {
        "Action": 10759,
        "Comedy": 35,
        "Drama": 18,
        "Horror": 9648,
        "Sci-Fi": 10765,
        "Romance": 10749
    };

    const genreMap = contentType === "Movies" ? movieGenreMap : tvGenreMap;
    const genreId = genreMap[genre] || '';
    let searchQuery = `?api_key=${apiKey}&with_genres=${genreId}`;

    if (netflixPreference === "Yes") {
        searchQuery += "&with_watch_providers=8&watch_region=US";
    }

    const currentYear = new Date().getFullYear();
    if (releasePreference === "New Releases") {
        searchQuery += `&primary_release_date.gte=${currentYear - 2}-01-01`;
    } else if (releasePreference === "Classics") {
        searchQuery += `&primary_release_date.lte=${currentYear - 20}-12-31`;
    }

    if (contentType === "Movies") {
        if (durationPreference === "Less than 1 hour") {
            searchQuery += "&with_runtime.lte=60";
        } else if (durationPreference === "1-2 hours") {
            searchQuery += "&with_runtime.gte=60&with_runtime.lte=120";
        } else if (durationPreference === "More than 2 hours") {
            searchQuery += "&with_runtime.gte=120";
        }
    }

    const endpoint = contentType === "Movies" ? "discover/movie" : "discover/tv";

    fetch(`https://api.themoviedb.org/3/${endpoint}${searchQuery}`)
        .then(response => response.json())
        .then(async data => {
            if (data.results.length > 0) {
                const recommendations = await Promise.all(data.results.slice(0, 5).map(async content => {
                    const title = contentType === "Movies" ? content.title : content.name;
                    const rating = content.vote_average ? `${content.vote_average.toFixed(1)}/10` : 'N/A'; 

                    // Check availability for each title
                    const availabilityLink = await checkAvailability(title);
                    return availabilityLink ? `${availabilityLink} (Rating: ${rating})` : `${title} (Rating: ${rating})`;
                }));

                movieRecommendation.innerHTML = `Recommended ${contentType}: ${recommendations.join(', ')}`;
            } else {
                movieRecommendation.textContent = `No ${contentType.toLowerCase()} recommendations found matching your criteria.`;
            }
            resultContainer.style.display = 'block';
            nextButton.textContent = "Take Another Survey";
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
            movieRecommendation.textContent = `Error fetching ${contentType.toLowerCase()} recommendations. Please try again later.`;
            resultContainer.style.display = 'block';
            nextButton.textContent = "Take Another Survey";
        });
}

nextButton.addEventListener('click', () => {
    const selectedOption = Array.from(surveyForm.elements)
        .filter(input => input.checked)
        .map(input => input.value)[0];
    
    if (selectedOption) {
        selectedOptions[currentQuestionIndex] = selectedOption;
        currentQuestionIndex++;
        loadQuestion();
    } else {
        if (currentQuestionIndex >= questions.length) {
            const retake = confirm("Would you like to take another survey?");
            if (retake) {
                currentQuestionIndex = 0;
                selectedOptions.length = 0;
                resultContainer.style.display = 'none';
                nextButton.textContent = "Next";
                loadQuestion();
            } else {
                alert("Thank you for participating!");
            }
        } else {
            alert("Please select an option before proceeding.");
        }
    }
});

backButton.addEventListener('click', () => {
    currentQuestionIndex--; 
    while (currentQuestionIndex > 0 && shouldSkipQuestion(currentQuestionIndex)) {
        currentQuestionIndex--;
    }
    loadQuestion(); 
});

window.onload = function() {
    loadQuestion();
    updateVisitorCount();
    setupRealtimeListener();
};