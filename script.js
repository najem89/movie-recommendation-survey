const questions = [
    { question: "What genre do you prefer?", options: ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance"] },
    { question: "Do you prefer new releases or classics?", options: ["New Releases", "Classics"] },
    { question: "How long do you want the movie to be?", options: ["Less than 1 hour", "1-2 hours", "More than 2 hours"] },
    { question: "Do you prefer movies with happy endings?", options: ["Yes", "No"] },  
    { question: "What mood are you in for a movie?", options: ["Exciting", "Chilling", "Heartwarming", "Thought-provoking"] },
    { question: "Would you like a movie based on a true story?", options: ["Yes", "No"] },
    { question: "Would you like the movie to be available on Netflix?", options: ["Yes", "No"] }  // Netflix filter question
];

const surveyForm = document.getElementById('surveyForm');
const questionContainer = document.getElementById('questionContainer');
const resultContainer = document.getElementById('resultContainer');
const movieRecommendation = document.getElementById('movieRecommendation');
const nextButton = document.getElementById('nextButton');
const backButton = document.getElementById('backButton'); // Get the back button

let currentQuestionIndex = 0;
const selectedOptions = [];

// Your TMDb API Key
const apiKey = '16c5651f75b515d6f334afeff8f9536a';
function loadQuestion() {
    questionContainer.innerHTML = '';

    // Show the back button if not on the first question and not on the results page
    if (currentQuestionIndex > 0 && currentQuestionIndex < questions.length) {
        backButton.style.display = 'block';
    } else {
        backButton.style.display = 'none';
    }

    // Skip the "happy ending" question if the user selected "Horror"
    if (selectedOptions[0] === "Horror" && currentQuestionIndex === 3) {
        currentQuestionIndex++;
    }

    if (currentQuestionIndex < questions.length) {
        const currentQuestion = questions[currentQuestionIndex];
        const questionElement = document.createElement('div');
        questionElement.innerHTML = `<p>${currentQuestion.question}</p>`;
        
        currentQuestion.options.forEach(option => {
            const checked = selectedOptions[currentQuestionIndex] === option ? 'checked' : ''; // Pre-check the previous selection
            questionElement.innerHTML += `<label><input type="radio" name="q${currentQuestionIndex}" value="${option}" ${checked}> ${option}</label><br>`;
        });

        questionContainer.appendChild(questionElement);
    } else {
        fetchMovies();
    }
}

function fetchMovies() {
    const genre = selectedOptions[0];
    const release = selectedOptions[1];
    const length = selectedOptions[2];
    const happyEnding = selectedOptions[3]; 
    const mood = selectedOptions[4];
    const trueStory = selectedOptions[selectedOptions[0] === "Horror" ? 3 : 5];
    const netflixPreference = selectedOptions[6]; // Netflix filter

    const genreMap = {
        "Action": 28,
        "Comedy": 35,
        "Drama": 18,
        "Horror": 27,
        "Sci-Fi": 878,
        "Romance": 10749
    };

       const genreId = genreMap[genre] || '';
    
    let searchQuery = `?api_key=${apiKey}&with_genres=${genreId}`;

    // Add Netflix filter if selected
    if (netflixPreference === "Yes") {
        searchQuery += "&with_watch_providers=8"; // Netflix provider ID in TMDb
    }

    fetch(`https://api.themoviedb.org/3/discover/movie${searchQuery}`)
        .then(response => response.json())
        .then(data => {
            if (data.results.length > 0) {
                const recommendations = data.results.map(movie => {
                    const title = movie.title;
                    const rating = movie.vote_average ? `${movie.vote_average}/10` : 'N/A'; // Handle missing ratings
                    return `${title} (rate ${rating})`; // Format title and rating
                }).join(', ');

                movieRecommendation.textContent = `Recommended Movies: ${recommendations}`;
            } else {
                movieRecommendation.textContent = 'No recommendations found.';
            }
            resultContainer.style.display = 'block';
            nextButton.textContent = "Take Another Survey";
        })
        .catch(error => {
            console.error('Error fetching movies:', error);
            movieRecommendation.textContent = 'Error fetching movie recommendations.';
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

// Add functionality to the back button
backButton.addEventListener('click', () => {
    currentQuestionIndex--; 
    loadQuestion(); 
});

// Load the first question
loadQuestion();
