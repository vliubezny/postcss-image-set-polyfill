var postcss = require('postcss');

// get the list of images
var extractList = function (decl) {
    return postcss.list.comma(decl.value.match(/image-set\((.+)\)/)[1]);
};

// get the size of image
var extractSize = function (image) {
    var l = postcss.list.space(image);
    if (l.length === 1) {
        return '1x';
    } else {
        return l[1];
    }
};

// get the url of an image
var extractUrl = function (image) {
    return postcss.list.space(image)[0];
};

var split = function (image) {
    return {
        size: extractSize(image)
  , url:  extractUrl(image)
    }
};

// get the default image
var getDefault = function (images) {
    var img = images.filter(function (image) { image.size === '1x' })[0];
    if ( !img ) {
        // just use first image
        return images[0];
    } else {
        return img;
    }
};

var sizeToResolution = function (size) {
    var m = size.match(/([0-9]+)x/);
    if ( m ) {
        var ratio = m[1];
        return ratio + 'dppx';
    } else {
        // for 'dpi', etc.
        return size;
    }
};


module.exports = postcss.plugin('postcss-image-set', function (opts) {
    opts = opts || {};

    return function (css) {
        css.walkDecls('background-image', function (decl) {

            if ( decl.__visited ) {
                return;
            }

            // make sure we have image-set
            if (!decl.value || decl.value.indexOf('image-set') === -1) {
                return;
            }

            // console.log(decl.value);

            var images = extractList(decl)
            .map(split)
            ;

            // add the default image to the decl
            var image = getDefault(images);
            decl.cloneBefore({
                value: image.url
            });

            // for each image add a media query
            images
            .filter(function (image) { return image.size !== '1x' })
            .forEach(function(image) {
                var atrule = postcss.atRule({
                    name: 'media'
                    , params: '(screen and min-resolution: ' + sizeToResolution(image.size) + ')'
                });


                // clone empty parent with only relevant decls
                var parent = decl.parent.clone({
                    nodes: [
                    ]
                });

                var d  = decl.clone({ value: image.url });
                var dd = decl.clone();
                d.__visited  = true;
                dd.__visited = true;

                parent.append(
                    d
                    , dd
                );
                atrule.append(parent);

                decl.root().append(atrule);
            });
        });
    };
});
