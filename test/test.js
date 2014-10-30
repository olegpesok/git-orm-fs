var GitOrmFs = require('../index');
var should = require('should');
var _ = require('underscore');

var fs = new GitOrmFs({
    url: 'https://api.github.com',
    headers: { encoding: 'utf-8' },
    user: 'GitStarInc',
    repo: 'git-orm-testrepo',
    branch: 'heads/master'});

var rootDir = ['dir', 'file'];

var dirDir = ['file'];

var testPaths = [
 { path: '.',               dirError: false, fileError: true, result: rootDir },
 { path: '..',              dirError: true,  fileError: true },
 { path: '/',               dirError: false, fileError: true, result: rootDir },
 { path: './',              dirError: false, fileError: true, result: rootDir },
 { path: './/',             dirError: false, fileError: true, result: rootDir },
 { path: 'file',            dirError: true,  fileError: false, result: 'hello world!\n' },
 { path: '/file',           dirError: true,  fileError: false, result: 'hello world!\n' },
 { path: './file',          dirError: true,  fileError: false, result: 'hello world!\n' },
 { path: '/dir',            dirError: false, fileError: true, result: dirDir },
 { path: '/dir/file',       dirError: true,  fileError: false, result: 'w00t\n' },
 { path: '/foo',            dirError: true,  fileError: true },
 { path: '/dir/foo',        dirError: true,  fileError: true },
 { path: '/dir/../file',    dirError: true,  fileError: false, result: 'hello world!\n' },
];

function dirTester(testPath) {
    it(
        'Should ' + (testPath.dirError ? 'error: "' : 'read: "') + testPath.path + '"',
        function(done) {
            fs.readdir(testPath.path, function(err, data) {
                if (testPath.dirError) {
                    should.exist(err);
                    done();
                } else {
                    JSON.stringify(data).should.equal(
                        JSON.stringify(testPath.result));
                    done(err);
                }
            });
        });
}

function fileTester(testPath) {
    it(
        'Should ' + (testPath.fileError ? 'error: "' : 'read: "') + testPath.path + '"',
        function(done) {
            fs.readFile(testPath.path, function(err, data) {
                if (testPath.fileError) {
                    should.exist(err);
                    done();
                } else {
                    data.should.equal(testPath.result);
                    done(err);
                }
            });
        });
}

describe('fs', function() {
    describe('#readdir', function() {
        _.each(testPaths, function (testPath) {
            dirTester(testPath);
        });
    });
});

describe('fs', function() {
    describe('#readFile', function() {
        _.each(testPaths, function (testPath) {
            fileTester(testPath);
        });
    });
});

