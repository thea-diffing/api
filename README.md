[![Build Status](https://travis-ci.org/thea-diffing/api.svg?branch=master)](https://travis-ci.org/thea-diffing/api)
[![Coverage Status](https://coveralls.io/repos/thea-diffing/api/badge.svg?branch=master)](https://coveralls.io/r/thea-diffing/api?branch=master)
[![Dependency Status](https://david-dm.org/thea-diffing/api.svg)](https://david-dm.org/thea-diffing/api)
[![devDependency Status](https://david-dm.org/thea-diffing/api/dev-status.svg)](https://david-dm.org/thea-diffing/api#info=devDependencies)

More to come. The API server to power the visual testing framework.

Based heavily off of https://github.com/webdriverio/webdrivercss-adminpanel

```javascript
/*
Start a build
POST params:
- HEAD sha
- BASE sha
- Num Browsers
Response:
{
    status: "success",
    build: 203
}

{
    status: "failure",
    message: "Invalid Arguments"
}
*/
app.route('/api/startBuild').post(api.startBuild);

/*
Upload a tarball with the images
POST params:
- build id
- sha (40 chars)
- browser name
- images (a tar of the images)
Response:
{
    status: "success"
}

{
    status: "failure",
    message: "unknown sha"
}
*/
app.route('/api/upload').post(api.upload);

/*
Get a build details
GET Params
- id
Response:
{
    id: 203,
    head: {SHA},
    base: {SHA},
    status: "pending" // one of "pending", "failed", "success"
    browsers: ['Chrome 28', 'Firefox 34', 'IE 8'],
    diffs: {
        'Chrome 28': [
            'homepage.navbar.700.png',
            'homepage.navbar.1300.png',
            'homepage.search.700.png',
            'homepage.search.1300.png'
        ],
        'IE 8': [
            'homepage.navbar.700.png',
            'homepage.search.700.png'
        ]
    }
}

{
    status: "failure",
    message: "unknown build"
}
*/
app.route('/api/getBuild').get(api.getBuild);

/*
Approve a build
POST Params
- id
Response:
{
    status: "success"
}

{
    status: "failure",
    message: "unknown build"
}
*/
app.route('/api/confirm').post(api.acceptDiff);

/*
Get the image for the SHA. These routes can be used to in <img> tags
*/
app.route('/api/image/:sha/:browser/:file').get(api.getBranchImage);
app.route('/api/diff/:sha/:browser/:file').get(api.getDiff);
```
