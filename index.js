require('util-is');
var util  = require('util');
var path  = require('path');
var git   = require('git-orm');
var debug = require('debug')('git-orm-fs');
var _     = require('underscore');

module.exports = function(options) {
    return new GitOrmFs(options);
};

function GitOrmFs(options) {
    if (!this instanceof GitOrmFs) {
        return new GitOrmFs(options);
    }

    if (!(util.isObject(options) &&
                options.repo &&
                options.user &&
                options.branch &&
                options.url)) {
        throw new Error('Options argument must be provided with all .');
    }

    var driverOptions = options.url;
    if (options.headers) {
        driverOptions = {
            url: options.url,
            headers: options.headers
        };
    }
    var driver = require('git-orm-nodegit-http')(driverOptions);
    var Repo = git.Repo(driver);
    this.repo = new Repo(options.user, options.repo);
    this.branch = options.branch;

    debug('Done configuring repo.');
}

var getContent = function (filename, self, checker) {
    var filePath = path.normalize(filename);
    // We can't go anywhere below the current tree we're on.
    debug('Opening path: ' + filename);
    if (/^\.\./.test(filePath)) {
        return checker(new Error('Invalid path'));
    }

    // Remove leading dots from path (i.e. ./foo/bar -> /foo/bar)
    if (/^\./.test(filePath)) {
        filePath = filePath.substr(1);
    }

    filePath = filePath.split(path.sep);

    // We're splitting on slashes. Remove leading/trailing empty
    // strings in path array
    if (!filePath[0]) {
        filePath.shift();
    }
    if (!filePath[filePath.length - 1]) {
        filePath.pop();
    }

    var getNext = function (err, tree) {
        if (err) {
            return checker(err);
        }

        debug('Received tree ' + tree.sha);

        var foundPath = _.find(tree.entries, function (entry) {
            return filePath[0] === entry.path;
        });

        if (foundPath) {
            filePath.shift();
            if (filePath.length === 0) {
                debug('Checking entry for correct type.');
                return checker(null, foundPath);
            } else {
                debug('Recursing tree ' + foundPath.sha);
                return self.repo.getTree(foundPath.sha, getNext);
            }
        } else {
            debug('Path entry notfound "' + filename + '"');
            return checker(new Error('Path entry not found'));
        }
    };

    debug('Querying ref ' + self.branch);
    self.repo.getRefs(self.branch, function (err, ref) {
        if (err) {
            throw err;
        }

        debug('Received ref ' + self.branch);

        if (ref.type instanceof git.Commit) {
            throw new Error('Type is not commit');
        }

        self.repo.getCommit(ref.sha, function (err, commit) {
            debug('Received commit ' + commit.sha);
            if (err) {
                throw err;
            }
            if (!filePath.length) { // Case where path was '/'
                self.repo.getTree(commit.tree, checker);
            } else {
                self.repo.getTree(commit.tree, getNext);
            }
        });
    });
};

GitOrmFs.prototype.readFile = function (filename, callback) {
    var self = this;

    var getData = function (err, blob) {
        callback(err, blob ? blob.content : undefined);
    };

    getContent(filename, self, function (err, entry) {
        if (err) {
            return getData(err);
        }

        if (entry instanceof git.Tree || (entry.type && entry.type.isTree)) {
            debug('Entry is not a file, but a directory.');
            getData(new Error('EISDIR'));
        } else if (entry.type.isBlob) {
            debug('Returning file.');
            self.repo.getBlob(entry.sha, getData);
        } else {
            debug('Object is neither a tree nor blob.');
            getData(new Error('Unsupported object type'));
        }
    });
};

GitOrmFs.prototype.readdir = function (path, callback) {
    var self = this;

    var getDir = function (err, tree) {
        callback(err, tree ? _.map(tree.entries, function (entry) {
            return entry.path;
        }) : undefined);
    };

    getContent(path, self, function (err, entry) {
        if (err) {
            return getDir(err);
        }

        if (entry instanceof git.Tree || (entry.type && entry.type.isTree)) {
            debug('Returning directory.');
            self.repo.getTree(entry.sha, getDir);
        } else {
            debug('Entry is not a directory');
            getDir(new Error('ENOTDIR'));
        }
    });
};

GitOrmFs.prototype.read = function (path, callback) {
    var self = this;

    var getData = function (err, blob) {
        callback(err, blob ? blob.content : undefined);
    };

    getContent(path, self, function (err, entry) {
        if (err) {
            return getData(err);
        }

        if (entry instanceof git.Tree || (entry.type && entry.type.isTree)) {
            debug('Returning file.');
            self.repo.getTree(entry.sha, function (err, tree) {
                callback(err, tree ? _.map(tree.entries, function (entry) {
                    return entry.path;
                }) : undefined);
            });

        } else if (entry.type.isBlob) {
            debug('Returning file.');
            self.repo.getBlob(entry.sha, function (err, blob) {
                callback(err, blob ? blob.content : undefined);
            });
        } else {
            debug('Object is neither a tree nor blob.');
            getData(new Error('Unsupported object type'));
        }
    });
};
