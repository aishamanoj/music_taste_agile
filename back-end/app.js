const express = require('express'); // CommonJS import style!
const app = express(); // instantiate an Express object

const axios = require('axios'); // middleware for making requests to APIs

const morgan = require('morgan'); // middleware for nice logging of incoming HTTP requests
// use the morgan middleware to log all incoming http requests
//app.use(morgan('dev')); // morgan has a few logging default styles - dev is a nice concise color-coded style

var cors = require('cors');

app.use(cors());

// use the bodyparser middleware to parse any data included in a request
app.use(express.json()); // decode JSON-formatted incoming POST data
app.use(express.urlencoded({ extended: true })); // decode url-encoded incoming POST data

// make 'public' directory publicly readable with static content
app.use('/static', express.static('public'));

/**
 * Typically, all middlewares would be included before routes
 * In this file, however, most middlewares are after most routes
 * This is to match the order of the accompanying slides
 */

var SpotifyWebApi = require('spotify-web-api-node');

var credentials = {
  clientId: '5d968e8774bb44b38bb0a26b8ec1104a',
  clientSecret: 'ef94a00d195c462ea765c26987930804',
};

var spotifyApi = new SpotifyWebApi(credentials);

spotifyApi.clientCredentialsGrant().then(
  function (data) {
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);
  },
  function (err) {
    console.log('Something went wrong when retrieving an access token', err);
  }
);

// var spotifyApi = new SpotifyWebApi();

/**
 * Get metadata of tracks, albums, artists, shows, and episodes
 */

// Get genre from track
async function getTaste(id) {
  try {
    const playlist = await getPlaylistWithTracks(id);
    let tracksIds = playlist.tracks.items.map((item) => item.track.id);

    console.log(tracksIds);
    console.log(tracksIds.length);
    const tracksInfo = [];
    for (let i = 1; i < tracksIds.length; i++) {
      if (tracksIds.length >= 50 && i % 50 == 0) {
        let info = await spotifyApi.getTracks(tracksIds.slice(i - 50, i));
        //tracksInfo.push(info.body)
        info.body.tracks.forEach((track) => tracksInfo.push(track.artists[0].id));
        //console.log(info.body)
      } else if (tracksIds.length >= 50 && i >= 50 && tracksIds.length - i < 50) {
        let info = await spotifyApi.getTracks(tracksIds.slice(i - 1, tracksIds.length));
        info.body.tracks.forEach((track) => tracksInfo.push(track.artists[0].id));
        break;
      }
    }

    console.log(tracksInfo);

    let genres = [];

    for (let i = 1; i < tracksInfo.length; i++) {
      if (tracksInfo.length >= 50 && i % 50 == 0) {
        let info = await spotifyApi.getArtists(tracksInfo.slice(i - 50, i));
        //tracksInfo.push(info.body)
        info.body.artists.forEach((track) => genres.push(track.genres.pop()));
        //console.log(info.body.artists)
      } else if (tracksIds.length >= 50 && i >= 50 && tracksIds.length - i < 50) {
        let info = await spotifyApi.getArtists(tracksInfo.slice(i - 1, tracksInfo.length));
        info.body.artists.forEach((track) => genres.push(track.genres.pop()));
        break;
      }
    }

    console.log(genres.length);

    let counts = {};

    for (var i = 0; i < genres.length; i++) {
      var num = genres[i];
      counts[num] = counts[num] ? counts[num] + 1 : 1;
    }

    console.log(counts);

    var sum = 0;
    for (var el in counts) {
      if (counts.hasOwnProperty(el)) {
        sum += parseFloat(counts[el]);
      }
    }

    console.log('sum: ' + sum);

    const sortable = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
    if (sortable.undefined) {
      delete sortable.undefined;
    }

    for (const [key, value] of Object.entries(sortable)) {
      let words = key.split(' ');
      let upper;
      upper = words
        .map((word) => {
            if(word == 'uk'){
                return word.toUpperCase();
            }
          return word[0].toUpperCase() + word.substring(1);
        })
        .join(' ');

      delete sortable[key];
      sortable[upper] = value;
    }
    sortable['sum'] = sum; 
    return sortable;
  } catch (err) {
    console.log('Something went wrong!', err);
  }
}

async function getPlaylistWithTracks(id) {
  const playlist = (await spotifyApi.getPlaylist(id)).body;
  // if there is more tracks than the limit (100 by default)
  if (playlist.tracks.total > playlist.tracks.limit) {
    // Divide the total number of track by the limit to get the number of API calls
    for (let i = 1; i < Math.ceil(playlist.tracks.total / playlist.tracks.limit); i++) {
      const trackToAdd = (
        await spotifyApi.getPlaylistTracks(id, {
          offset: playlist.tracks.limit * i, // Offset each call by the limit * the call's index
        })
      ).body;
      // Push the retreived tracks into the array
      trackToAdd.items.forEach((item) => playlist.tracks.items.push(item));
    }
  }
  return playlist;
}

async function playlistFinder(filter, offset) {
  mainData = [];
  artists = [];

  let playlistData = await spotifyApi.searchPlaylists(filter, {
    country: 'US',
    limit: 1,
    offset: 1,
  });

  console.log('playlistData', playlistData);
  playlistData.body.playlists.items.map(async function (item) {
    // mainData.push(item);
    // mainData.push('\n');
    console.log(item.id);
    const playlist = await getTaste(item.id);
    console.log('FINAL PLAYLIST' + JSON.stringify(playlist));
  }),
    function (err) {
      console.log('Something went wrong!', err);
    };
  // });
}

async function playlistArray(filter, offset) {}

// scopes = ['user-read-private', 'user-read-email'];

// route for HTTP GET requests to the root document
app.get('/', (req, res) => {
  res.send('Hello!');
});

// route for HTTP GET to see the genre of random song of choice
// app.get('/genre-getter', async (req, res) => {
//   //var result = await spotifyApi.getUserPlaylists();
//   getTrackGenre('4DuUwzP4ALMqpquHU0ltAB', function (result) {
//     console.log(result);
//     res.send(result);
//   });
// });

app.get('/my-taste', async (req, res) => {
  const myTaste = await getTaste('37i9dQZF1DXaXB8fQg7xif');
  res.send(myTaste);
});

app.get('/party', async (req, res) => {
  const myTaste = await getTaste('37i9dQZF1DXaXB8fQg7xif');

  //const playlist = await playlistFinder('party');
  res.send(myTaste);
});

app.get('/in-my-feels', async (req, res) => {
  //var result = await spotifyApi.getUserPlaylists();
  playlistFinder('feels', function (result) {
    console.log(result);
    res.send(result);
  });
});

app.get('/on-my-grind', async (req, res) => {
  //var result = await spotifyApi.getUserPlaylists();
  playlistFinder('workout', function (result) {
    console.log(result);
    res.send(result);
  });
});

app.get('/plotting-my-revenge', async (req, res) => {
  //var result = await spotifyApi.getUserPlaylists();
  playlistFinder('motivated', function (result) {
    console.log(result);
    res.send(result);
  });
});

app.get('/romantic', async (req, res) => {
  //var result = await spotifyApi.getUserPlaylists();
  playlistFinder('romantic', function (result) {
    console.log(result);
    res.send(result);
  });
});

app.get('/mood-boosters', async (req, res) => {
  //var result = await spotifyApi.getUserPlaylists();
  playlistFinder('happy', function (result) {
    console.log(result);
    res.send(result);
  });
});

app.listen(3001);

// export the express app we created to make it available to other modules
// module.exports = app
