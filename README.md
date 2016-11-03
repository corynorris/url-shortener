# Url Shortener Microservice
A microservice that shortens urls.

# Demo
## Example Input
https://little-url.herokuapp.com/new/https://www.google.com
https://little-url.herokuapp.com/new/www.google.com

## Example Output
```json
{ 
    "original_url": "http://foo.com:80", 
    "short_url": "https://little-url.herokuapp.com/8170" 
}

```

## Result
Following the `short_url` will then redirect to the `original_url`.