var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var querystring = require('querystring');
var moment = require('moment');


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

            var eventTimes = $('.event-schedule span .number');
            if (eventTimes.length === 0) {
                return callback(null, null);
            }

            var year = 2012;
            var month = 0;
            var day = 0;
            var hours = 0;
            var minutes = 0;

            if (Number(eventTimes[0].children[0].data) > 2000) {
                year = Number(eventTimes[0].children[0].data);
                month = Number(eventTimes[1].children[0].data) - 1;
                day = Number(eventTimes[2].children[0].data);
                hours = Number(eventTimes[3].children[0].data);
                minutes = Number(eventTimes[4].children[0].data);
            } else {
                month = Number(eventTimes[0].children[0].data) - 1;
                day = Number(eventTimes[1].children[0].data);
                hours = Number(eventTimes[2].children[0].data);
                minutes = Number(eventTimes[3].children[0].data);
            }

            var eventTime = new Date(year, month, day, hours, minutes, 0, 0);
            eventTime.setFullYear(year);
            
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
                eventTime: eventTime,
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

                    scoreQueryString += '&userName=' + authUserId + 
                                        '&score=5' + 
                                        '&time=' + eventUsers.eventTime.getTime();

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

                    scoreQueryString += '&userName=' + standbyUserId + 
                                        '&score=4' + 
                                        '&time=' + eventUsers.eventTime.getTime();

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

            if (!eventUsers) {
                return callback(null);
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



