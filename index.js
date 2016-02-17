#!/usr/bin/env node

var http = require('http');
var semver = require('semver');

var extractVersions = require('./extractVersions');
var downloadVersions = require('./downloadVersions');

var argv = require('minimist')(process.argv.slice(2));

function trim(str) {
    return str.trim();
}

function lower(str) {
    return str.toLowerCase();
}

var defaults = {
    url: 'http://unity3d.com/get-unity/download/archive',
    semver: '>= 5.0.0',
    systems: 'mac,win',
    downloads: 'unity editor,unity editor 64-bit',
    out: './',
    'latest-only': false,
    simulate: false
};

var pageUrl = argv.url || defaults.url;
var versionRange = argv.semver || defaults.semver;
var systems = (argv.systems || defaults.systems).split(',').map(trim).map(lower);
var downloads = (argv.downloads || defaults.downloads).split(',').map(trim).map(lower);
var outputFolder = argv.out || argv._[0] || defaults.out;
var statusPath = argv.status || null;
var latestOnly = argv['latest-only'] || defaults['latest-only'];
var simulate = argv.simulate || defaults.simulate;

function help() {
    console.log();
    console.log('Usage: unity-downloader [options]');
    console.log();
    console.log('Options:');
    console.log();
    console.log('  --url=URL           The URL that will be scraped for downloads (default: ' + defaults.url + ')');
    console.log('  --semver=RANGE      A semver range within which to limit your downloads (default: ' + defaults.semver + ')');
    console.log('  --latest-only       Flag for downloading only the most recent version in the range (no value, default: ' + (defaults['latest-only'] ? 'on' : 'off') + ')');
    console.log('  --systems=LIST      For which operating systems to download (default: ' + defaults.systems + ')');
    console.log('  --downloads=LIST    Which packages to download (default: ' + defaults.downloads + ')');
    console.log('  --out=PATH          Output folder (default: ' + defaults.out + ')');
    console.log('  --status=PATH       Output file for single version download info (may contain ${VERSION}, eg: \'${VERSION}.json\'), default: none)');
    console.log('  --simulate          Flag for doing a simulation run (no value, default: ' + (defaults.simulate ? 'on' : 'off') + ')');
    console.log('  --help              This help output');
    console.log();
}

if (argv.help) {
    return help();
}


function semverFilter(versions, versionRange) {
    return versions.filter(function (version) {
        return semver.satisfies(version.version, versionRange);
    });
}


function sortVersionsDesc(versions) {
    versions.sort(function (a, b) {
        return semver.rcompare(a.version, b.version);
    });
}


function stripAllButFirst(versions) {
    versions.splice(1, versions.length);
}


function stripSystemsExcept(versions, keepSystems) {
    versions.forEach(function (version) {
        Object.keys(version.links).forEach(function (system) {
            if (keepSystems.indexOf(system) === -1) {
                delete version.links[system];
            }
        });
    });
}


function stripLinksExcept(versions, labels) {
    versions.forEach(function (version) {
        Object.keys(version.links).forEach(function (system) {
            Object.keys(version.links[system]).forEach(function (label) {
                if (labels.indexOf(label) === -1) {
                    delete version.links[system][label];
                }
            });
        });
    });
}

console.log('Settings:');
console.log('  - url:', pageUrl);
console.log('  - semver:', versionRange);
console.log('  - latest only:', latestOnly ? 'on' : 'off');
console.log('  - systems:', systems.join(', '));
console.log('  - downloads:', downloads.join(', '));
console.log('  - output folder:', outputFolder);
console.log('  - status output file:', statusPath || 'none')
console.log('  - run as simulation:', simulate ? 'on' : 'off');
console.log();
console.log('Scraping for links at', pageUrl);

http.get(pageUrl, function (res) {
    res.setEncoding('utf8');

    var data = '';

    res.on('data', function (str) {
        data += str;
    });

    res.on('end', function () {
        versions = extractVersions(pageUrl, data);
        versions = semverFilter(versions, versionRange);
        sortVersionsDesc(versions);

        if (latestOnly) {
            stripAllButFirst(versions);
        }

        if (systems) {
            stripSystemsExcept(versions, systems);
        }

        stripLinksExcept(versions, downloads);
        downloadVersions(versions, outputFolder, simulate, statusPath);
    });
});
