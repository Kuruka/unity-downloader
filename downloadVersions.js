var async = require('async');
var basename = require('path').basename;
var pathJoin = require('path').join;
var urlParse = require('url').parse;
var fileExists = require('fs').exists;
var createWriteStream = require('fs').createWriteStream;
var unlink = require('fs').unlink;
var httpGet = require('http').get;
var mkdirp = require('mkdirp');
var chalk = require('chalk');


function getFileName(url) {
    return basename(urlParse(url).pathname);
}


function downloadFile(url, path, simulate, cb) {
    fileExists(path, function (exists) {
        if (exists) {
            console.log('  file already exists (skipping)');
            return cb();
        }

        if (simulate) {
            return setTimeout(function () {
                console.log('  completed downloading');
                cb();
            }, 100);
        }

        var outStream = createWriteStream(path);

        var req = httpGet(url, function (res) {
            if (res.statusCode < 200 || res.statusCode > 299) {
                console.log(chalk.red('  error downloading: HTTP ' + res.statusCode));
                return cb();
            }

            res.pipe(outStream);

            outStream.on('finish', function () {
                console.log('  completed downloading');
                outStream.close(cb);
            })
        });

        req.on('error', function (error) {
            console.log(chalk.red('  error downloading: ' + error.message));
            unlink(path);
            cb();
        });
    });
}


function downloadForSystem(system, links, outputFolder, simulate, cb) {
    var folder = pathJoin(outputFolder, system);

    function startDownloads() {
        async.forEachOfSeries(
            links,
            function (url, label, cb) {
                var path = pathJoin(folder, getFileName(url));

                console.log(': Downloading', system, label, 'to', path);

                downloadFile(url, path, simulate, cb);
            },
            cb
        );
    }

    if (simulate) {
        return startDownloads();
    }

    mkdirp(folder, function (error) {
        if (error) {
            return cb(error);
        }

        startDownloads();
    });
}


function downloadVersion(version, outputFolder, simulate, cb) {
    console.log('');

    if (version.notes) {
        console.log(chalk.bold('* Downloading Unity ' + version.version + ' packages (Release notes: ' + version.notes + ')'));
    } else {
        console.log(chalk.bold('* Downloading Unity ' + version.version + ' packages (No release notes)'));
    }

    async.forEachOfSeries(
        version.links,
        function (links, system, cb) {
            downloadForSystem(system, links, outputFolder, simulate, cb);
        },
        cb
    );
}


function downloadVersions(versions, outputFolder, simulate) {
    async.eachSeries(
        versions,
        function (version, cb) {
            downloadVersion(version, outputFolder, simulate, cb);
        },
        function (error) {
            if (error) {
                console.error(error);
                process.exit(1);
            }

            console.log('');
            console.log('Completed.');
            console.log('');
        }
    );
}

module.exports = downloadVersions;
