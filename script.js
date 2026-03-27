class WeatherApp {
    constructor() {
        this.apiKey = '52ca4e8c31aaacbeac56c0b76181275f'; 
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.iconUrl = 'https://openweathermap.org/img/wn/';
        this.geolocation = null;
        this.isCelsius = true;
        this.currentCity = '';
        
        // DOM Elements
        this.cityInput = document.getElementById('cityInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.geoBtn = document.getElementById('geoBtn');
        this.unitToggle = document.getElementById('unitToggle');
        this.unitText = document.getElementById('unitText');
        this.errorMsg = document.getElementById('errorMsg');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.bgGradient = document.getElementById('bgGradient');
        
        this.init();
    }
    
    init() {
        // Event Listeners
        this.searchBtn.addEventListener('click', () => this.searchWeather());
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchWeather();
        });
        this.geoBtn.addEventListener('click', () => this.getCurrentLocation());
        this.unitToggle.addEventListener('click', () => this.toggleUnit());
        
        // 🆕 AUTO-DETECT YOUR LOCATION ON LOAD
        this.getCurrentLocationOnLoad();
    }
    
    // 🆕 NEW: Get YOUR location automatically on page load
    async getCurrentLocationOnLoad() {
        this.showLoading(true);
        this.geoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        this.cityInput.placeholder = 'Detecting your location...';
        
        if (!navigator.geolocation) {
            // Fallback to Delhi if geolocation not supported
            await this.searchWeather('Delhi');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const data = await this.getWeatherByCoords(latitude, longitude);
                    this.currentCity = data.name;
                    this.cityInput.value = data.name;
                    await this.updateWeatherData(data.name);
                } catch (error) {
                    console.error('Location error:', error);
                    // Fallback to Delhi
                    await this.searchWeather('Delhi');
                } finally {
                    this.geoBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                    this.cityInput.placeholder = 'Search city...';
                    this.showLoading(false);
                }
            },
            async (error) => {
                console.error('Geolocation error:', error);
                // Fallback to Delhi if location denied/blocked
                await this.searchWeather('Delhi');
                this.geoBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                this.cityInput.placeholder = 'Search city...';
                this.showLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }
    
    async searchWeather(city = null) {
        const cityName = city || this.cityInput.value.trim();
        
        if (!cityName) {
            this.showError('Please enter a city name');
            return;
        }
        
        this.showLoading(true);
        this.hideError();
        this.currentCity = cityName;
        this.cityInput.value = cityName;
        
        try {
            await this.updateWeatherData(cityName);
        } catch (error) {
            console.error('Weather fetch error:', error);
            this.showError('City not found! Please check spelling.');
        } finally {
            this.showLoading(false);
        }
    }
    
    // 🆕 NEW: Single function to update all weather data
    async updateWeatherData(cityName) {
        const [weatherData, forecastData] = await Promise.all([
            this.getCurrentWeather(cityName),
            this.getForecastWeather(cityName)
        ]);
        
        this.updateBackground(weatherData.weather[0].main);
        this.displayCurrentWeather(weatherData);
        this.displayHourlyForecast(forecastData);
        this.displayFiveDayForecast(forecastData);
    }
    
    async getCurrentLocation() {
        // Refresh current location
        await this.getCurrentLocationOnLoad();
    }
    
    async getCurrentWeather(city) {
        const response = await fetch(
            `${this.baseUrl}/weather?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=metric`
        );
        if (!response.ok) throw new Error('City not found');
        return response.json();
    }
    
    async getForecastWeather(city) {
        const response = await fetch(
            `${this.baseUrl}/forecast?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=metric`
        );
        if (!response.ok) throw new Error('Forecast unavailable');
        return response.json();
    }
    
    async getWeatherByCoords(lat, lon) {
        const response = await fetch(
            `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
        );
        if (!response.ok) throw new Error('Location not found');
        return response.json();
    }
    
    displayCurrentWeather(data) {
        document.getElementById('cityName').textContent = data.name;
        document.getElementById('countryFlag').textContent = data.sys.country;
        document.getElementById('dateTime').textContent = this.formatDate(new Date(data.dt * 1000));
        
        const icon = data.weather[0].icon;
        document.getElementById('weatherIcon').src = `${this.iconUrl}${icon}@4x.png`;
        document.getElementById('weatherIcon').alt = data.weather[0].description;
        
        const isDay = icon.includes('d');
        document.getElementById('weatherStatus').innerHTML = isDay ? 
            '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        const temp = this.isCelsius ? 
            Math.round(data.main.temp) : this.celsiusToFahrenheit(data.main.temp);
        document.getElementById('currentTemp').textContent = temp;
        document.getElementById('currentUnit').textContent = this.isCelsius ? '°C' : '°F';
        document.getElementById('weatherDesc').textContent = data.weather[0].description;
        
        document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)}km`;
        document.getElementById('humidity').textContent = `${data.main.humidity}%`;
        document.getElementById('windSpeed').textContent = `${data.wind.speed.toFixed(1)}m/s`;
        
        const feelsLike = this.isCelsius ? 
            Math.round(data.main.feels_like) : 
            this.celsiusToFahrenheit(data.main.feels_like);
        document.getElementById('feelsLike').textContent = `${feelsLike}°`;
    }
    
    displayHourlyForecast(data) {
        const container = document.getElementById('hourlyForecast');
        container.innerHTML = '';
        
        const hourlyData = data.list.slice(0, 12);
        
        hourlyData.forEach(item => {
            const date = new Date(item.dt * 1000);
            const hour = date.getHours();
            const temp = this.isCelsius ? 
                Math.round(item.main.temp) : 
                this.celsiusToFahrenheit(item.main.temp);
            
            const hourlyItem = document.createElement('div');
            hourlyItem.className = 'hourly-item';
            hourlyItem.innerHTML = `
                <div class="hourly-time">${hour.toString().padStart(2, '0')}:00</div>
                <img class="hourly-icon" src="${this.iconUrl}${item.weather[0].icon}.png" alt="">
                <div class="hourly-temp">${temp}°</div>
            `;
            container.appendChild(hourlyItem);
        });
    }
    
    displayFiveDayForecast(data) {
        const container = document.getElementById('fiveDayForecast');
        container.innerHTML = '';
        
        const dailyData = this.groupForecastByDay(data.list);
        
        dailyData.slice(0, 5).forEach((day, index) => {
            const date = new Date(day.date);
            const dayName = this.formatDayName(date);
            const avgTemp = this.isCelsius ? 
                Math.round(day.avgTemp) : 
                this.celsiusToFahrenheit(day.avgTemp);
            
            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card';
            forecastCard.innerHTML = `
                <div class="forecast-date">${dayName}</div>
                <img class="forecast-icon" src="${this.iconUrl}${day.icon}.png" alt="">
                <div class="forecast-temp">${avgTemp}°</div>
                <div class="forecast-desc">${day.description}</div>
            `;
            container.appendChild(forecastCard);
        });
    }
    
    updateBackground(weatherType) {
        const gradients = {
            'Clear': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'Clouds': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'Rain': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'Drizzle': 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
            'Thunderstorm': 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
            'Snow': 'linear-gradient(135deg, #e6dada 0%, #274046 100%)',
            'Mist': 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)',
            'Fog': 'linear-gradient(135deg, #ece9e6 0%, #ffffff 100%)',
            'Haze': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            'default': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        };
        
        const gradient = gradients[weatherType] || gradients.default;
        this.bgGradient.style.background = gradient;
    }
    
    toggleUnit() {
        this.isCelsius = !this.isCelsius;
        this.unitText.textContent = this.isCelsius ? '°C' : '°F';
        // Refresh display with new units
        if (this.currentCity) {
            this.searchWeather(this.currentCity);
        }
    }
    
    celsiusToFahrenheit(celsius) {
        return Math.round((celsius * 9/5) + 32);
    }
    
    groupForecastByDay(forecastList) {
        const days = {};
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toDateString();
            
            if (!days[dayKey]) {
                days[dayKey] = {
                    date: date,
                    temps: [],
                    icons: [],
                    descriptions: []
                };
            }
            
            days[dayKey].temps.push(item.main.temp);
            days[dayKey].icons.push(item.weather[0].icon);
            days[dayKey].descriptions.push(item.weather[0].description);
        });
        
        return Object.values(days).map(day => ({
            date: day.date,
            avgTemp: day.temps.reduce((a, b) => a + b) / day.temps.length,
            icon: day.icons[0],
            description: day.descriptions[0]
        }));
    }
    
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatDayName(date) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    showLoading(show = true) {
        this.loadingOverlay.classList.toggle('show', show);
    }
    
    showError(message) {
        this.errorMsg.textContent = message;
        this.errorMsg.classList.add('show');
        setTimeout(() => this.errorMsg.classList.remove('show'), 4000);
    }
    
    hideError() {
        this.errorMsg.classList.remove('show');
    }
}

// 🆕 Initialize when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});