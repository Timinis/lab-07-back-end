'use strict';

// Require dependencies
const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const app = express();

app.use(cors());

require('dotenv').config();

const PORT = process.env.PORT;

app.get('/location', getLocation);

app.get('/weather', getWeather);

function getLocation(request, response) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${
    request.query.data
  }&key=${process.env.GOOGLE_API_KEY}`;
  return superagent.get(url).then(result => {
    const locationResult = new Location(request, result);
    response.send(locationResult);
  });
}

function getWeather(request, response) {
  const url = `https://api.darksky.net/forecast/${
    process.env.DARK_SKY_API_KEY
  }/${request.query.data.latitude},${request.query.data.longitude}`;
  return superagent
    .get(url)
    .then(result => {
      response.send(
        result.body.daily.data.map(element => new Weather(element))
      );
    })
    .catch(error => handleError(error, response));
}

function handleError(err, res) {
  console.error(err);
  if (res) res.status(500).send('Sorry, something went wrong');
}

function Weather(day) {
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
  this.forecast = day.summary;
}

function Location(req, result) {
  this.search_query = req.query.data;
  this.formatted_query = result.body.results[0].formatted_address;
  this.latitude = result.body.results[0].geometry.location.lat;
  this.longitude = result.body.results[0].geometry.location.lng;
}
// may need to move
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
