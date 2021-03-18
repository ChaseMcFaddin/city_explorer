DROP TABLE IF EXISTS savedlocations;

CREATE TABLE savedlocations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude FLOAT,
  longitude FLOAT
);