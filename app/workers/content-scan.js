
module.exports = async function() {

}

// MOVIES:
// Fetch remote movies
// Load local movies map

// Load list of all remote tokens from db
// Grab list of all tokens from remote map
// Find list of all tokens from remote map
// Grab list of tokens that do not exist on remote:
// difference(local_content, remote_content) (https://lodash.com/docs/4.17.15#difference)
// Delete all remote_movies with token matching the above list

// For each remote movie map,

// IF movie exists locally:
// Verify remote_movies record exists in 'completed' state
// Verify local_movies record exists with proper token from remote
// Remove any pending_ records if exist

// ELSE IF pending_ record exists:
// Verify remote_movies record exists in 'in-progress' state

// ELSE
// The movie doesn't exist locally so:
// Verify remote_movies record exists in 'not-downloaded'


// TV SHOWS:
// In order to get statuses set correctly, start with episodes and work up:
// Loop through shows & seasons to get to all episodes

// Get list of all local episode tokens
// For each remote episode:

// IF episode exists locally:
// Verify remote_episodes record exists in 'completed' state
// Verify local_episodes record exists with proper token from remote
// Remove any pending_ records if exist

// ELSE IF pending_ record exists:
// Verify remote_episodes record exists in 'in-progress' state

// ELSE
// The movie doesn't exist locally so:
// Verify remote_episodes record exists in 'not-downloaded'

// For each season from remote:

// Determine state by checking statuses of all related episodes for season in db

// IF season state is 'completed':
// Verify remote_seasons record exists in 'completed' state
// Verify local_episodes record exists with proper token from remote
// Remove any pending_ records if exist

// ELSE IF pending_ record exists:
// Verify remote_seasons record exists in 'in-progress' state

// ELSE
// The movie doesn't exist locally so:
// Verify remote_seasons record exists in 'not-downloaded'

// Same thing for shows
