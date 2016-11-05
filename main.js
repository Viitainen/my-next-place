
// Vue.filter('range', function(value, minValue, maxValue) {
//     console.log(value + ',' + minValue + ', ' + maxValue);
//     if(value > maxValue) { return maxValue; }
//     else if(value < minValue) { return minValue; }
//     else { return value; }
// });
//
// Vue.filter('range', {
//     read: function(val, minValue, maxValue){
//         if(val > maxValue) return maxValue;
//         else if(val < minValue) return minValue;
//         else return val;
//     },
//
//     write: function(val, oldVal) {
//         console.log(this.radius);
//         return val;
//     }
// })


Vue.transition('slide-vertical', {
    'enterClass': 'slideInDown',
    'leaveClass': 'slideOutUp'
});

Vue.transition('slide-horizontal', {
    'enterClass': 'slideInRight',
    'leaveClass': 'slideOutRight'
});

Vue.transition('flip-x', {
    'enterClass': 'flipInX',
    'leaveClass': 'flipOutX'
});

Vue.filter('toSpaces', function(value) {
    return value.replace(/_/g, " ");
});

Vue.component('alert', {
    template: '#alert-template',

    props: {
         type: { default: 'success' },
         important: { type: Boolean, default: false },
         timeout: { default: 3000 }
    },

    data: function() {
        return {
            show: true
        }
    },

    ready: function() {
        if(!this.important) {
            var self = this;
            setTimeout(function() {
                self.show = false;
            }, this.timeout);
        }
    },

    computed: {
        alertClasses: function() {
            return {
                'alert': true,
                'alert-dismissible': true,
                'alert-success': this.type == 'success',
                'alert-info': this.type == 'info',
                'alert-warning': this.type == 'warning',
                'alert-danger': this.type == 'error'
            }
        }
    }
});

