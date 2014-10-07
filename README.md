# Interface to git via a FS-like API

## Example
This initializes the connector.

```javascript

var GitOrmFs = require('git-orm-fs');
var fs = new GitOrmFs({
    url: 'https://api.github.com',
    user: 'GitStarInc',
    repo: 'nodegit-http',
    branch: 'heads/master'
});


fs.readdir('/lib/', function(err, files) {
    if (err) {
        throw err;
    }
    console.log(files);
});
fs.readFile('/lib/nodegit-http.js', function(err, data) {
    if (err) {
        throw err;
    }
    console.log(data);
});
```
