const axios = require('axios');

exports.handler = async (event) => {
    // 1. Get API Key securely from Netlify environment settings
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; 
    
    // Safety check for method
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }
    
    try {
        // Parse the request body (mood and language sent from the frontend fetch call)
        const { mood, language } = JSON.parse(event.body);

        if (!mood || !language) {
             return { statusCode: 400, body: JSON.stringify({ error: "Missing mood or language." }) };
        }

        // Build the search query for variety and relevance
        const searchQuery = `${language} ${mood} ${mood === 'stressed' ? 'calming instrumental' : 'upbeat pop'} song OR playlist`;

        // 2. Call YouTube Data API
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                key: YOUTUBE_API_KEY,
                part: 'snippet',
                q: searchQuery,
                type: 'video',
                maxResults: 20, 
                videoEmbeddable: 'true',
            }
        });

        // 3. Filter and select a random video ID
        const videos = response.data.items.filter(item => item.id.kind === 'youtube#video');
        
        if (!videos || videos.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: "No diverse videos found for that criteria." }) };
        }

        const randomIndex = Math.floor(Math.random() * videos.length);
        const randomVideoId = videos[randomIndex].id.videoId;
        const url = `https://www.youtube.com/watch?v=${randomVideoId}`;

        // 4. Return the secure URL to the frontend
        return { statusCode: 200, body: JSON.stringify({ url: url }) };

    } catch (error) {
        console.error("Netlify Function Error:", error.message);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal API call failed." }) };
    }
};