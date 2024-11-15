// Constants and configurations
const CONFIG = {
  API_KEY: '16c5651f75b515d6f334afeff8f9536a',
  API_BASE_URL: 'https://api.themoviedb.org/3',
  RESULTS_LIMIT: 10,
  GENRE_MAPS: {
    Movies: {
      "Action": 28,
      "Comedy": 35,
      "Drama": 18,
      "Horror": 27,
      "Sci-Fi": 878,
      "Romance": 10749
    },
    Series: {
      "Action": 10759,
      "Comedy": 35,
      "Drama": 18,
      "Horror": 9648,
      "Sci-Fi": 10765,
      "Romance": 10749
    }
  },
  QUESTIONS: [
    {
      question: "Do you want to watch Movies or Series?",
      options: ["Movies", "Series"]
    },
    {
      question: "What genre do you prefer?",
      options: ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance"]
    },
    {
      question: "Do you prefer new releases or classics?",
      options: ["New Releases", "Classics"]
    },
    {
      question: "How long do you want the content to be?",
      options: ["Less than 1 hour", "1-2 hours", "More than 2 hours"]
    },
    {
      question: "Do you prefer content with happy endings?",
      options: ["Yes", "No"]
    },
    {
      question: "What mood are you in for the content?",
      options: ["Exciting", "Chilling", "Heartwarming", "Thought-provoking"]
    },
    {
      question: "Would you like the content to be based on a true story?",
      options: ["Yes", "No"]
    }
  ]
};

class RecommendationSystem {
  constructor() {
    this.database = window.firebaseDatabase;
    this.currentQuestionIndex = 0;
    this.selectedOptions = [];
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.elements = {
      surveyForm: document.getElementById('surveyForm'),
      questionContainer: document.getElementById('questionContainer'),
      resultContainer: document.getElementById('resultContainer'),
      movieRecommendation: document.getElementById('movieRecommendation'),
      nextButton: document.getElementById('nextButton'),
      backButton: document.getElementById('backButton'),
      visitorCount: document.getElementById('visitor-count')
    };
  }

  attachEventListeners() {
    this.elements.nextButton.addEventListener('click', () => this.handleNext());
    this.elements.backButton.addEventListener('click', () => this.handleBack());
  }

  async handleNext() {
    const selectedOption = this.getSelectedOption();
    
    if (this.currentQuestionIndex >= CONFIG.QUESTIONS.length) {
      this.handleSurveyComplete();
      return;
    }

    if (!selectedOption && this.currentQuestionIndex < CONFIG.QUESTIONS.length) {
      alert("Please select an option before proceeding.");
      return;
    }

    this.selectedOptions[this.currentQuestionIndex] = selectedOption;
    this.currentQuestionIndex++;
    await this.updateDisplay();
  }

