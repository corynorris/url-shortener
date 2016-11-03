# Url Shortener Microservice
A microservice that shortens urls.

# Demo
## Example Input
https://little-url.herokuapp.com/new/https://www.google.com
https://little-url.herokuapp.com/new/www.google.com

## Example Output
```json
{
    "short_url": "https://boiling-bayou-79322.herokuapp.com/6",
    "given_url": "www.yahoo.com"
}
```

## Result
Following the `short_url` will then redirect to the `given_url`.