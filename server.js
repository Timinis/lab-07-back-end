'use strict';

// Require dependencies
const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');
require('dotenv').config();

const client = new pg.Client(process.env.DATABASE_URL);
const app = express();
console.log('access to database');
app.use(cors());
client.connect();

const PORT = process.env.PORT;

//Object Creators to send to front-end

const locationCreator = (req, result) => ({
  table_name: 'locations',
  search_query: req.query.data,
  formatted_query: result.body.results[0].formatted_address,
  latitude: result.body.results[0].geometry.location.lat,
  longitude: result.body.results[0].geometry.location.lng,
  created_at: Date.now()
});

const weatherCreator = day => ({
  forecast: day.summary,
  time: new Date(day.time * 1000).toString().slice(0, 15),
  created_at: Date.now()
});

const yelpCreator = food => ({
  name: food.name,
  image_url: food.image_url,
  price: food.price,
  rating: food.rating,
  url: food.url,
  created_at: Date.now()
});

const moviesCreator = movies => ({
  title: movies.title,
  overview: movies.overview,
  average_votes: movies.vote_average,
  total_votes: movies.vote_count,
  image_url: movies.poster_path,
  popularity: movies.popularity,
  released_on: movies.release_date,
  created_at: Date.now()
});

//Function to check if data exists in SQL

const lookupLocation = location => {
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
  const values = [location.query];
  return client
    .query(SQL, values)
    .then(result => {
      if (result.rowCount > 0) {
        returnCache(result);
      } else {
        //getLocationAndSave();
      }
    })
    .catch(console.error);
};

//Functiion to delete sql if data is outdated

//Function to send back sql result if data is not outdated

const returnCache = result => {
  response.send(result);
};

//Function to store cache

const saveToLocation = location => {
  const SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id;`;
  const values = [
    location.search_query,
    location.formatted_query,
    location.latitude,
    location.longitude
  ];
  return client
    .query(SQL, values)
    .then(result => {
      location.id = result.rows[0].id;
      return location;
    })
    .catch(console.error);
};

//The function to call API display it and store it

const displayAndStoreLocation = (request, response) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${
    request.query.data
  }&key=${process.env.GOOGLE_API_KEY}`;
  superagent
    .get(url)
    .then(result => {
      const locationResult = locationCreator(request, result);
      saveToLocation(locationResult).then(locationResult =>
        response.send(locationResult)
      );
    })
    .catch(error => handleError(error, response));
};

const getWeatherAndSave = (request, response) => {
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

const getYelpAndSave = (request, response) => {
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

const getMoviesAndSave = (request, response) => {
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

//Final function to call it all with logic statement

//Use the add listener

app.get('/location', displayAndStoreLocation);

app.get('/weather', getWeatherAndSave);

app.get('/yelp', getYelpAndSave);

app.get('/movies', getMoviesAndSave);

//Waiting on Port

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
