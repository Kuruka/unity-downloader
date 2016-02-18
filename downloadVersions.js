var async = require('async');
var basename = require('path').basename;
var pathJoin = require('path').join;
var urlParse = require('url').parse;
var writeFile = require('fs').writeFile;
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
            return cb(null, false);
        }

        if (simulate) {
            return setTimeout(function () {
                console.log('  completed downloading');
                cb(null, true);
            }, 100);
        }

        var outStream = createWriteStream(path);

        var req = httpGet(url, function (res) {
            if (res.statusCode < 200 || res.statusCode > 299) {
                console.log(chalk.red('  error downloading: HTTP ' + res.statusCode));
                return cb(null, false);
            }

            res.pipe(outStream);

            outStream.on('finish', function () {
                console.log('  completed downloading');
                outStream.close(function (error) {
                    cb(error, true);
                });
            })
        });

        req.on('error', function (error) {
            console.log(chalk.red('  error downloading: ' + error.message));
            unlink(path);
            cb(error, false);
        });
    });
}


function downloadForSystem(system, links, folder, simulate, cb) {
    var paths = [];

    function startDownloads() {
        async.forEachOfSeries(
            links,
            function (url, label, cb) {
                var path = pathJoin(folder, getFileName(url));

                console.log(': Downloading', system, label, 'to', path);

                downloadFile(url, path, simulate, function (error, wasDownloaded) {
                    if (error) {
                        // continue execution even if one file fails to download
                        return cb();
                    }

                    if (wasDownloaded) {
                        paths.push(path);
                    }

                    return cb();
                });
            },
            function (error) {
                cb(error, paths);
            }
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


function downloadVersion(version, outputFolder, simulate, statusPath, cb) {
    console.log('');

    if (version.notes) {
        console.log(chalk.bold('* Downloading Unity ' + version.version + ' packages (Release notes: ' + version.notes + ')'));
    } else {
        console.log(chalk.bold('* Downloading Unity ' + version.version + ' packages (No release notes)'));
    }

    var wasDownloaded = false;

    async.forEachOfSeries(
        version.links,
        function (links, system, cb) {
            var folder = pathJoin(outputFolder, system);

            downloadForSystem(system, links, folder, simulate, function (error, paths) {
                if (error) {
                    return cb(error);
                }

                if (paths.length > 0) {
                    wasDownloaded = true;
                    version.downloads[system] = paths;
                }

                return cb();
            });
        },
        function (error) {
            if (error) {
                return cb(error);
            }

            if (!wasDownloaded || !statusPath) {
                return cb();
            }

            statusPath = statusPath.replace('${VERSION}', version.version);

            writeFile(statusPath, JSON.stringify(version, null, '  '), cb);
        }
    );
}


function downloadVersions(versions, outputFolder, simulate, statusPath) {
    async.eachSeries(
        versions,
        function (version, cb) {
            downloadVersion(version, outputFolder, simulate, statusPath, cb);
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
