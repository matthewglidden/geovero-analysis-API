// index.js
import OpenAI from 'openai';
import axios from 'axios';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI();
const app = express();
const PORT = process.env.PORT || 3000;
const PLACES_API_KEY = process.env.PLACES_API_KEY;

// Function to find the target hotel by name
async function findHotelLocation(hotelName) {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(hotelName)}&type=lodging&key=${PLACES_API_KEY}`;
  const response = await axios.get(searchUrl);
  const data = response.data;

  if (data.results && data.results.length > 0) {
    const hotel = data.results[0];
    return {
      name: hotel.name,
      placeId: hotel.place_id,
      location: {
        latitude: hotel.geometry.location.lat,
        longitude: hotel.geometry.location.lng
      }
    };
  } else {
    throw new Error('Hotel not found');
  }
}

// Function to get competitors nearby
async function getCompetitors(location) {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=2000&type=lodging&key=${PLACES_API_KEY}`;
  const response = await axios.get(searchUrl);
  const data = response.data;

  return data.results.map(hotel => ({
    name: hotel.name,
    placeId: hotel.place_id,
    rating: hotel.rating || 'N/A',
    userRatingsTotal: hotel.user_ratings_total || 0
  })).slice(0, 5); // Limit to top 5 competitors
}

// Function to get nearby amenities
async function getNearbyAmenities(location) {
  const types = ['restaurant', 'cafe', 'tourist_attraction']; // Add relevant types
  const radius = 500; // 500 meters radius for a "walkable" area

  const amenities = {};

  for (const type of types) {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=${radius}&type=${type}&key=${PLACES_API_KEY}`;
    const response = await axios.get(searchUrl);
    const data = response.data;

    amenities[type] = data.results.map(place => ({
      name: place.name,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      address: place.vicinity
    })).slice(0, 5); // Limit to top 5 places of each type
  }

  return amenities;
}

// Function to analyze nearby amenities and generate recommendations
function analyzeAmenities(amenities) {
  const analysis = {
    highlights: [],
    recommendations: []
  };

  // Loop through each type of amenity
  for (const type in amenities) {
    const places = amenities[type];

    if (places.length > 0) {
      // Sort places by rating to find the top-rated place
      const topRated = places.sort((a, b) => b.rating - a.rating)[0];
      analysis.highlights.push({
        type,
        topPlace: {
          name: topRated.name,
          rating: topRated.rating,
          address: topRated.address
        },
        count: places.length
      });

      // Generate a simple recommendation based on the type and availability
      if (topRated.rating >= 4) {
        analysis.recommendations.push(`Highlight nearby ${type} options, such as ${topRated.name} with a rating of ${topRated.rating}.`);
      } else if (places.length < 3) {
        analysis.recommendations.push(`Consider enhancing ${type} options or recommending hotel amenities, as nearby options are limited.`);
      }
    }
  }

  return analysis;
}

// Function to get details and reviews for each competitor
async function getHotelDetails(placeId) {
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,reviews,formatted_address&key=${PLACES_API_KEY}`;
  const response = await axios.get(detailsUrl);
  const data = response.data;

  if (data.result) {
    return {
      address: data.result.formatted_address,
      rating: data.result.rating,
      reviews: data.result.reviews ? data.result.reviews.slice(0, 3) : [] // Limit to top 3 reviews
    };
  }
  return {};
}

// AI-driven function to generate opportunities based on review summaries
async function generateOpportunitiesWithAI(summary) {
  const prompt = `Given the following reviews, create a concise list of up to five actionable opportunities of 10-20 words each to improve the hotel, based on its own guest feedback and the performance of nearby competitors:\n\n"${summary}"\n\nOpportunities:`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 250,
    temperature: 0.7
  });

  return completion.choices[0].message.content.split("\n").map(opportunity => opportunity.trim());
}

// Main API route
app.get('/analyzeApi', async (req, res) => {
  const hotelName = req.query.hotel_name;
  if (!hotelName) {
    return res.status(400).json({ error: "Please provide a hotel name." });
  }

  try {
    // Step 1: Find the main hotel location
    const hotel = await findHotelLocation(hotelName);

    // Step 2: Get competitors around the main hotel
    const competitors = await getCompetitors(hotel.location);

    // Step 3: Get nearby amenities around the main hotel
    const nearbyAmenities = await getNearbyAmenities(hotel.location);

    // Step 4: Analyze nearby amenities and generate recommendations
    const amenitiesAnalysis = analyzeAmenities(nearbyAmenities);

    // Step 5: Get details and insights for each competitor
    for (const competitor of competitors) {
      const details = await getHotelDetails(competitor.placeId);
      competitor.address = details.address;
      competitor.latestReviews = details.reviews;

      // Generate a summary of the reviews
      const summary = details.reviews.map(review => review.text).join(" ");
      competitor.reviewSummary = summary;

      // Generate AI-based opportunities using OpenAI
      competitor.opportunities = await generateOpportunitiesWithAI(summary);
    }

    // Step 6: Return the results as JSON
    res.json({ hotel, competitors, nearbyAmenities, amenitiesAnalysis });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res, next) => {
  const apiKey = req.query.api_key || req.headers['authorization'];
  if (apiKey !== process.env.AUTHORIZED_API_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Ensure this line is at the end of your index.mjs
export const analyzeApi = app;
