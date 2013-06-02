
//// VIEW

App.RedeMapaView = Ember.View.extend({
    templateName: 'rede_mapa',
    handleZoom: function() {
        if (App.map.getZoom() < 2){
            App.map.setZoom(2);
        }
        console.log('zoom factor',App.map.getZoom());
    },
    didInsertElement: function(){

        var MY_MAPTYPE_ID = "UPAC";

        var myOptions = {
            center: new google.maps.LatLng(0, 0),
            zoom: 3,
            mapTypeId: MY_MAPTYPE_ID,
            mapTypeControlOptions: {
                mapTypeIds: [google.maps.MapTypeId.ROADMAP, MY_MAPTYPE_ID]
            },
            mapTypeControl: false,
            streetViewControl: false,
            panControl: false,
            zoomControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.MEDIUM,
                position: google.maps.ControlPosition.LEFT_BOTTOM
            }
        };
        
        // cria mapa
        App.map = new google.maps.Map($("#map_canvas").get(0),myOptions);
        // cria estilo
        var styledMapOptions = { name: 'UPAC Map' };
        var customMapType = new google.maps.StyledMapType(mapstyles.lightblue, styledMapOptions);
        // aplica estilo
        App.map.mapTypes.set(MY_MAPTYPE_ID, customMapType);
        // eventos
        google.maps.event.addListener(App.map, 'click', function(e){
            App.MapController.onMapClick(e);
        });
        google.maps.event.addListener(App.map, 'zoom_changed', this.handleZoom);

        //// INFOBOX

        var InfoBoxOptions = {
             content: null
            ,disableAutoPan: true
            ,maxWidth: 0
            ,pixelOffset: new google.maps.Size(-104, 0)
            ,zIndex: null
            ,boxStyle: { 
              width: "207px"
             }
            ,closeBoxURL: ""
            ,infoBoxClearance: new google.maps.Size(1, 1)
            ,isHidden: false
            ,pane: "floatPane"
            ,enableEventPropagation: false
        };

        App.map_infobox = new InfoBox(InfoBoxOptions);
    }
});

//// OBJECTS

App.MapStyles = Em.Object.create({
    info_box: '<div class="tooltip bottom fade in" style="top: 0px; left: 0px; display: block;"><div class="tooltip-arrow" style=""></div><div class="tooltip-inner">{{content}}</div></div>',
    cursor: {
        hand: 'url(http://maps.gstatic.com/mapfiles/openhand_8_8.cur) 8 8, default'
    },
    pin: {
        user: [
            new google.maps.MarkerImage(
                './img/pin_user1.png',
                new google.maps.Size(32, 32),
                new google.maps.Point(0,0),
                new google.maps.Point(16, 32)
            ),
            {
                coord: [1, 1, 1, 32, 32, 32, 32 , 1],
                type: 'poly'
            }
        ],
        user_select: [
            new google.maps.MarkerImage(
                './img/pin_user_select.png',
                new google.maps.Size(64, 64),
                new google.maps.Point(0,0),
                new google.maps.Point(32, 64)
            ),
            {
                coord: [1, 1, 1, 64, 64, 64, 64 , 1],
                type: 'poly'
            }
        ]
    }
});

