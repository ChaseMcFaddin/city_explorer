DROP TABLE IF EXISTS location;

CREATE TABLE location (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude FLOAT,
  longitude FLOAT
);

DROP TABLE IF EXISTS weather;

CREATE TABLE weather (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  time VARCHAR(255)
);