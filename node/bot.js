require('nocamel');

const discord = require('discord.js');
const fs = require('fs');
const request = require('request-promise');
const q = require('q');

const config = JSON.parse(fs.read_file_sync('../config.json').to_string());

const bot = new discord.Client();

var handlers = {

    async video(message) {
        const content = message.content;
        const channel = message.channel;

        var term = content.split('video')[1].trim();

        var video_list = [];

        var page_token = '';

        for (;;) {
            var url = 'https://www.googleapis.com/youtube/v3/search'+
                '?key=' + config.yt_key +
                '&channelId=UCrUL8K81R4VBzm-KOYwrcxQ'+
                '&part=snippet,id'+
                '&order=date'+
                '&maxResults=50';

            if (page_token) {
                url += '&pageToken=' + page_token;
            }

            var videos = await request({
                method: 'get',
                url: url,
                json: true,
                simple: true
            });

            page_token = videos.nextPageToken;

            videos.items.for_each(video => {
                video_list.push({
                    id: video.id.videoId,
                    title: video.snippet.title
                });
            });

            if (!page_token) break;
        }

        video_list = video_list
            .filter(video => {
                return !!~video.title.to_lower_case().index_of(term.to_lower_case())
            });

        if (video_list.length === 0) {
            message.reply('no videos found for: ' + term);
        } else if (video_list.length === 1) {
            var video = video_list[0];
            message.reply('i found a good video: https://www.youtube.com/watch?v=' + video.id);
        } else {
            var msg = 'i found several videos:\n';

            video_list.slice(0, 5).for_each(video => {
                msg += 'https://www.youtube.com/watch?v=' + video.id + '\n';
            });

            message.reply(msg)
        }
    }
};

return bot
    .on('message', async message => {
        var content = message.content;
        var channel = message.channel;

        if (content.match(/^felix video/gi)) {
            return handlers.video(message);
        }

        // mod only stuff here
        var roles = message.member && message.member.roles.map(r => r.name) || [];

        var allowed = false;

        ['engineer man', 'fellows', 'staff'].for_each(r => {
            if (~roles.index_of(r)) allowed = true;
        });

        if (!allowed) return null;
    })
    .on('error', console.log)
    .login(config.bot_key);
