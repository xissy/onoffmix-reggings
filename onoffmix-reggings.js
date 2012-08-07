var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var querystring = require('querystring');


var range = function(i, j) {
    var r = [];
    for (;i<j;i++) r.push(i);
    return r;
}

var eventNos = range(1, 8435);


var getEventUsers = function(eventNo, callback) {
    var eventUrl = 'http://onoffmix.com/event/'  + eventNo;

    try {
        request.get(eventUrl, function(err, res, body) {
            if (err) {
                return callback(err, null);
            }
            if (res.statusCode !== 200) {
                var err = new Error('statusCode: ' + res.statusCode);
                return callback(err, null);
            }

            var $ = cheerio.load(body);
            
            var auths = $('.auth div a');
            var authUserIds = [];
            for (var i = 0; i < auths.length; i++) {
                var authUser = auths[i];
                var authUserUrlArray = authUser.attribs.href.split('/');

                authUserIds.push( authUserUrlArray[authUserUrlArray.length - 1] );
            };

            var standbys = $('.standby div a');
            var standbyUserIds = [];
            for (var i = 0; i < standbys.length; i++) {
                var standbyUser = standbys[i];
                var standbyUrlArray = standbyUser.attribs.href.split('/');

                standbyUserIds.push( standbyUrlArray[standbyUrlArray.length - 1] );
            };

            return callback(null, {
                authUserIds: authUserIds,
                standbyUserIds: standbyUserIds
            });
        });

    } catch (err) {
        return callback(err, null);
    }
};


var scoreEvent = function(eventNo, eventUsers, callback) {
    var eventName = 'event_' + eventNo;

    async.parallel([
        function(callback) {
            async.forEach(
                eventUsers.authUserIds,

                function(authUserId, callback) {
                    var scoreUrl = 'http://api.reggings.com/api/v1/score?';
                    var scoreQueryString = 'appId=5020541150bba86737000001' + 
                                           '&secretKey=XyedJtbOcR' +
                                           '&itemName=' + eventName +
                                           '&tagNames=type_event';

                    scoreQueryString += '&userName=' + authUserId + '&score=5';
                    request.get(scoreUrl + scoreQueryString, callback);
                },

                callback
            );
        },

        function(callback) {
            async.forEach(
                eventUsers.standbyUserIds,

                function(standbyUserId, callback) {
                    var scoreUrl = 'http://api.reggings.com/api/v1/score?';
                    var scoreQueryString = 'appId=5020541150bba86737000001' + 
                                           '&secretKey=XyedJtbOcR' +
                                           '&itemName=' + eventName +
                                           '&tagNames=type_event';

                    scoreQueryString += '&userName=' + standbyUserId + '&score=4';
                    request.get(scoreUrl + scoreQueryString, callback);
                },

                callback
            );
        }

    ], callback);
};


async.forEach(
    eventNos,

    function(eventNo, callback) {
        getEventUsers(eventNo, function(err, eventUsers) {
            if (err) {
                return callback(err);
            }

            scoreEvent(eventNo, eventUsers, function(err) {
                if (err) {
                    return callback(err);
                }

                console.log(eventNo + '/' + eventNos.length);

                return callback(null);
            });
        });
    },

    function(err) {
        if (err) {
            console.log(err);
        }

        console.log('completed');
    }
);