App.MapController = Em.Object.create({
    isMarking: false,
    isFetching: true,
    markers: [],
    focus: null,
    findTheUser: function(){
        return _.findWhere(App.MapController.markers,{username: User.auth.username});
    },
    findUser: function(username){
        return _.findWhere(App.MapController.markers,{username: username});
    },
    focusUser: function(username){
        if(this.get('isFetching')){
            console.log('saved focus');
            this.set('saveFocus',username);
        }else{
            console.log("focus " + username);

            var current = _.findWhere(App.MapController.markers,{username: username});
            
            this.unFocusAll();

            if(current.marker){
                google.maps.event.trigger(current.marker, 'mouseover');
                current.marker.setIcon(App.MapStyles.pin.user_select[0]);
                current.marker.setShape(App.MapStyles.pin.user_select[1]);
                current.selected = true;
                App.map.panTo(current.marker.getPosition());
            }
        }
    },
    unFocusAll: function(){
        var last = _.findWhere(App.MapController.markers,{selected: true});
        if(last){
            last.marker.setIcon(App.MapStyles.pin.user[0]);
            last.marker.setShape(App.MapStyles.pin.user[1]);
            last.selected = false;
        }
        if(App.map_infobox){
            App.map_infobox.close();
        }
    },
    getMarkers: function(){  
        var that = this;
        this.markers = [];
        that.set('isFetching',true);
        $.ajax({
            type: 'GET',
            url: '/users',
            data: { limit: 0 },
            success: function(data, status, jqXHR){
                console.log('map: loaded users');
                User.authenticate(data.auth);
                $.each(data.users, function(i,user){
                    that.markers.push({
                        selected: false,
                        name: user.name,
                        username: user.username,
                        geo: user.geo && user.geo.length ? user.geo : [],
                        marker: user.geo && user.geo.length
                                ? App.MapController.createMarker(user.username, new google.maps.LatLng(user.geo[0],user.geo[1]))
                                : null
                    });
                });
                that.set('isFetching',false);

                if(that.get('saveFocus') != null){
                    console.log('delayed focus');
                    that.focusUser(that.get('saveFocus'));
                    that.set('saveFocus',null);
                }
            },
            error: function(jqXHR,status,error){
                console.log(jqXHR);
                _self.authenticate(JSON.parse(jqXHR.responseText));
                that.set('isFetching',false);
            }
        });
    },
    startMarking: function(){
        this.set('isMarking',true);
        App.map.setOptions({draggableCursor:'pointer'});
    },
    finishMarking: function(save){
        var that = this;
        var user = App.MapController.findTheUser();
        if(save && user.marker != null){
            var pos = [
                user.marker.getPosition().lat(),
                user.marker.getPosition().lng()
            ];
            $.ajax({
                type: 'PUT',
                url: '/user/'+User.get('auth.id'),
                data: { geo: pos },
                success: function(data, status, jqXHR){
                    user.geo[0] = pos[0];
                    user.geo[1] = pos[1];
                    User.authenticate(data.auth);
                    that.set('isMarking',false);
                    App.map.setOptions({draggableCursor: App.MapStyles.cursor.hand});
                    console.log('saved',pos);
                },
                error: function(jqXHR,status,error){
                    console.log(jqXHR);
                    User.authenticate(JSON.parse(jqXHR.responseText));
                }
            });
        } else {
            if(user.geo.length == 0){
                if(user.marker){
                    user.marker.setMap(null)
                    user.marker = null;
                }
            } else {
                user.marker.setPosition(
                    new google.maps.LatLng(user.geo[0],user.geo[1])
                )
            }
            that.set('isMarking',false);
            App.map.setOptions({draggableCursor: App.MapStyles.cursor.hand});
        }
        
    },
    createMarker: function(username, latLng, select){
        var pin_type = select ? App.MapStyles.pin.user_select : App.MapStyles.pin.user;
        var marker = new google.maps.Marker({
            position: latLng,
            map: App.map,
            icon: pin_type[0],
            shadow: null,
            shape: pin_type[1]
        });
        google.maps.event.addListener(marker, 'click', function() {
            if(App.MapController.isMarking) return false;
            //App.map.panTo(marker.getPosition());
            //App.MapController.focusUser(username);
            window.location.hash = '/rede/perfil/'+username;
        });
        google.maps.event.addListener(marker, 'mouseover', function() {
            var user = App.MapController.findUser(username);
            App.map_infobox.setContent(App.MapStyles.info_box.split('{{content}}').join(user.name || user.username));
            App.map_infobox.open(App.map, this);
        });
        google.maps.event.addListener(marker, 'mouseout', function() {
            //App.map_infobox.close();
            var last = _.findWhere(App.MapController.markers,{selected: true});
            if(last && last.marker != this){
                google.maps.event.trigger(last.marker, 'mouseover');
            }
        });
        return marker;
    },
    onMapClick: function(e){

        if(!App.MapController.isMarking){
            
            App.MapController.unFocusAll();
            window.location.hash = '/rede';
            //console.log( 'get position!', e.latLng );

        } else {

            var user = App.MapController.findTheUser();
            
            console.log( 'mark!', e.latLng.kb, user, user.marker );

            if(user.marker === null){
                user.marker = App.MapController.createMarker(user.username, e.latLng, true);
            } else {
                user.marker.setPosition(e.latLng);
            }
        }
    }
});