Vue.component('map', {
    props: ['address', 'radius', 'place-type', 'random-result', 'travel-mode','show-direction-steps'],

    data: function() {
        return {
            userLocation: '',
            userLocationMarker: '',
            placeMarkers: [],
            radiusCircle: '',
            destination: ''
        }
    },

    template: '#map-template',

    events: {
        MapsApiLoaded: function() {
            this.createMap();
            this.getUserLocation();
        },

        Changed: function() {
            this.getNearbyPlaces();
        },

        TravelModeChanged: function() {
            if(this.destination != '') {
                this.getDirections();
            }
        }

    },

    watch: {
        address: function() {
            this.locateAddress();
        },
        userLocation: function() {
            this.getNearbyPlaces();
            this.getDirections();
        }
    },

    methods: {
        createMap: function() {

            this.infowindow = new google.maps.InfoWindow();
            this.directionsService = new google.maps.DirectionsService();
            this.directionsDisplay = new google.maps.DirectionsRenderer({
                preserveViewport: true,
                markerOptions: {
                    icon: '/img/footprint.png'
                },
                panel: document.getElementById('direction-steps')
            });

            this.map = new google.maps.Map(this.$els.map, {
                center: {lat: -34.397, lng: 150.644},
                zoom: 12
            });

            this.directionsDisplay.setMap(this.map);
            this.placesService = new google.maps.places.PlacesService(this.map);
            var locationInput = document.getElementById('address');
            new google.maps.places.Autocomplete(locationInput);
        },


        getUserLocation: function() {
            if(navigator.geolocation) {
                var vm = this;
                navigator.geolocation.getCurrentPosition(function(position) {

                    var pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    vm.userLocation = pos;
                    vm.map.setCenter(pos);

                    // var marker = new google.maps.Marker({
                    //     map: vm.map,
                    //     position: pos,
                    //     animation: google.maps.Animation.DROP,
                    //     title: 'Your position',
                    //     icon: {
                    //         url: '/img/marker.png',
                    //         scaledSize: new google.maps.Size(50,50)
                    //     },
                    //     draggable: true
                    // });

                    var marker = vm.createUserLocationMarker();

                    // vm.infowindow.setContent('<h4>THIS IS ME!</h4><p>Drag me to change my position</p>');
                    vm.infowindow.setContent('<strong>This is You!</strong><p>Drag me to change position. Geolocation is not always accurate :/</p>');
                    vm.infowindow.open(vm.map, marker);

                    // marker.addListener('dragend', function() {
                    //     vm.userLocation = { lat: marker.getPosition().lat(), lng: marker.getPosition().lng() };
                    // });
                });
            }
        },
        /**
         * Get Directions from userLocation to the destination place
         * @return {}         null
         */
        getDirections: function() {
            if(this.destination == '') return;
            var request = {
                origin: this.userLocation,
                destination: {'placeId': this.destination.place_id},
                travelMode: this.travelMode,
                unitSystem: google.maps.UnitSystem.METRIC
            };
            var vm = this;
            this.directionsService.route(request, function(result, status) {
                if(status == 'OK') {
                    vm.directionsDisplay.setDirections(result);
                    vm.showDirectionSteps = true;
                }
            })
        },

        drawRadius: function() {
            if(this.radiusCircle != '') {
                this.radiusCircle.setMap(null);
            }

            var circle = new google.maps.Circle({
                strokeColor: '#f7584c',
                fillColor: '#333',
                strokeOpacity: '0.4',
                fillOpacity: '0.1',
                map: this.map,
                center: this.userLocation,
                radius: this.radius
            });

            this.radiusCircle = circle;
        },

        clearPlaceMarkers: function() {
            for(var i = 0; i < this.placeMarkers.length; i++) {
                this.placeMarkers[i].setMap(null);
            }

            this.placeMarkers = [];
        },

        getNearbyPlaces: function() {
            this.$dispatch('SearchStarted');
            //var service = new google.maps.places.PlacesService(this.map);
            this.clearPlaceMarkers();

            var vm = this;
            this.placesService.nearbySearch({
                location: this.userLocation,
                radius: this.radius,
                type: this.placeType
            }, function(results, status) {
                if(status == google.maps.places.PlacesServiceStatus.OK) {
                    if(vm.randomResult) {
                        var rand = Math.floor(Math.random() * results.length);
                        vm.createPlaceMarker(results[rand]);
                    } else {
                        for(var i = 0; i < results.length; i++) {
                            vm.createPlaceMarker(results[i]);
                        }
                    }
                }

                vm.$dispatch('SearchCompleted');
            });

            this.drawRadius();
        },

        createUserLocationMarker: function() {

            if(this.userLocationMarker != '')
                this.userLocationMarker.setMap(null);


            var marker = new google.maps.Marker({
                map: this.map,
                position: this.userLocation,
                animation: google.maps.Animation.DROP,
                title: 'Your position',
                icon: {
                    url: '/img/you_are_here.png',
                },
                draggable: true
            });

            this.userLocationMarker = marker;

            var vm = this;
            marker.addListener('dragend', function() {
                vm.userLocation = { lat: marker.getPosition().lat(), lng: marker.getPosition().lng() };
            });

            return marker;
        },

        createPlaceMarker: function(place) {
            //var placeType = this.placeType != ''? this.placeType : place.types[0];
            var placeType = place.types[0];
            var loc = place.geometry.location;
            var marker = new google.maps.Marker({
                map: this.map,
                animation: google.maps.Animation.DROP,
                position: loc,
                icon: {
                    url: '/img/' + placeType + '.png'
                },
                title: place.name
            });

            this.placeMarkers.push(marker);

            var vm = this;
            google.maps.event.addListener(marker, 'click', function() {
                //Infowindow
                if(place.opening_hours && place.opening_hours.open_now) {
                    var open = '<strong class="pull-right">OPEN NOW!</strong>';
                } else {
                    var open = '';
                }

                if(place.photos && place.photos.length > 0) {
                    var img = '<img class="img-thumbnail img-max-height-200" src="' + place.photos[0].getUrl({maxWidth: 1000, maxHeight: 1000}) + '"/>';
                } else {
                    var img = '';
                }
                if(place.vicinity) {
                    var vicinity = '<p>' + place.vicinity + '</p>';
                } else { var vicinity = ''; }

                if(place.rating) {
                    var rating = '<strong>Rating: ' + place.rating + '</strong>';
                } else { var rating = ''; }

                var routeButton = '<button id="directions-button" class="btn-block btn btn-default">Get Route</button>';
                vm.infowindow.setContent(img + '<h4>' + place.name + '</h4>'+ vicinity   + rating + open  + routeButton);
                vm.infowindow.open(vm.map, this);

                var button = document.getElementById('directions-button');
                button.addEventListener('click', function() {
                    vm.destination = place;
                    vm.getDirections();
                })

                //Directions
                // vm.destination = place;
                // vm.getDirections();
            })
        },

        locateAddress: function() {
            this.$dispatch('SearchStarted');
            var geocoder = new google.maps.Geocoder();
            var vm = this;

            geocoder.geocode({ address: this.address }, function(results, status) {
                if(status == google.maps.GeocoderStatus.OK) {
                    vm.map.setCenter(results[0].geometry.location);

                    vm.userLocation = results[0].geometry.location;
                    vm.createUserLocationMarker();
                    // return new google.maps.Marker({
                    //     map: vm.map,
                    //     position: results[0].geometry.location
                    //
                    // })
                }
                vm.$dispatch('SearchCompleted');

            });
        }
    }
});

var app = new Vue({
    el: '#app',

    components: {
        tooltip: VueStrap.tooltip,
        aside: VueStrap.aside
    },

    filter: {
        toSpaces: 'toSpaces'
    },

    data: {
        address: '',
        radius: 1000,
        placeType: '',
        controlsDisabled: true,
        randomResult: false,
        showInfo: false,
        showDirectionSteps: false,
        showSearch: true,
        travelMode: 'DRIVING'
    },

    methods: {
        init: function() {
            this.controlsDisabled = false;
            this.$broadcast('MapsApiLoaded');
        }
    },

    watch: {
        randomResult: function() {
            this.$broadcast('Changed');
        },

        radius: function() {
            if(this.radius > 3000) {
                this.radius = 3000;
            } else if(this.radius < 50) {
                this.radius = 50;
            }
            this.$broadcast('Changed');
        },

        showDirectionSteps: function() {
            //console.log('changed');
        },

        placeType: function() {
            this.$broadcast('Changed');
        },

        travelMode: function() {
            this.$broadcast('TravelModeChanged');
        }
    },

    events: {
        SearchStarted: function() {
            this.controlsDisabled = true;
        },

        SearchCompleted: function() {
            this.controlsDisabled = false;
        }
    }

});
