'use strict';

// ----- Dependencies
const express = require('express');
const pg = require('pg');
const cors = require('cors');
require('dotenv').config();
const superagent = require('superagent');
const { response } = require('express'); //eslint-disable-line
// const { response } = require('express');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
const client = new pg.Client(process.env.DATABASE_URL);

// ----- Routes
app.get('/location', handleLocation);
app.get('/weather', handleWeather);
app.get('/trails', handleParks);
app.get('/movies', handleMovies);
app.get('/yelp', handleYelp);

app.use('*', notFound);

// --------------- Location Handler
function handleLocation(request, response){
  let city = request.query.city;
  let key = process.env.LOCATION_API_KEY;

  const checkSQL = `SELECT * FROM location`;
  client.query(checkSQL)
    .then(data => {
      let dataCheck = data.rows.filter(value => value.search_query === city);
      if (dataCheck[0]){
        response.status(200).send(dataCheck[0]);
      } else {
        const URL = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json`;
        superagent.get(URL)
          .then(data => {
            let location = new Location(data.body[0], city);
            response.status(200).send(location);

            const SQL = 'INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4) RETURNING *';
            const safeValues = [location.search_query, location.formatted_query, location.latitude, location.longitude];
            client.query(SQL, safeValues)
              .then(data => { //eslint-disable-line
                //inserts objects in to database city_explorer
              });
          });
      }
    })
    .catch( error => error500(request, response, error));
}

//--------------------- Weather handler
function handleWeather(request, response){
  const parameters = {
    key: process.env.WEATHER_API_KEY,
    lat: request.query.latitude,
    lon: request.query.longitude,
    days: 8
  };
  const URL = `https://api.weatherbit.io/v2.0/forecast/daily`;
  superagent.get(URL)
    .query(parameters)
    .then(value => {
      let forecast = value.body;
      let weatherArray = forecast.data.map(daily => {
        return new Weather(daily);
      });
      response.status(200).send(weatherArray);
    })
    .catch( error => error500(request, response, error));
}

// -------------------- Parks Handler
function handleParks(req, res) {
  const PARKS_API_KEY = process.env.PARKS_API_KEY;
  const park = req.query.formatted_query;
  const url = `https://developer.nps.gov/api/v1/parks?limit=2&start=0&q=${park}&sort=&api_key=${PARKS_API_KEY}`;
  superagent.get(url)
    .then(returnedPark => {
      const parksArray = returnedPark.body.data;
      const output = parksArray.map(parkValue => new Park(parkValue));
      res.send(output);
      console.log(output);
    })
    .catch(error => {
      console.log(error);
      res.status(500).send('Houston we have a problem!');
    });
}

// ------------------------ Movies Handler
function handleMovies(request, response){
  const parameters = {
    api_key: process.env.MOVIE_API_KEY,
    query: request.query.search_query,
  };
  const URL = 'https://api.themoviedb.org/3/search/movie';

  superagent.get(URL)
    .query(parameters)
    .then(value => {
      let movies = value.body.results.map(newMovie => {
        return new Movies(newMovie);
      });
      response.status(200).send(movies);
    })
    .catch( error => error500(request, response, error));
}

// ------------------------ Yelp Handler
function handleYelp(request, response){

  const perPage = 5;
  const page = request.query.page || 1;
  const start = ((page - 1) * perPage + 1);

  const parameters = {
    latitude: request.query.latitude,
    longitude: request.query.longitude,
    limit: perPage,
    offset: start
  };
  const URL = 'https://api.yelp.com/v3/businesses/search';

  superagent.get(URL)
    .auth(process.env.YELP_API_KEY, {type: 'bearer'})
    .query(parameters)
    .then(value => {
      // console.log(value.body.businesses);
      let yelps = value.body.businesses.map(newYelp => {
        return new Yelp(newYelp);
      });
      response.status(200).send(yelps);
    })
    .catch(error => error500(request, response, error));
}

// ----- Location constructor
function Location(obj, query){
  this.search_query = query;
  this.formatted_query = obj.display_name;
  this.latitude = obj.lat;
  this.longitude = obj.lon;
}

// ----- Weather constructor
function Weather(obj){
  this.forecast = obj.weather.description;
  this.time = new Date(obj.valid_date).toDateString();
}

//-------- Parks Constructor
function Park(parkInformation) {
  this.name = parkInformation.name;
  this.address = `${parkInformation}.addresses[0].line1} ${parkInformation[0]} ${parkInformation}.addresses[0].stateCode} ${parkInformation.addresses[0].postalCode}`;
  this.fee = parkInformation = parkInformation.desription;
}

//------------ Movies constructor
function Movies(obj){
  // imgPath below from API docs here: https://developers.themoviedb.org/3/getting-started/images
  const imgPath = `https://image.tmdb.org/t/p/w500`;
  this.title = obj.title;
  this.overview = obj.overview;
  this.average_votes = obj.vote_average;
  this.total_votes = obj.vote_count;
  this.image_url = `${imgPath}${obj.poster_path}`;
  this.popularity = obj.popularity;
  this.released_on = obj.release_date;
}

//------------ Movies constructor
function Yelp(obj){
  this.name = obj.name;
  this. image_url = obj.image_url;
  this.price = obj.price;
  this.rating = obj.rating;
  this.url = obj.url;
}

//---------- Error messages---------------
// ---------------------------------------- 500
function error500(req, res, err) {
  console.log('ERROR 500:', err);
  res.status(500).send(`The thing didn't work so the other thing didn't show up`);
}
//----------------------------------------- 404
function notFound(request, response) {
  console.log('Error 404');
  response.status(404).send(`Couldn't load the thing into the thing from the other thing because there are no things to be had here.`);
}
// ------------------------- Connect to database and server
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`All Hail the Red Dot`);
    });
  })
  .catch(error => {
    console.log('error message:', error);
  });
