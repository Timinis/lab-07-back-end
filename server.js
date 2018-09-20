'use strict';

// Require dependencies
const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const app = express();

app.use(cors());

require('dotenv').config();

const PORT = process.env.PORT;

//Object Creators to send to front-end

const locationCreator = (req, result) => ({
  search_query: req.query.data,
  formatted_query: result.body.results[0].formatted_address,
  latitude: result.body.results[0].geometry.location.lat,
  longitude: result.body.results[0].geometry.location.lng
});

const weatherCreator = day => ({
  forecast: day.summary,
  time: new Date(day.time * 1000).toString().slice(0, 15)
});

const yelpCreator = food => ({
  name: food.name,
  image_url: food.image_url,
  price: food.price,
  rating: food.rating,
  url: food.url
});

const moviesCreator = movies => ({
  title: movies.title,
  overview: movies.overview,
  average_votes: movies.vote_average,
  total_votes: movies.vote_count,
  image_url: movies.poster_path,
  popularity: movies.popularity,
  released_on: movies.release_date
});

//The function to call upon request

const getLocation = (request, response) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${
    request.query.data
  }&key=${process.env.GOOGLE_API_KEY}`;
  superagent
    .get(url)
    .then(result => {
      const locationResult = locationCreator(request, result);
      response.send(locationResult);
    })
    .catch(error => handleError(error, response));
};

const getWeather = (request, response) => {
  const url = `https://api.darksky.net/forecast/${
    process.env.DARK_SKY_API_KEY
  }/${request.query.data.latitude},${request.query.data.longitude}`;
  return superagent
    .get(url)
    .then(result => {
      response.send(
        result.body.daily.data.map(element => weatherCreator(element))
      );
    })
    .catch(error => handleError(error, response));
};

const getYelp = (request, response) => {
  const url = `https://api.yelp.com/v3/businesses/search?location=${
    request.query.data.search_query
  }`;
  superagent
    .get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(result => {
      response.send(
        result.body.businesses.map(element => yelpCreator(element))
      );
    })
    .catch(error => handleError(error, response));
};

const getMovies = (request, response) => {
  const url = `https://api.themoviedb.org/3/search/movie/?api_key=${
    process.env.MOVIEDB_API_KEY
  }&language=en-US&page=1&query=${request.query.data.search_query}`;
  superagent
    .get(url)
    .then(result => {
      response.send(result.body.results.map(element => moviesCreator(element)));
    })
    .catch(error => handleError(error, response));
};

const handleError = (err, res) => {
  console.error(err);
  if (res) res.status(500).send('Sorry, something went wrong');
};

//Use the add listener

app.get('/location', getLocation);

app.get('/weather', getWeather);

app.get('/yelp', getYelp);

app.get('/movies', getMovies);

//Waiting on Port

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
