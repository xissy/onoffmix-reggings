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
            var year = 2012;
            var month = 0;
            var day = 0;
            var hours = 0;
            var minutes = 0;

            if (Number(eventTime[0].innerText) > 2000) {
                year = Number(eventTime[0].innerText);
                month = Number(eventTime[1].innerText);
                day = Number(eventTime[2].innerText);
                hours = Number(eventTime[3].innerText);
                minutes = Number(eventTime[4].innerText);
            } else {
                month = Number(eventTime[0].innerText);
                day = Number(eventTime[1].innerText);
                hours = Number(eventTime[2].innerText);
                minutes = Number(eventTime[3].innerText);
            }

            var eventTime = new Date(year, month, day, hours, minutes, 0, 0);

            
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



