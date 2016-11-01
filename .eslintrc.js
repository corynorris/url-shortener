module.exports = {
    "extends": "airbnb",
    "plugins": [
        "react",
        "jsx-a11y",
        "import"
    ],
    "rules": {
        // Disable `no-console` rule
        "no-console": 0,
        "indent": 4,
        "arrow-parens": ["error", "always", {
            "requireForBlockBody": true,
        }]
    }
};