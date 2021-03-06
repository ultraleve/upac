//// INIT

Dropzone.autoDiscover = false;
moment.lang('pt-br');
//var showdown = new Showdown.converter({extensions:["table", "ufm"]});

//// FLAT UI PALLETE

var palette_all = ['palette-turquoise','palette-green-sea','palette-emerland','palette-nephritis','palette-peter-river', 'palette-belize-hole', 'palette-amethyst', 'palette-wisteria', 'palette-wet-asphalt', 'palette-midnight-blue', 'palette-sun-flower', 'palette-orange', 'palette-carrot', 'palette-pumpkin', 'palette-alizarin', 'palette-pomegranate'];
var palette = ['palette-turquoise','palette-peter-river', 'palette-wisteria', 'palette-pomegranate', 'palette-carrot', 'palette-sun-flower'];


//// EMBER APP

var App = Ember.Application.create({
    // mostrar transicoes
    LOG_TRANSITIONS: true,
    // salvar path
    currentPath: ''
});

//// EMBER Helpers

Ember.Handlebars.registerBoundHelper('momentago', function(value, options) {
  var escaped = Handlebars.Utils.escapeExpression(value);
  if(value) return new Handlebars.SafeString('<span class="momentago">' + moment(escaped).fromNow() + '</span>');
});

Ember.Handlebars.registerBoundHelper('momentdate', function(value, options) {
  var escaped = Handlebars.Utils.escapeExpression(value);
  if(value) return new Handlebars.SafeString('<span class="momentdate">' + moment(escaped).format('L') + '</span>');
});

Ember.Handlebars.registerBoundHelper('momentevent', function(value, options) {
  var escaped = Handlebars.Utils.escapeExpression(value);
  if(value) return new Handlebars.SafeString('<span class="momentdate">' + moment(escaped).format('LLLL') + '</span>');
});

Ember.Handlebars.registerBoundHelper('ufm', function(value, options) {
  //var escaped = Handlebars.Utils.escapeExpression(value);
  //return new Handlebars.SafeString(showdown.makeHtml(escaped));
  if(showdown && value) return new Handlebars.SafeString(showdown.makeHtml(value));
});


//// JQUERY PLUGIN SHUFFLE

(function($){
 
    $.fn.shuffle = function() {
 
        var allElems = this.get(),
            getRandom = function(max) {
                return Math.floor(Math.random() * max);
            },
            shuffled = $.map(allElems, function(){
                var random = getRandom(allElems.length),
                    randEl = $(allElems[random]).clone(true)[0];
                allElems.splice(random, 1);
                return randEl;
           });
 
        this.each(function(i){
            $(this).replaceWith($(shuffled[i]));
        });
 
        return $(shuffled);
 
    };
 
})(jQuery);