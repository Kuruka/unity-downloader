var HtmlParser = require('htmlparser2').Parser;
var resolveUrl = require('url').resolve;


function Version(version) {
    this.version = version;
    this.notes = null;
    this.links = {};
    this.downloads = {};
}


function extractUrls(baseUrl, html) {
    var result = [];
    var instance = null;
    var state = null;
    var url = null;
    var system = null;
    var inSection = false;

    function openTag(name, attr) {
        if (!inSection && name !== 'section') {
            return;
        }

        switch (name) {
        case 'section':
            inSection = true;
            break;
        case 'h1':
            state = 'PARSE_VERSION';
            break;
        case 'div':
            if (attr.class === 'trigger') {
                state = 'PARSE_SYSTEM';
            }
            break;
        case 'a':
            if (!instance || !attr.href) {
                break;
            }
            // attr.href *should* be HTML encoded, but in this case isn't, so we don't try to decode
            url = resolveUrl(baseUrl, attr.href);
            state = 'PARSE_LINK';
            break;
        }
    }

    function text(str) {
        if (!inSection) {
            return;
        }

        str = str.trim();

        switch (state) {
        case 'PARSE_VERSION':
            var m = str.match(/^Unity ([0-9+]\.[0-9+]\.[0-9+])$/);
            if (m) {
                instance = new Version(m[1]);
                system = null;
                result.push(instance);
            }
            state = null;
            break;
        case 'PARSE_SYSTEM':
            if (instance) {
                var m = str.match(/^Downloads \((.+?)\)$/);
                if (m) {
                    system = m[1].toLowerCase();
                    instance.links[system] = {};
                }
            }
            state = null;
            break;
        case 'PARSE_LINK':
            if (instance && url) {
                if (str.match(/Release notes/i)) {
                    instance.notes = url;
                } else if (system) {
                    instance.links[system][str.toLowerCase()] = url;
                }
            }

            state = null;
            break;
        }
    }

    function onClose(name) {
        switch (name) {
        case 'section':
            inSection = false;
        }
    }

    var parser = new HtmlParser({
        onopentag: openTag,
        ontext: text,
        onclosetag: onClose
    });

    parser.write(html);
    parser.end();

    return result;
}

module.exports = extractUrls;
