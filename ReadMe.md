# Unity Downloader

This is a CLI tool written in Node.js (so yes, you will need to install Node) to help you
download [Unity](http://unity3d.com/) [releases](http://unity3d.com/get-unity/download/archive)
and maintain copies of multiple versions. It can be very useful to stick this in a CI environment
which could download new releases the moment they are out, avoiding the long wait for the
download to complete. For teams, it can also mean a big win by not having everyone download their
individual copies through the official Unity Downloader, but instead installing from the same
shared downloaded packages.

## Installing

Make sure you have Node.js installed. Pretty much any version should work, as we don't use any
new high-tech super rainbow unicorn APIs, nor ES6.

```sh
npm install --global unity-downloader
```

## Usage

unity-downloader --help

## License

MIT