  handleBack() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.loadQuestion();
    }
  }

  getSelectedOption() {
    const radioButtons = this.elements.surveyForm.querySelectorAll('input[type="radio"]');
    const selectedRadio = Array.from(radioButtons).find(radio => radio.checked);
    return selectedRadio ? selectedRadio.value : null;
  }

  async updateDisplay() {
    if (this.currentQuestionIndex < CONFIG.QUESTIONS.length) {
      this.loadQuestion();
    } else {
      await this.fetchAndDisplayRecommendations();
    }
  }

  loadQuestion() {
    const question = CONFIG.QUESTIONS[this.currentQuestionIndex];
    this.elements.questionContainer.innerHTML = this.createQuestionHTML(question);
    this.updateNavigationButtons();
  }

  createQuestionHTML(question) {
    const options = question.options.map(option => {
      const checked = this.selectedOptions[this.currentQuestionIndex] === option ? 'checked' : '';
      return `
        <label class="option-label">
          <input type="radio" name="question${this.currentQuestionIndex}" value="${option}" ${checked}>
          ${option}
        </label>
      `;
    }).join('');

    return `
      <div class="question">
        <p class="question-text">${question.question}</p>
        <div class="options">${options}</div>
      </div>
    `;
  }

  updateNavigationButtons() {
    this.elements.backButton.style.display = this.currentQuestionIndex > 0 ? 'block' : 'none';
    this.elements.nextButton.textContent = 
      this.currentQuestionIndex >= CONFIG.QUESTIONS.length - 1 ? "Get Recommendations" : "Next";
  }

  async fetchAndDisplayRecommendations() {
    try {
      const recommendations = await this.fetchRecommendations();
      this.displayResults(recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      this.displayError();
    }
  }

  async fetchRecommendations() {
    const contentType = this.selectedOptions[0];
    const genre = this.selectedOptions[1];
    const releasePreference = this.selectedOptions[2];

    const searchParams = new URLSearchParams({
      api_key: CONFIG.API_KEY,
      with_genres: CONFIG.GENRE_MAPS[contentType][genre],
      language: 'en-US',
      sort_by: 'popularity.desc',
      include_adult: false,
      page: 1
    });

    this.addTimeRangeParams(searchParams, releasePreference);
    this.addRuntimeParams(searchParams);

    const endpoint = contentType === "Movies" ? "discover/movie" : "discover/tv";
    const response = await fetch(`${CONFIG.API_BASE_URL}/${endpoint}?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }

    const data = await response.json();
    return data.results.slice(0, CONFIG.RESULTS_LIMIT);
  }

  addTimeRangeParams(searchParams, releasePreference) {
    const currentYear = new Date().getFullYear();
    
    if (releasePreference === "New Releases") {
      searchParams.append('primary_release_date.gte', `${currentYear - 2}-01-01`);
    } else if (releasePreference === "Classics") {
      searchParams.append('primary_release_date.lte', `${currentYear - 20}-12-31`);
    }
  }

  addRuntimeParams(searchParams) {
    const durationPreference = this.selectedOptions[3];
    
    if (durationPreference === "Less than 1 hour") {
      searchParams.append('with_runtime.lte', '60');
    } else if (durationPreference === "1-2 hours") {
      searchParams.append('with_runtime.gte', '60');
      searchParams.append('with_runtime.lte', '120');
    } else if (durationPreference === "More than 2 hours") {
      searchParams.append('with_runtime.gte', '120');
    }
  }

  displayResults(recommendations) {
    if (!recommendations.length) {
      this.elements.movieRecommendation.textContent = 
        `No ${this.selectedOptions[0].toLowerCase()} found matching your criteria.`;
      return;
    }

    const contentType = this.selectedOptions[0];
    const recommendationsList = recommendations.map(item => {
      const title = contentType === "Movies" ? item.title : item.name;
      const year = new Date(item.release_date || item.first_air_date).getFullYear();
      const rating = item.vote_average ? ` (Rating: ${item.vote_average.toFixed(1)}/10)` : '';
      const overview = item.overview ? `<br>Overview: ${item.overview}` : '';
      
      return `<div class="recommendation-item">
        <h3>${title} (${year})${rating}</h3>
        ${overview}
      </div>`;
    }).join('');

    this.elements.movieRecommendation.innerHTML = `
      <h2>Recommended ${this.selectedOptions[0]}:</h2>
      ${recommendationsList}
    `;
    this.elements.resultContainer.style.display = 'block';
    this.elements.nextButton.textContent = "Take Another Survey";
  }

  displayError() {
    this.elements.movieRecommendation.textContent = 
      "Sorry, there was an error fetching recommendations. Please try again later.";
    this.elements.resultContainer.style.display = 'block';
  }

  handleSurveyComplete() {
    const retake = confirm("Would you like to take another survey?");
    if (retake) {
      this.resetSurvey();
    } else {
      alert("Thank you for participating!");
    }
  }

  resetSurvey() {
    this.currentQuestionIndex = 0;
    this.selectedOptions = [];
    this.elements.resultContainer.style.display = 'none';
    this.elements.nextButton.textContent = "Next";
    this.loadQuestion();
  }

  async updateVisitorCount() {
    try {
      const { ref, runTransaction } = await import(
        "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js"
      );
      
      const countRef = ref(this.database, 'visitorCount');
      await runTransaction(countRef, (currentCount) => (currentCount || 0) + 1);
      
      this.setupRealtimeListener();
    } catch (error) {
      console.error('Error updating visitor count:', error);
      this.updateLocalCount();
    }
  }

  async setupRealtimeListener() {
    try {
      const { ref, onValue } = await import(
        "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js"
      );
      
      const countRef = ref(this.database, 'visitorCount');
      onValue(countRef, (snapshot) => {
        const count = snapshot.val() || 0;
        this.elements.visitorCount.textContent = count;
      });
    } catch (error) {
      console.error('Error setting up realtime listener:', error);
    }
  }

  updateLocalCount() {
    const count = parseInt(localStorage.getItem('visitorCount') || '0') + 1;
    localStorage.setItem('visitorCount', count.toString());
    this.elements.visitorCount.textContent = count;
  }
}

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
  const app = new RecommendationSystem();
  app.loadQuestion();
  app.updateVisitorCount();
});